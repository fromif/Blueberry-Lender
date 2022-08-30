const {
  etherUnsigned,
  etherMantissa,
  UInt256Max
} = require('../Utils/Ethereum');

const {
  makeBToken,
  balanceOf,
  borrowSnapshot,
  totalBorrows,
  fastForward,
  setBalance,
  preApprove,
  pretendBorrow
} = require('../Utils/Compound');

const borrowAmount = etherUnsigned(10e3);
const repayAmount = etherUnsigned(10e2);

async function preBorrow(bToken, borrower, borrowAmount) {
  await send(bToken.comptroller, 'setBorrowAllowed', [true]);
  await send(bToken.comptroller, 'setBorrowVerify', [true]);
  await send(bToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(bToken.underlying, 'harnessSetBalance', [bToken._address, borrowAmount]);
  await send(bToken, 'harnessSetFailTransferToAddress', [borrower, false]);
  await send(bToken, 'harnessSetAccountBorrows', [borrower, 0, 0]);
  await send(bToken, 'harnessSetTotalBorrows', [0]);
}

async function borrowFresh(bToken, borrower, borrowAmount) {
  return send(bToken, 'harnessBorrowFresh', [borrower, borrowAmount]);
}

async function borrow(bToken, borrower, borrowAmount, opts = {}) {
  // make sure to have a block delta so we accrue interest
  await send(bToken, 'harnessFastForward', [1]);
  return send(bToken, 'borrow', [borrowAmount], {from: borrower});
}

async function preRepay(bToken, benefactor, borrower, repayAmount) {
  // setup either benefactor OR borrower for success in repaying
  await send(bToken.comptroller, 'setRepayBorrowAllowed', [true]);
  await send(bToken.comptroller, 'setRepayBorrowVerify', [true]);
  await send(bToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(bToken.underlying, 'harnessSetFailTransferFromAddress', [benefactor, false]);
  await send(bToken.underlying, 'harnessSetFailTransferFromAddress', [borrower, false]);
  await pretendBorrow(bToken, borrower, 1, 1, repayAmount);
  await preApprove(bToken, benefactor, repayAmount);
  await preApprove(bToken, borrower, repayAmount);
}

async function repayBorrowFresh(bToken, payer, borrower, repayAmount) {
  return send(bToken, 'harnessRepayBorrowFresh', [payer, borrower, repayAmount], {from: payer});
}

async function repayBorrow(bToken, borrower, repayAmount) {
  // make sure to have a block delta so we accrue interest
  await send(bToken, 'harnessFastForward', [1]);
  return send(bToken, 'repayBorrow', [repayAmount], {from: borrower});
}

async function repayBorrowBehalf(bToken, payer, borrower, repayAmount) {
  // make sure to have a block delta so we accrue interest
  await send(bToken, 'harnessFastForward', [1]);
  return send(bToken, 'repayBorrowBehalf', [borrower, repayAmount], {from: payer});
}

describe('BToken', function () {
  let bToken, root, borrower, benefactor, accounts;
  beforeEach(async () => {
    [root, borrower, benefactor, ...accounts] = saddle.accounts;
    bToken = await makeBToken({comptrollerOpts: {kind: 'bool'}});
  });

  describe('borrowFresh', () => {
    beforeEach(async () => await preBorrow(bToken, borrower, borrowAmount));

    it("fails if comptroller tells it to", async () => {
      await send(bToken.comptroller, 'setBorrowAllowed', [false]);
      await expect(borrowFresh(bToken, borrower, borrowAmount)).rejects.toRevert('revert rejected');
    });

    it("proceeds if comptroller tells it to", async () => {
      await expect(await borrowFresh(bToken, borrower, borrowAmount)).toSucceed();
    });

    it("fails if market is stale", async () => {
      await fastForward(bToken);
      await expect(borrowFresh(bToken, borrower, borrowAmount)).rejects.toRevert('revert market is stale');
    });

    it("continues if fresh", async () => {
      await expect(await send(bToken, 'accrueInterest')).toSucceed();
      await expect(await borrowFresh(bToken, borrower, borrowAmount)).toSucceed();
    });

    it("fails if error if protocol has less than borrowAmount of underlying", async () => {
      await expect(borrowFresh(bToken, borrower, borrowAmount.plus(1))).rejects.toRevert('revert insufficient cash');
    });

    it("fails if borrowBalanceStored fails (due to non-zero stored principal with zero account index)", async () => {
      await pretendBorrow(bToken, borrower, 0, 3e18, 5e18);
      await expect(borrowFresh(bToken, borrower, borrowAmount)).rejects.toRevert("revert divide by zero");
    });

    it("fails if calculating account new total borrow balance overflows", async () => {
      await pretendBorrow(bToken, borrower, 1e-18, 1e-18, UInt256Max());
      await expect(borrowFresh(bToken, borrower, borrowAmount)).rejects.toRevert("revert addition overflow");
    });

    it("fails if calculation of new total borrow balance overflows", async () => {
      await send(bToken, 'harnessSetTotalBorrows', [UInt256Max()]);
      await expect(borrowFresh(bToken, borrower, borrowAmount)).rejects.toRevert("revert addition overflow");
    });

    it("reverts if transfer out fails", async () => {
      await send(bToken, 'harnessSetFailTransferToAddress', [borrower, true]);
      await expect(borrowFresh(bToken, borrower, borrowAmount)).rejects.toRevert("revert transfer failed");
    });

    it("reverts if borrowVerify fails", async() => {
      await send(bToken.comptroller, 'setBorrowVerify', [false]);
      await expect(borrowFresh(bToken, borrower, borrowAmount)).rejects.toRevert("revert borrowVerify rejected borrow");
    });

    it("transfers the underlying cash, tokens, and emits Transfer, Borrow events", async () => {
      const beforeProtocolCash = await balanceOf(bToken.underlying, bToken._address);
      const beforeProtocolBorrows = await totalBorrows(bToken);
      const beforeAccountCash = await balanceOf(bToken.underlying, borrower);
      const result = await borrowFresh(bToken, borrower, borrowAmount);
      expect(result).toSucceed();
      expect(await balanceOf(bToken.underlying, borrower)).toEqualNumber(beforeAccountCash.plus(borrowAmount));
      expect(await balanceOf(bToken.underlying, bToken._address)).toEqualNumber(beforeProtocolCash.minus(borrowAmount));
      expect(await totalBorrows(bToken)).toEqualNumber(beforeProtocolBorrows.plus(borrowAmount));
      expect(result).toHaveLog('Transfer', {
        from: bToken._address,
        to: borrower,
        amount: borrowAmount.toString()
      });
      expect(result).toHaveLog('Borrow', {
        borrower: borrower,
        borrowAmount: borrowAmount.toString(),
        accountBorrows: borrowAmount.toString(),
        totalBorrows: beforeProtocolBorrows.plus(borrowAmount).toString()
      });
    });

    it("stores new borrow principal and interest index", async () => {
      const beforeProtocolBorrows = await totalBorrows(bToken);
      await pretendBorrow(bToken, borrower, 0, 3, 0);
      await borrowFresh(bToken, borrower, borrowAmount);
      const borrowSnap = await borrowSnapshot(bToken, borrower);
      expect(borrowSnap.principal).toEqualNumber(borrowAmount);
      expect(borrowSnap.interestIndex).toEqualNumber(etherMantissa(3));
      expect(await totalBorrows(bToken)).toEqualNumber(beforeProtocolBorrows.plus(borrowAmount));
    });
  });

  describe('borrow', () => {
    beforeEach(async () => await preBorrow(bToken, borrower, borrowAmount));

    it("emits a borrow failure if interest accrual fails", async () => {
      await send(bToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(borrow(bToken, borrower, borrowAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from borrowFresh without emitting any extra logs", async () => {
      await expect(borrowFresh(bToken, borrower, borrowAmount.plus(1))).rejects.toRevert('revert insufficient cash');
    });

    it("returns success from borrowFresh and transfers the correct amount", async () => {
      const beforeAccountCash = await balanceOf(bToken.underlying, borrower);
      await fastForward(bToken);
      expect(await borrow(bToken, borrower, borrowAmount)).toSucceed();
      expect(await balanceOf(bToken.underlying, borrower)).toEqualNumber(beforeAccountCash.plus(borrowAmount));
    });
  });

  describe('repayBorrowFresh', () => {
    [true, false].forEach((benefactorIsPayer) => {
      let payer;
      const label = benefactorIsPayer ? "benefactor paying" : "borrower paying";
      describe(label, () => {
        beforeEach(async () => {
          payer = benefactorIsPayer ? benefactor : borrower;
          await preRepay(bToken, payer, borrower, repayAmount);
        });

        it("fails if repay is not allowed", async () => {
          await send(bToken.comptroller, 'setRepayBorrowAllowed', [false]);
          await expect(repayBorrowFresh(bToken, payer, borrower, repayAmount)).rejects.toRevert('revert rejected');
        });

        it("fails if block number ≠ current block number", async () => {
          await fastForward(bToken);
          await expect(repayBorrowFresh(bToken, payer, borrower, repayAmount)).rejects.toRevert('revert market is stale');
        });

        it("fails if insufficient approval", async() => {
          await preApprove(bToken, payer, 1);
          await expect(repayBorrowFresh(bToken, payer, borrower, repayAmount)).rejects.toRevert('revert Insufficient allowance');
        });

        it("fails if insufficient balance", async() => {
          await setBalance(bToken.underlying, payer, 1);
          await expect(repayBorrowFresh(bToken, payer, borrower, repayAmount)).rejects.toRevert('revert Insufficient balance');
        });


        it("returns an error if calculating account new account borrow balance fails", async () => {
          await pretendBorrow(bToken, borrower, 1, 1, 1);
          await expect(repayBorrowFresh(bToken, payer, borrower, repayAmount)).rejects.toRevert("revert subtraction underflow");
        });

        it("returns an error if calculation of new total borrow balance fails", async () => {
          await send(bToken, 'harnessSetTotalBorrows', [1]);
          await expect(repayBorrowFresh(bToken, payer, borrower, repayAmount)).rejects.toRevert("revert subtraction underflow");
        });


        it("reverts if doTransferIn fails", async () => {
          await send(bToken.underlying, 'harnessSetFailTransferFromAddress', [payer, true]);
          await expect(repayBorrowFresh(bToken, payer, borrower, repayAmount)).rejects.toRevert("revert transfer failed");
        });

        it("reverts if repayBorrowVerify fails", async() => {
          await send(bToken.comptroller, 'setRepayBorrowVerify', [false]);
          await expect(repayBorrowFresh(bToken, payer, borrower, repayAmount)).rejects.toRevert("revert repayBorrowVerify rejected repayBorrow");
        });

        it("transfers the underlying cash, and emits Transfer, RepayBorrow events", async () => {
          const beforeProtocolCash = await balanceOf(bToken.underlying, bToken._address);
          const result = await repayBorrowFresh(bToken, payer, borrower, repayAmount);
          expect(await balanceOf(bToken.underlying, bToken._address)).toEqualNumber(beforeProtocolCash.plus(repayAmount));
          expect(result).toHaveLog('Transfer', {
            from: payer,
            to: bToken._address,
            amount: repayAmount.toString()
          });
          expect(result).toHaveLog('RepayBorrow', {
            payer: payer,
            borrower: borrower,
            repayAmount: repayAmount.toString(),
            accountBorrows: "0",
            totalBorrows: "0"
          });
        });

        it("stores new borrow principal and interest index", async () => {
          const beforeProtocolBorrows = await totalBorrows(bToken);
          const beforeAccountBorrowSnap = await borrowSnapshot(bToken, borrower);
          expect(await repayBorrowFresh(bToken, payer, borrower, repayAmount)).toSucceed();
          const afterAccountBorrows = await borrowSnapshot(bToken, borrower);
          expect(afterAccountBorrows.principal).toEqualNumber(beforeAccountBorrowSnap.principal.minus(repayAmount));
          expect(afterAccountBorrows.interestIndex).toEqualNumber(etherMantissa(1));
          expect(await totalBorrows(bToken)).toEqualNumber(beforeProtocolBorrows.minus(repayAmount));
        });
      });
    });
  });

  describe('repayBorrow', () => {
    beforeEach(async () => {
      await preRepay(bToken, borrower, borrower, repayAmount);
    });

    it("emits a repay borrow failure if interest accrual fails", async () => {
      await send(bToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(repayBorrow(bToken, borrower, repayAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from repayBorrowFresh without emitting any extra logs", async () => {
      await setBalance(bToken.underlying, borrower, 1);
      await expect(repayBorrow(bToken, borrower, repayAmount)).rejects.toRevert('revert Insufficient balance');
    });

    it("returns success from repayBorrowFresh and repays the right amount", async () => {
      await fastForward(bToken);
      const beforeAccountBorrowSnap = await borrowSnapshot(bToken, borrower);
      expect(await repayBorrow(bToken, borrower, repayAmount)).toSucceed();
      const afterAccountBorrowSnap = await borrowSnapshot(bToken, borrower);
      expect(afterAccountBorrowSnap.principal).toEqualNumber(beforeAccountBorrowSnap.principal.minus(repayAmount));
    });

    it("repays the full amount owed if payer has enough", async () => {
      await fastForward(bToken);
      expect(await repayBorrow(bToken, borrower, UInt256Max())).toSucceed();
      const afterAccountBorrowSnap = await borrowSnapshot(bToken, borrower);
      expect(afterAccountBorrowSnap.principal).toEqualNumber(0);
    });

    it("fails gracefully if payer does not have enough", async () => {
      await setBalance(bToken.underlying, borrower, 3);
      await fastForward(bToken);
      await expect(repayBorrow(bToken, borrower, UInt256Max())).rejects.toRevert('revert Insufficient balance');
    });
  });

  describe('repayBorrowBehalf', () => {
    let payer;

    beforeEach(async () => {
      payer = benefactor;
      await preRepay(bToken, payer, borrower, repayAmount);
    });

    it("emits a repay borrow failure if interest accrual fails", async () => {
      await send(bToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(repayBorrowBehalf(bToken, payer, borrower, repayAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from repayBorrowFresh without emitting any extra logs", async () => {
      await setBalance(bToken.underlying, payer, 1);
      await expect(repayBorrowBehalf(bToken, payer, borrower, repayAmount)).rejects.toRevert('revert Insufficient balance');
    });

    it("returns success from repayBorrowFresh and repays the right amount", async () => {
      await fastForward(bToken);
      const beforeAccountBorrowSnap = await borrowSnapshot(bToken, borrower);
      expect(await repayBorrowBehalf(bToken, payer, borrower, repayAmount)).toSucceed();
      const afterAccountBorrowSnap = await borrowSnapshot(bToken, borrower);
      expect(afterAccountBorrowSnap.principal).toEqualNumber(beforeAccountBorrowSnap.principal.minus(repayAmount));
    });
  });
});
