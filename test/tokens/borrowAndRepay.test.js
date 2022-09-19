const { expect } = require("chai");
const { ethers } = require("hardhat");
const { CONTRACT_NAMES } = require("../../constants");
const {
  pretendBorrow,
  preApprove,
  makeBToken,
  fastForward,
  balanceOf,
  totalBorrows,
  borrowSnapshot,
  setBalance,
} = require("../utils/compound");
const {
  etherUnsigned,
  UInt256Max,
  etherMantissa,
} = require("../utils/ethereum");

const borrowAmount = etherUnsigned(10e3);
const repayAmount = etherUnsigned(10e2);

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
  const underlyingAddr = await bToken.underlying();
  const underlying = await ethers.getContractAt(
    CONTRACT_NAMES.WETH9,
    underlyingAddr
  );
  await underlying.harnessSetBalance(bToken.address, borrowAmount);
  await bToken.harnessSetFailTransferToAddress(borrower.address, false);
  await bToken.harnessSetAccountBorrows(borrower.address, 0, 0);
  await bToken.harnessSetTotalBorrows(0);
}

async function borrowFresh(bToken, borrower, borrowAmount) {
  return bToken.harnessBorrowFresh(borrower.address, borrowAmount);
}

async function borrow(bToken, borrower, borrowAmount, opts = {}) {
  // make sure to have a block delta so we accrue interest
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
  const underlyingAddr = await bToken.underlying();
  const underlying = await ethers.getContractAt(
    CONTRACT_NAMES.ERC20_HARNESS,
    underlyingAddr
  );
  await underlying.harnessSetFailTransferFromAddress(benefactor.address, false);
  await underlying.harnessSetFailTransferFromAddress(borrower.address, false);
  await pretendBorrow(bToken, borrower.address, 1, 1, repayAmount);
  await preApprove(bToken, benefactor, repayAmount);
  await preApprove(bToken, borrower, repayAmount);
}

async function repayBorrowFresh(bToken, payer, borrower, repayAmount) {
  return bToken
    .connect(payer)
    .harnessRepayBorrowFresh(payer.address, borrower.address, repayAmount);
}

async function repayBorrow(bToken, borrower, repayAmount) {
  // make sure to have a block delta so we accrue interest
  await bToken.harnessFastForward(1);
  return bToken.connect(borrower).repayBorrow(repayAmount);
}

async function repayBorrowBehalf(bToken, payer, borrower, repayAmount) {
  // make sure to have a block delta so we accrue interest
  await bToken.harnessFastForward(1);
  return bToken.connect(payer).repayBorrowBehalf(borrower.address, repayAmount);
}

describe("BToken", function () {
  let bToken, root, borrower, benefactor, accounts;
  beforeEach(async () => {
    [root, borrower, benefactor, ...accounts] = await ethers.getSigners();
    bToken = await makeBToken({ comptrollerOpts: { kind: "bool" } });
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
      await expect(
        borrowFresh(bToken, borrower, borrowAmount)
      ).to.be.revertedWith("rejected");
    });

    it("proceeds if comptroller tells it to", async () => {
      await borrowFresh(bToken, borrower, borrowAmount);
    });

    it("fails if market is stale", async () => {
      await fastForward(bToken);
      await expect(
        borrowFresh(bToken, borrower, borrowAmount)
      ).to.be.revertedWith("market is stale");
    });

    it("continues if fresh", async () => {
      await bToken.accrueInterest();
      await borrowFresh(bToken, borrower, borrowAmount);
    });

    it("fails if error if protocol has less than borrowAmount of underlying", async () => {
      await expect(
        borrowFresh(bToken, borrower, borrowAmount.add(1))
      ).to.be.revertedWith("insufficient cash");
    });

    it("fails if borrowBalanceStored fails (due to non-zero stored principal with zero account index)", async () => {
      await pretendBorrow(
        bToken,
        borrower.address,
        0,
        (3e18).toFixed().toString(),
        (5e18).toFixed().toString()
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
      ).to.be.revertedWith("transfer failed");
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

    it("transfers the underlying cash, tokens, and emits Transfer, Borrow events", async () => {
      const underlyingAddr = await bToken.underlying();
      const underlying = await ethers.getContractAt(
        CONTRACT_NAMES.WETH9,
        underlyingAddr
      );
      const beforeProtocolCash = await balanceOf(underlying, bToken.address);
      const beforeProtocolBorrows = await totalBorrows(bToken);
      const beforeAccountCash = await balanceOf(underlying, borrower.address);
      const result = await borrowFresh(bToken, borrower, borrowAmount);
      expect(await balanceOf(underlying, borrower.address)).to.be.equal(
        beforeAccountCash.add(borrowAmount)
      );
      expect(await balanceOf(underlying, bToken.address)).to.be.equal(
        beforeProtocolCash.sub(borrowAmount)
      );
      expect(await totalBorrows(bToken)).to.be.equal(
        beforeProtocolBorrows.add(borrowAmount)
      );
      const receipt = await result.wait();
      expect(receipt.events[0].event).to.be.equal("Transfer");
      expect(receipt.events[0].args[0]).to.be.equal(bToken.address);
      expect(receipt.events[0].args[1]).to.be.equal(borrower.address);
      expect(receipt.events[0].args[2]).to.be.equal(borrowAmount.toString());
      expect(receipt.events[1].event).to.be.equal("Borrow");
      expect(receipt.events[1].args[0]).to.be.equal(borrower.address);
      expect(receipt.events[1].args[1]).to.be.equal(borrowAmount.toString());
      expect(receipt.events[1].args[2]).to.be.equal(borrowAmount.toString());
      expect(receipt.events[1].args[3]).to.be.equal(
        beforeProtocolBorrows.add(borrowAmount).toString()
      );
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
    beforeEach(async () => await preBorrow(bToken, borrower, borrowAmount));

    it("emits a borrow failure if interest accrual fails", async () => {
      const interestRateModelAddr = await bToken.interestRateModel();
      const interestRateModel = await ethers.getContractAt(
        CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
        interestRateModelAddr
      );
      await interestRateModel.setFailBorrowRate(true);
      await expect(borrow(bToken, borrower, borrowAmount)).to.be.revertedWith(
        "INTEREST_RATE_MODEL_ERROR"
      );
    });

    it("returns error from borrowFresh without emitting any extra logs", async () => {
      await expect(
        borrowFresh(bToken, borrower, borrowAmount.add(1))
      ).to.be.revertedWith("insufficient cash");
    });

    it("returns success from borrowFresh and transfers the correct amount", async () => {
      const underlyingAddr = await bToken.underlying();
      const underlying = await ethers.getContractAt(
        CONTRACT_NAMES.WETH9,
        underlyingAddr
      );
      const beforeAccountCash = await balanceOf(underlying, borrower.address);
      await fastForward(bToken);
      await borrow(bToken, borrower, borrowAmount);
      expect(await balanceOf(underlying, borrower.address)).to.be.equal(
        beforeAccountCash.add(borrowAmount)
      );
    });
  });

  describe("repayBorrowFresh", () => {
    [true, false].forEach((benefactorIsPayer) => {
      let payer;
      const label = benefactorIsPayer ? "benefactor paying" : "borrower paying";
      describe(label, () => {
        beforeEach(async () => {
          payer = benefactorIsPayer ? benefactor : borrower;
          await preRepay(bToken, payer, borrower, repayAmount);
        });

        it("fails if repay is not allowed", async () => {
          const comptrollerAddr = await bToken.comptroller();
          const comptroller = await ethers.getContractAt(
            CONTRACT_NAMES.BOOL_COMPTROLLER,
            comptrollerAddr
          );
          await comptroller.setRepayBorrowAllowed(false);
          await expect(
            repayBorrowFresh(bToken, payer, borrower, repayAmount)
          ).to.be.revertedWith("rejected");
        });

        it("fails if block number ≠ current block number", async () => {
          await fastForward(bToken);
          await expect(
            repayBorrowFresh(bToken, payer, borrower, repayAmount)
          ).to.be.revertedWith("market is stale");
        });

        it("fails if insufficient approval", async () => {
          await preApprove(bToken, payer, 1);
          await expect(
            repayBorrowFresh(bToken, payer, borrower, repayAmount)
          ).to.be.revertedWith("Insufficient allowance");
        });

        it("fails if insufficient balance", async () => {
          const underlyingAddr = await bToken.underlying();
          const underlying = await ethers.getContractAt(
            CONTRACT_NAMES.ERC20_HARNESS,
            underlyingAddr
          );
          await setBalance(underlying, payer.address, 1);
          await expect(
            repayBorrowFresh(bToken, payer, borrower, repayAmount)
          ).to.be.revertedWith("Insufficient balance");
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

        it("reverts if doTransferIn fails", async () => {
          const underlyingAddr = await bToken.underlying();
          const underlying = await ethers.getContractAt(
            CONTRACT_NAMES.ERC20_HARNESS,
            underlyingAddr
          );
          await underlying.harnessSetFailTransferFromAddress(
            payer.address,
            true
          );
          await expect(
            repayBorrowFresh(bToken, payer, borrower, repayAmount)
          ).to.be.revertedWith("transfer failed");
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

        it("transfers the underlying cash, and emits Transfer, RepayBorrow events", async () => {
          const underlyingAddr = await bToken.underlying();
          const underlying = await ethers.getContractAt(
            CONTRACT_NAMES.WETH9,
            underlyingAddr
          );
          const beforeProtocolCash = await balanceOf(
            underlying,
            bToken.address
          );
          const result = await repayBorrowFresh(
            bToken,
            payer,
            borrower,
            repayAmount
          );
          expect(await balanceOf(underlying, bToken.address)).to.be.equal(
            beforeProtocolCash.add(repayAmount)
          );
          const receipt = await result.wait();
          expect(receipt.events[0].event).to.be.equal("Transfer");
          expect(receipt.events[0].args[0]).to.be.equal(payer.address);
          expect(receipt.events[0].args[1]).to.be.equal(bToken.address);
          expect(receipt.events[0].args[2]).to.be.equal(repayAmount.toString());
          expect(receipt.events[1].event).to.be.equal("RepayBorrow");
          expect(receipt.events[1].args[0]).to.be.equal(payer.address);
          expect(receipt.events[1].args[1]).to.be.equal(borrower.address);
          expect(receipt.events[1].args[2]).to.be.equal(repayAmount.toString());
          expect(receipt.events[1].args[3]).to.be.equal(0);
          expect(receipt.events[1].args[4]).to.be.equal(0);
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

    it("emits a repay borrow failure if interest accrual fails", async () => {
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

    it("returns error from repayBorrowFresh without emitting any extra logs", async () => {
      const underlyingAddr = await bToken.underlying();
      const underlying = await ethers.getContractAt(
        CONTRACT_NAMES.ERC20_HARNESS,
        underlyingAddr
      );
      await setBalance(underlying, borrower.address, 1);
      await expect(
        repayBorrow(bToken, borrower, repayAmount)
      ).to.be.revertedWith("Insufficient balance");
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

    it("repays the full amount owed if payer has enough", async () => {
      await fastForward(bToken);
      await repayBorrow(bToken, borrower, UInt256Max());
      const afterAccountBorrowSnap = await borrowSnapshot(
        bToken,
        borrower.address
      );
      expect(afterAccountBorrowSnap.principal).to.be.equal(0);
    });

    it("fails gracefully if payer does not have enough", async () => {
      const underlyingAddr = await bToken.underlying();
      const underlying = await ethers.getContractAt(
        CONTRACT_NAMES.ERC20_HARNESS,
        underlyingAddr
      );
      await setBalance(underlying, borrower.address, 3);
      await fastForward(bToken);
      await expect(
        repayBorrow(bToken, borrower, UInt256Max())
      ).to.be.revertedWith("Insufficient balance");
    });
  });

  describe("repayBorrowBehalf", () => {
    let payer;

    beforeEach(async () => {
      payer = benefactor;
      await preRepay(bToken, payer, borrower, repayAmount);
    });

    it("emits a repay borrow failure if interest accrual fails", async () => {
      const interestRateModelAddr = await bToken.interestRateModel();
      const interestRateModel = await ethers.getContractAt(
        CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
        interestRateModelAddr
      );
      await interestRateModel.setFailBorrowRate(true);
      await expect(
        repayBorrowBehalf(bToken, payer, borrower, repayAmount)
      ).to.be.revertedWith("INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from repayBorrowFresh without emitting any extra logs", async () => {
      const underlyingAddr = await bToken.underlying();
      const underlying = await ethers.getContractAt(
        CONTRACT_NAMES.ERC20_HARNESS,
        underlyingAddr
      );
      await setBalance(underlying, payer.address, 1);
      await expect(
        repayBorrowBehalf(bToken, payer, borrower, repayAmount)
      ).to.be.revertedWith("Insufficient balance");
    });

    it("returns success from repayBorrowFresh and repays the right amount", async () => {
      await fastForward(bToken);
      const beforeAccountBorrowSnap = await borrowSnapshot(
        bToken,
        borrower.address
      );
      await repayBorrowBehalf(bToken, payer, borrower, repayAmount);
      const afterAccountBorrowSnap = await borrowSnapshot(
        bToken,
        borrower.address
      );
      expect(afterAccountBorrowSnap.principal).to.be.equal(
        beforeAccountBorrowSnap.principal.sub(repayAmount)
      );
    });
  });
});
