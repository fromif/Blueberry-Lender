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
} = require("../utils/compound");
const {
  etherUnsigned,
  UInt256Max,
  etherGasCost,
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
  await bToken.connect(borrower).borrow(borrowAmount);
  // await send(cToken, "harnessFastForward", [1]);
  // return send(cToken, "borrow", [borrowAmount], { from: borrower });
}

async function preRepay(bToken, benefactor, borrower, repayAmount) {
  // setup either benefactor OR borrower for success in repaying
  const comptrollerAddr = await bToken.comptroller();
  const comptroller = await ethers.getContractAt(
    CONTRACT_NAMES.BOOL_COMPTROLLER,
    comptrollerAddr
  );
  await comptroller.setRepayBorrowAllowed(true);
  // await send(cToken.comptroller, "setRepayBorrowAllowed", [true]);
  await comptroller.setRepayBorrowVerify(true);
  // await send(cToken.comptroller, "setRepayBorrowVerify", [true]);
  const interestRateModelAddr = await bToken.interestRateModel();
  const interestRateModel = await ethers.getContractAt(
    CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
    interestRateModelAddr
  );
  await interestRateModel.setFailBorrowRate(false);
  // await send(cToken.interestRateModel, "setFailBorrowRate", [false]);
  await pretendBorrow(bToken, borrower, 1, 1, repayAmount);
}

async function repayBorrowFresh(bToken, payer, borrower, repayAmount) {
  await bToken
    .connect(payer)
    .harnessRepayBorrowFresh(payer, borrower, repayAmount, {
      value: repayAmount,
    });
  // return send(
  //   cToken,
  //   "harnessRepayBorrowFresh",
  //   [payer, borrower, repayAmount],
  //   { from: payer, value: repayAmount }
  // );
}

async function repayBorrow(bToken, borrower, repayAmount) {
  await bToken.harnessFastForward(1);
  // await send(cToken, "harnessFastForward", [1]);
  await bToken.connect(borrower).repayBorrow({ value: repayAmount });
  // return send(cToken, "repayBorrow", [], {
  //   from: borrower,
  //   value: repayAmount,
  // });
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
      // const expectedBalances = await adjustBalances(beforeBalances, [
      //   [bToken, "eth", -borrowAmount],
      //   [bToken, "borrows", borrowAmount],
      //   [bToken, "cash", -borrowAmount],
      //   [
      //     bToken,
      //     borrower,
      //     "eth",
      //     BigNumber.from(borrowAmount).sub(await etherGasCost(result)),
      //   ],
      //   [bToken, borrower, "borrows", borrowAmount],
      // ]);
      // expect(afterBalances).to.be.equal(

      // );
      // expect(result).toHaveLog("Borrow", {
      //   borrower: borrower,
      //   borrowAmount: borrowAmount.toString(),
      //   accountBorrows: borrowAmount.toString(),
      //   totalBorrows: beforeProtocolBorrows.plus(borrowAmount).toString(),
      // });
    });

    // it("stores new borrow principal and interest index", async () => {
    //   const beforeProtocolBorrows = await totalBorrows(cToken);
    //   await pretendBorrow(cToken, borrower, 0, 3, 0);
    //   await borrowFresh(cToken, borrower, borrowAmount);
    //   const borrowSnap = await borrowSnapshot(cToken, borrower);
    //   expect(borrowSnap.principal).toEqualNumber(borrowAmount);
    //   expect(borrowSnap.interestIndex).toEqualNumber(etherMantissa(3));
    //   expect(await totalBorrows(cToken)).toEqualNumber(
    //     beforeProtocolBorrows.plus(borrowAmount)
    //   );
    // });
  });

  // describe("borrow", () => {
  //   beforeEach(async () => await preBorrow(cToken, borrower, borrowAmount));

  //   it("emits a borrow failure if interest accrual fails", async () => {
  //     await send(cToken.interestRateModel, "setFailBorrowRate", [true]);
  //     await send(cToken, "harnessFastForward", [1]);
  //     await expect(borrow(cToken, borrower, borrowAmount)).rejects.toRevert(
  //       "revert INTEREST_RATE_MODEL_ERROR"
  //     );
  //   });

  //   it("returns error from borrowFresh without emitting any extra logs", async () => {
  //     expect(
  //       await borrow(cToken, borrower, borrowAmount.plus(1))
  //     ).toHaveTokenFailure(
  //       "TOKEN_INSUFFICIENT_CASH",
  //       "BORROW_CASH_NOT_AVAILABLE"
  //     );
  //   });

  //   it("returns success from borrowFresh and transfers the correct amount", async () => {
  //     const beforeBalances = await getBalances([cToken], [borrower]);
  //     await fastForward(cToken);
  //     const result = await borrow(cToken, borrower, borrowAmount);
  //     const afterBalances = await getBalances([cToken], [borrower]);
  //     expect(result).toSucceed();
  //     expect(afterBalances).toEqual(
  //       await adjustBalances(beforeBalances, [
  //         [cToken, "eth", -borrowAmount],
  //         [cToken, "borrows", borrowAmount],
  //         [cToken, "cash", -borrowAmount],
  //         [
  //           cToken,
  //           borrower,
  //           "eth",
  //           borrowAmount.minus(await etherGasCost(result)),
  //         ],
  //         [cToken, borrower, "borrows", borrowAmount],
  //       ])
  //     );
  //   });
  // });

  // describe("repayBorrowFresh", () => {
  //   [true, false].forEach(async (benefactorPaying) => {
  //     let payer;
  //     const label = benefactorPaying ? "benefactor paying" : "borrower paying";
  //     describe(label, () => {
  //       beforeEach(async () => {
  //         payer = benefactorPaying ? benefactor : borrower;

  //         await preRepay(cToken, payer, borrower, repayAmount);
  //       });

  //       it("fails if repay is not allowed", async () => {
  //         await send(cToken.comptroller, "setRepayBorrowAllowed", [false]);
  //         expect(
  //           await repayBorrowFresh(cToken, payer, borrower, repayAmount)
  //         ).toHaveTrollReject(
  //           "REPAY_BORROW_COMPTROLLER_REJECTION",
  //           "MATH_ERROR"
  //         );
  //       });

  //       it("fails if block number ≠ current block number", async () => {
  //         await fastForward(cToken);
  //         expect(
  //           await repayBorrowFresh(cToken, payer, borrower, repayAmount)
  //         ).toHaveTokenFailure(
  //           "MARKET_NOT_FRESH",
  //           "REPAY_BORROW_FRESHNESS_CHECK"
  //         );
  //       });

  //       it("returns an error if calculating account new account borrow balance fails", async () => {
  //         await pretendBorrow(cToken, borrower, 1, 1, 1);
  //         await expect(
  //           repayBorrowFresh(cToken, payer, borrower, repayAmount)
  //         ).rejects.toRevert("revert subtraction underflow");
  //       });

  //       it("returns an error if calculation of new total borrow balance fails", async () => {
  //         await send(cToken, "harnessSetTotalBorrows", [1]);
  //         await expect(
  //           repayBorrowFresh(cToken, payer, borrower, repayAmount)
  //         ).rejects.toRevert("revert subtraction underflow");
  //       });

  //       it("reverts if checkTransferIn fails", async () => {
  //         await expect(
  //           send(
  //             cToken,
  //             "harnessRepayBorrowFresh",
  //             [payer, borrower, repayAmount],
  //             { from: root, value: repayAmount }
  //           )
  //         ).rejects.toRevert("revert sender mismatch");
  //         await expect(
  //           send(
  //             cToken,
  //             "harnessRepayBorrowFresh",
  //             [payer, borrower, repayAmount],
  //             { from: payer, value: 1 }
  //           )
  //         ).rejects.toRevert("revert value mismatch");
  //       });

  //       it("reverts if repayBorrowVerify fails", async () => {
  //         await send(cToken.comptroller, "setRepayBorrowVerify", [false]);
  //         await expect(
  //           repayBorrowFresh(cToken, payer, borrower, repayAmount)
  //         ).rejects.toRevert("revert repayBorrowVerify rejected repayBorrow");
  //       });

  //       it("transfers the underlying cash, and emits RepayBorrow event", async () => {
  //         const beforeBalances = await getBalances([cToken], [borrower]);
  //         const result = await repayBorrowFresh(
  //           cToken,
  //           payer,
  //           borrower,
  //           repayAmount
  //         );
  //         const afterBalances = await getBalances([cToken], [borrower]);
  //         expect(result).toSucceed();
  //         if (borrower == payer) {
  //           expect(afterBalances).toEqual(
  //             await adjustBalances(beforeBalances, [
  //               [cToken, "eth", repayAmount],
  //               [cToken, "borrows", -repayAmount],
  //               [cToken, "cash", repayAmount],
  //               [cToken, borrower, "borrows", -repayAmount],
  //               [
  //                 cToken,
  //                 borrower,
  //                 "eth",
  //                 -repayAmount.plus(await etherGasCost(result)),
  //               ],
  //             ])
  //           );
  //         } else {
  //           expect(afterBalances).toEqual(
  //             await adjustBalances(beforeBalances, [
  //               [cToken, "eth", repayAmount],
  //               [cToken, "borrows", -repayAmount],
  //               [cToken, "cash", repayAmount],
  //               [cToken, borrower, "borrows", -repayAmount],
  //             ])
  //           );
  //         }
  //         expect(result).toHaveLog("RepayBorrow", {
  //           payer: payer,
  //           borrower: borrower,
  //           repayAmount: repayAmount.toString(),
  //           accountBorrows: "0",
  //           totalBorrows: "0",
  //         });
  //       });

  //       it("stores new borrow principal and interest index", async () => {
  //         const beforeProtocolBorrows = await totalBorrows(cToken);
  //         const beforeAccountBorrowSnap = await borrowSnapshot(
  //           cToken,
  //           borrower
  //         );
  //         expect(
  //           await repayBorrowFresh(cToken, payer, borrower, repayAmount)
  //         ).toSucceed();
  //         const afterAccountBorrows = await borrowSnapshot(cToken, borrower);
  //         expect(afterAccountBorrows.principal).toEqualNumber(
  //           beforeAccountBorrowSnap.principal.minus(repayAmount)
  //         );
  //         expect(afterAccountBorrows.interestIndex).toEqualNumber(
  //           etherMantissa(1)
  //         );
  //         expect(await totalBorrows(cToken)).toEqualNumber(
  //           beforeProtocolBorrows.minus(repayAmount)
  //         );
  //       });
  //     });
  //   });
  // });

  // describe("repayBorrow", () => {
  //   beforeEach(async () => {
  //     await preRepay(cToken, borrower, borrower, repayAmount);
  //   });

  //   it("reverts if interest accrual fails", async () => {
  //     await send(cToken.interestRateModel, "setFailBorrowRate", [true]);
  //     await expect(repayBorrow(cToken, borrower, repayAmount)).rejects.toRevert(
  //       "revert INTEREST_RATE_MODEL_ERROR"
  //     );
  //   });

  //   it("reverts when repay borrow fresh fails", async () => {
  //     await send(cToken.comptroller, "setRepayBorrowAllowed", [false]);
  //     await expect(
  //       repayBorrow(cToken, borrower, repayAmount)
  //     ).rejects.toRevertWithError(
  //       "COMPTROLLER_REJECTION",
  //       "revert repayBorrow failed"
  //     );
  //   });

  //   it("returns success from repayBorrowFresh and repays the right amount", async () => {
  //     await fastForward(cToken);
  //     const beforeAccountBorrowSnap = await borrowSnapshot(cToken, borrower);
  //     expect(await repayBorrow(cToken, borrower, repayAmount)).toSucceed();
  //     const afterAccountBorrowSnap = await borrowSnapshot(cToken, borrower);
  //     expect(afterAccountBorrowSnap.principal).toEqualNumber(
  //       beforeAccountBorrowSnap.principal.minus(repayAmount)
  //     );
  //   });

  //   it("reverts if overpaying", async () => {
  //     const beforeAccountBorrowSnap = await borrowSnapshot(cToken, borrower);
  //     let tooMuch = new BigNumber(beforeAccountBorrowSnap.principal).plus(1);
  //     await expect(repayBorrow(cToken, borrower, tooMuch)).rejects.toRevert(
  //       "revert subtraction underflow"
  //     );
  //   });
  // });
});
