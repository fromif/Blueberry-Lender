const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");
const { CONTRACT_NAMES } = require("../../constants");
const {
  setEtherBalance,
  pretendBorrow,
  makeBToken,
  fastForward,
  getBalances,
  totalBorrows,
  adjustBalances,
  borrowSnapshot,
} = require("../utils/compound");
const {
  etherUnsigned,
  UInt256Max,
  etherGasCost,
  etherMantissa,
} = require("../utils/ethereum");

const borrowAmount = etherUnsigned(10000);
const repayAmount = etherUnsigned(1000);

async function preBorrow(bToken, borrower, borrowAmount) {
  const comptrollerAddr = await bToken.comptroller();
  const comptroller = await ethers.getContractAt(
    CONTRACT_NAMES.BOOL_COMPTROLLER,
    comptrollerAddr
  );
  await comptroller.setBorrowAllowed(true);
  await comptroller.setBorrowVerify(true);
  const interestRateModelAddr = await bToken.interestRateModel();
  const interestRateModel = await ethers.getContractAt(
    CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
    interestRateModelAddr
  );
  await interestRateModel.setFailBorrowRate(false);
  await bToken.harnessSetFailTransferToAddress(borrower.address, false);
  await bToken.harnessSetAccountBorrows(borrower.address, 0, 0);
  await bToken.harnessSetTotalBorrows(0);
  await setEtherBalance(bToken, borrowAmount);
}

async function borrowFresh(bToken, borrower, borrowAmount) {
  return bToken
    .connect(borrower)
    .harnessBorrowFresh(borrower.address, borrowAmount);
}

async function borrow(bToken, borrower, borrowAmount, opts = {}) {
  await bToken.harnessFastForward(1);
  return bToken.connect(borrower).borrow(borrowAmount);
}

async function preRepay(bToken, benefactor, borrower, repayAmount) {
  // setup either benefactor OR borrower for success in repaying
  const comptrollerAddr = await bToken.comptroller();
  const comptroller = await ethers.getContractAt(
    CONTRACT_NAMES.BOOL_COMPTROLLER,
    comptrollerAddr
  );
  await comptroller.setRepayBorrowAllowed(true);
  await comptroller.setRepayBorrowVerify(true);
  const interestRateModelAddr = await bToken.interestRateModel();
  const interestRateModel = await ethers.getContractAt(
    CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
    interestRateModelAddr
  );
  await interestRateModel.setFailBorrowRate(false);
  await pretendBorrow(bToken, borrower.address, 1, 1, repayAmount);
}

async function repayBorrowFresh(bToken, payer, borrower, repayAmount) {
  return bToken
    .connect(payer)
    .harnessRepayBorrowFresh(payer.address, borrower.address, repayAmount, {
      value: repayAmount,
    });
}

async function repayBorrow(bToken, borrower, repayAmount) {
  await bToken.harnessFastForward(1);
  return bToken.connect(borrower).repayBorrow({ value: repayAmount });
}

describe("BEther", function () {
  let bToken, root, borrower, benefactor, accounts;
  beforeEach(async () => {
    [root, borrower, benefactor, ...accounts] = await ethers.getSigners();
    bToken = await makeBToken({
      kind: "bether",
      comptrollerOpts: { kind: "bool" },
    });
  });

  describe("borrowFresh", () => {
    beforeEach(async () => await preBorrow(bToken, borrower, borrowAmount));

    it("fails if comptroller tells it to", async () => {
      const comptrollerAddr = await bToken.comptroller();
      const comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.BOOL_COMPTROLLER,
        comptrollerAddr
      );
      await comptroller.setBorrowAllowed(false);
      await expect(borrowFresh(bToken, borrower, borrowAmount))
        .to.emit(bToken, "Failure")
        .withArgs(3, 6, 11);
    });

    it("proceeds if comptroller tells it to", async () => {
      await expect(borrowFresh(bToken, borrower, borrowAmount)).to.emit(
        bToken,
        "Borrow"
      );
    });

    it("fails if market is stale", async () => {
      await fastForward(bToken);
      await expect(borrowFresh(bToken, borrower, borrowAmount))
        .to.emit(bToken, "Failure")
        .withArgs(10, 4, 0);
    });

    it("continues if fresh", async () => {
      await bToken.accrueInterest();
      await expect(borrowFresh(bToken, borrower, borrowAmount)).to.emit(
        bToken,
        "Borrow"
      );
    });

    it("fails if protocol has less than borrowAmount of underlying", async () => {
      await expect(borrowFresh(bToken, borrower, borrowAmount.add(1)))
        .to.emit(bToken, "Failure")
        .withArgs(14, 3, 0);
    });

    it("fails if borrowBalanceStored fails (due to non-zero stored principal with zero account index)", async () => {
      await pretendBorrow(
        bToken,
        borrower.address,
        0,
        BigNumber.from(10).pow(18).mul(3),
        BigNumber.from(10).pow(18).mul(5)
      );
      await expect(
        borrowFresh(bToken, borrower, borrowAmount)
      ).to.be.revertedWith("divide by zero");
    });

    it("fails if calculating account new total borrow balance overflows", async () => {
      await pretendBorrow(bToken, borrower.address, 1e-18, 1e-18, UInt256Max());
      await expect(
        borrowFresh(bToken, borrower, borrowAmount)
      ).to.be.revertedWith("addition overflow");
    });

    it("fails if calculation of new total borrow balance overflows", async () => {
      await bToken.harnessSetTotalBorrows(UInt256Max());
      await expect(
        borrowFresh(bToken, borrower, borrowAmount)
      ).to.be.revertedWith("addition overflow");
    });

    it("reverts if transfer out fails", async () => {
      await bToken.harnessSetFailTransferToAddress(borrower.address, true);
      await expect(
        borrowFresh(bToken, borrower, borrowAmount)
      ).to.be.revertedWith("TOKEN_TRANSFER_OUT_FAILED");
    });

    it("reverts if borrowVerify fails", async () => {
      const comptrollerAddr = await bToken.comptroller();
      const comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.BOOL_COMPTROLLER,
        comptrollerAddr
      );
      await comptroller.setBorrowVerify(false);
      await expect(
        borrowFresh(bToken, borrower, borrowAmount)
      ).to.be.revertedWith("borrowVerify rejected borrow");
    });

    it("transfers the underlying cash, tokens, and emits Borrow event", async () => {
      const beforeBalances = await getBalances([bToken], [borrower.address]);
      const beforeProtocolBorrows = await totalBorrows(bToken);
      const result = await borrowFresh(bToken, borrower, borrowAmount);
      const afterBalances = await getBalances([bToken], [borrower.address]);
      const expectedBalances = await adjustBalances(beforeBalances, [
        [bToken, "eth", borrowAmount],
        [bToken, "borrows", borrowAmount],
        [bToken, "cash", borrowAmount],
        [
          bToken,
          borrower.address,
          "eth",
          BigNumber.from(borrowAmount).sub(await etherGasCost(result)),
        ],
        [bToken, borrower.address, "borrows", borrowAmount],
      ]);
      expect(afterBalances.toString()).to.be.equal(expectedBalances.toString());
    });

    it("stores new borrow principal and interest index", async () => {
      const beforeProtocolBorrows = await totalBorrows(bToken);
      await pretendBorrow(bToken, borrower.address, 0, 3, 0);
      await borrowFresh(bToken, borrower, borrowAmount);
      const borrowSnap = await borrowSnapshot(bToken, borrower.address);
      expect(borrowSnap.principal).to.be.equal(borrowAmount);
      expect(borrowSnap.interestIndex).to.be.equal(etherMantissa(3));
      expect(await totalBorrows(bToken)).to.be.equal(
        beforeProtocolBorrows.add(borrowAmount)
      );
    });
  });

  describe("borrow", () => {
    let interestRateModel;
    beforeEach(async () => {
      let interestRateModelAddr = await bToken.interestRateModel();
      interestRateModel = await ethers.getContractAt(
        CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
        interestRateModelAddr
      );
      await preBorrow(bToken, borrower, borrowAmount);
    });

    it("emits a borrow failure if interest accrual fails", async () => {
      interestRateModel.setFailBorrowRate(true);
      await bToken.harnessFastForward(1);
      await expect(borrow(bToken, borrower, borrowAmount)).to.be.revertedWith(
        "INTEREST_RATE_MODEL_ERROR"
      );
    });

    it("returns error from borrowFresh without emitting any extra logs", async () => {
      await expect(borrow(bToken, borrower, borrowAmount.add(1)))
        .to.emit(bToken, "Failure")
        .withArgs(14, 3, 0);
    });

    it("returns success from borrowFresh and transfers the correct amount", async () => {
      const beforeBalances = await getBalances([bToken], [borrower.address]);
      await fastForward(bToken);
      const result = await borrow(bToken, borrower, borrowAmount);
      const afterBalances = await getBalances([bToken], [borrower.address]);
      const expectedBalancess = await adjustBalances(beforeBalances, [
        [bToken, "eth", -borrowAmount],
        [bToken, "borrows", borrowAmount],
        [bToken, "cash", -borrowAmount],
        [
          bToken,
          borrower.address,
          "eth",
          borrowAmount.sub(await etherGasCost(result)),
        ],
        [bToken, borrower.address, "borrows", borrowAmount],
      ]);
      expect(afterBalances.toString()).to.be.equal(
        expectedBalancess.toString()
      );
    });
  });

  describe("repayBorrowFresh", () => {
    [true, false].forEach(async (benefactorPaying) => {
      let payer;
      const label = benefactorPaying ? "benefactor paying" : "borrower paying";
      describe(label, () => {
        beforeEach(async () => {
          payer = benefactorPaying ? benefactor : borrower;

          await preRepay(bToken, payer, borrower, repayAmount);
        });

        it("fails if repay is not allowed", async () => {
          const comptrollerAddr = await bToken.comptroller();
          const comptroller = await ethers.getContractAt(
            CONTRACT_NAMES.BOOL_COMPTROLLER,
            comptrollerAddr
          );
          await comptroller.setRepayBorrowAllowed(false);
          await expect(repayBorrowFresh(bToken, payer, borrower, repayAmount))
            .to.emit(bToken, "Failure")
            .withArgs(3, 36, 11);
        });

        it("fails if block number ≠ current block number", async () => {
          await fastForward(bToken);
          await expect(repayBorrowFresh(bToken, payer, borrower, repayAmount))
            .to.emit(bToken, "Failure")
            .withArgs(10, 37, 0);
        });

        it("returns an error if calculating account new account borrow balance fails", async () => {
          await pretendBorrow(bToken, borrower.address, 1, 1, 1);
          await expect(
            repayBorrowFresh(bToken, payer, borrower, repayAmount)
          ).to.be.revertedWith("subtraction underflow");
        });

        it("returns an error if calculation of new total borrow balance fails", async () => {
          await bToken.harnessSetTotalBorrows(1);
          await expect(
            repayBorrowFresh(bToken, payer, borrower, repayAmount)
          ).to.be.revertedWith("subtraction underflow");
        });

        it("reverts if checkTransferIn fails", async () => {
          await expect(
            bToken
              .connect(root)
              .harnessRepayBorrowFresh(
                payer.address,
                borrower.address,
                repayAmount,
                {
                  value: repayAmount,
                }
              )
          ).to.be.revertedWith("sender mismatch");
          await expect(
            bToken
              .connect(payer)
              .harnessRepayBorrowFresh(
                payer.address,
                borrower.address,
                repayAmount,
                { value: 1 }
              )
          ).to.be.revertedWith("value mismatch");
        });

        it("reverts if repayBorrowVerify fails", async () => {
          const comptrollerAddr = await bToken.comptroller();
          const comptroller = await ethers.getContractAt(
            CONTRACT_NAMES.BOOL_COMPTROLLER,
            comptrollerAddr
          );
          await comptroller.setRepayBorrowVerify(false);
          await expect(
            repayBorrowFresh(bToken, payer, borrower, repayAmount)
          ).to.be.revertedWith("repayBorrowVerify rejected repayBorrow");
        });

        it("transfers the underlying cash, and emits RepayBorrow event", async () => {
          const beforeBalances = await getBalances(
            [bToken],
            [borrower.address]
          );
          const result = await repayBorrowFresh(
            bToken,
            payer,
            borrower,
            repayAmount
          );
          const afterBalances = await getBalances([bToken], [borrower.address]);
          if (borrower.address == payer.address) {
            const expectedBalances = await adjustBalances(beforeBalances, [
              [bToken, "eth", repayAmount],
              [bToken, "borrows", -repayAmount],
              [bToken, "cash", repayAmount],
              [bToken, borrower.address, "borrows", -repayAmount],
              [
                bToken,
                borrower.address,
                "eth",
                repayAmount.add(await etherGasCost(result)),
              ],
            ]);
            expect(afterBalances.toString()).to.be.equal(
              expectedBalances.toString()
            );
          } else {
            const expectedBalances = await adjustBalances(beforeBalances, [
              [bToken, "eth", repayAmount],
              [bToken, "borrows", -repayAmount],
              [bToken, "cash", repayAmount],
              [bToken, borrower.address, "borrows", -repayAmount],
            ]);
            expect(afterBalances.toString()).to.be.equal(
              expectedBalances.toString()
            );
          }
          const receipt = await result.wait();
          expect(receipt.events[0].event).to.be.equal("RepayBorrow");
          expect(receipt.events[0].args[0]).to.be.equal(payer.address);
          expect(receipt.events[0].args[1]).to.be.equal(borrower.address);
          expect(receipt.events[0].args[2]).to.be.equal(repayAmount.toString());
          expect(receipt.events[0].args[3]).to.be.equal(0);
          expect(receipt.events[0].args[4]).to.be.equal(0);
        });

        it("stores new borrow principal and interest index", async () => {
          const beforeProtocolBorrows = await totalBorrows(bToken);
          const beforeAccountBorrowSnap = await borrowSnapshot(
            bToken,
            borrower.address
          );
          await repayBorrowFresh(bToken, payer, borrower, repayAmount);
          const afterAccountBorrows = await borrowSnapshot(
            bToken,
            borrower.address
          );
          expect(afterAccountBorrows.principal).to.be.equal(
            beforeAccountBorrowSnap.principal.sub(repayAmount)
          );
          expect(afterAccountBorrows.interestIndex).to.be.equal(
            etherMantissa(1)
          );
          expect(await totalBorrows(bToken)).to.be.equal(
            beforeProtocolBorrows.sub(repayAmount)
          );
        });
      });
    });
  });

  describe("repayBorrow", () => {
    beforeEach(async () => {
      await preRepay(bToken, borrower, borrower, repayAmount);
    });

    it("reverts if interest accrual fails", async () => {
      const interestRateModelAddr = await bToken.interestRateModel();
      const interestRateModel = await ethers.getContractAt(
        CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
        interestRateModelAddr
      );
      await interestRateModel.setFailBorrowRate(true);
      await expect(
        repayBorrow(bToken, borrower, repayAmount)
      ).to.be.revertedWith("INTEREST_RATE_MODEL_ERROR");
    });

    it("reverts when repay borrow fresh fails", async () => {
      const comptrollerAddr = await bToken.comptroller();
      const comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.BOOL_COMPTROLLER,
        comptrollerAddr
      );
      await comptroller.setRepayBorrowAllowed(false);
      await expect(
        repayBorrow(bToken, borrower, repayAmount)
      ).to.be.revertedWith("repayBorrow failed (03)");
    });

    it("returns success from repayBorrowFresh and repays the right amount", async () => {
      await fastForward(bToken);
      const beforeAccountBorrowSnap = await borrowSnapshot(
        bToken,
        borrower.address
      );
      await repayBorrow(bToken, borrower, repayAmount);
      const afterAccountBorrowSnap = await borrowSnapshot(
        bToken,
        borrower.address
      );
      expect(afterAccountBorrowSnap.principal).to.be.equal(
        beforeAccountBorrowSnap.principal.sub(repayAmount)
      );
    });

    it("reverts if overpaying", async () => {
      const beforeAccountBorrowSnap = await borrowSnapshot(
        bToken,
        borrower.address
      );
      let tooMuch = BigNumber.from(beforeAccountBorrowSnap.principal).add(1);
      await expect(repayBorrow(bToken, borrower, tooMuch)).to.be.revertedWith(
        "subtraction underflow"
      );
    });
  });
});
