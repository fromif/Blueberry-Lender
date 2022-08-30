const {
  etherGasCost,
  etherUnsigned,
  etherMantissa,
  UInt256Max
} = require('../Utils/Ethereum');

const {
  makeBToken,
  borrowSnapshot,
  totalBorrows,
  fastForward,
  pretendBorrow,
  getBalances,
  adjustBalances,
  setBalance
} = require('../Utils/Compound');

const BigNumber = require('bignumber.js');

const borrowAmount = etherUnsigned(10e3);
const repayAmount = etherUnsigned(10e2);

async function preBorrow(bToken, borrower, borrowAmount) {
  const root = saddle.account;
  await send(bToken.comptroller, 'setBorrowAllowed', [true]);
  await send(bToken.comptroller, 'setBorrowVerify', [true]);
  await send(bToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(bToken, 'harnessSetFailTransferToAddress', [borrower, false]);
  await send(bToken, 'harnessSetAccountBorrows', [borrower, 0, 0]);
  await send(bToken, 'harnessSetTotalBorrows', [0]);
  await send(bToken.underlying, 'deposit', [], { from: root, value: borrowAmount });
  await send(bToken.underlying, 'harnessSetBalance', [bToken._address, borrowAmount]);
}

async function borrowFresh(bToken, borrower, borrowAmount) {
  return send(bToken, 'harnessBorrowFresh', [borrower, borrowAmount], {from: borrower});
}

async function borrowNative(bToken, borrower, borrowAmount, opts = {}) {
  await send(bToken, 'harnessFastForward', [1]);
  return send(bToken, 'borrowNative', [borrowAmount], {from: borrower});
}

async function borrow(bToken, borrower, borrowAmount, opts = {}) {
  await send(bToken, 'harnessFastForward', [1]);
  return send(bToken, 'borrow', [borrowAmount], {from: borrower});
}

async function preRepay(bToken, benefactor, borrower, repayAmount) {
  // setup either benefactor OR borrower for success in repaying
  await send(bToken.comptroller, 'setRepayBorrowAllowed', [true]);
  await send(bToken.comptroller, 'setRepayBorrowVerify', [true]);
  await send(bToken.interestRateModel, 'setFailBorrowRate', [false]);
  await pretendBorrow(bToken, borrower, 1, 1, repayAmount);
}

async function repayBorrowFresh(bToken, payer, borrower, repayAmount) {
  return send(bToken, 'harnessRepayBorrowFresh', [payer, borrower, repayAmount], {from: payer, value: repayAmount});
}

async function repayBorrowNative(bToken, borrower, repayAmount) {
  await send(bToken, 'harnessFastForward', [1]);
  return send(bToken, 'repayBorrowNative', [], {from: borrower, value: repayAmount});
}

async function repayBorrow(bToken, borrower, repayAmount) {
  await send(bToken, 'harnessFastForward', [1]);
  return send(bToken, 'repayBorrow', [repayAmount], {from: borrower});
}

async function repayBorrowBehalfNative(bToken, payer, borrower, repayAmount) {
  await send(bToken, 'harnessFastForward', [1]);
  return send(bToken, 'repayBorrowBehalfNative', [borrower], {from: payer, value: repayAmount});
}

async function repayBorrowBehalf(bToken, payer, borrower, repayAmount) {
  await send(bToken, 'harnessFastForward', [1]);
  return send(bToken, 'repayBorrowBehalf', [borrower, repayAmount], {from: payer});
}

describe('BWrappedNative', function () {
  let bToken, root, borrower, benefactor, accounts;
  beforeEach(async () => {
    [root, borrower, benefactor, ...accounts] = saddle.accounts;
    bToken = await makeBToken({kind: 'bwrapped', comptrollerOpts: {kind: 'bool'}});
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

    it("fails if protocol has less than borrowAmount of underlying", async () => {
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

    it("transfers the underlying cash, tokens, and emits Borrow event", async () => {
      const beforeBalances = await getBalances([bToken], [borrower]);
      const beforeProtocolBorrows = await totalBorrows(bToken);
      const result = await borrowFresh(bToken, borrower, borrowAmount);
      const afterBalances = await getBalances([bToken], [borrower]);
      expect(result).toSucceed();
      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [bToken, 'borrows', borrowAmount],
        [bToken, 'cash', -borrowAmount],
        [bToken, borrower, 'eth', borrowAmount.minus(await etherGasCost(result))],
        [bToken, borrower, 'borrows', borrowAmount]
      ]));
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

  describe('borrowNative', () => {
    beforeEach(async () => await preBorrow(bToken, borrower, borrowAmount));

    it("emits a borrow failure if interest accrual fails", async () => {
      await send(bToken.interestRateModel, 'setFailBorrowRate', [true]);
      await send(bToken, 'harnessFastForward', [1]);
      await expect(borrowNative(bToken, borrower, borrowAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns success from borrowFresh and transfers the correct amount", async () => {
      const beforeBalances = await getBalances([bToken], [borrower]);
      await fastForward(bToken);
      const result = await borrowNative(bToken, borrower, borrowAmount);
      const afterBalances = await getBalances([bToken], [borrower]);
      expect(result).toSucceed();
      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [bToken, 'borrows', borrowAmount],
        [bToken, 'cash', -borrowAmount],
        [bToken, borrower, 'eth', borrowAmount.minus(await etherGasCost(result))],
        [bToken, borrower, 'borrows', borrowAmount]
      ]));
    });
  });

  describe('borrow', () => {
    beforeEach(async () => await preBorrow(bToken, borrower, borrowAmount));

    it("emits a borrow failure if interest accrual fails", async () => {
      await send(bToken.interestRateModel, 'setFailBorrowRate', [true]);
      await send(bToken, 'harnessFastForward', [1]);
      await expect(borrow(bToken, borrower, borrowAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns success from borrowFresh and transfers the correct amount", async () => {
      const beforeBalances = await getBalances([bToken], [borrower]);
      await fastForward(bToken);
      const result = await borrow(bToken, borrower, borrowAmount);
      const afterBalances = await getBalances([bToken], [borrower]);
      expect(result).toSucceed();
      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [bToken, 'borrows', borrowAmount],
        [bToken, 'cash', -borrowAmount],
        [bToken, borrower, 'cash', borrowAmount],
        [bToken, borrower, 'eth', -(await etherGasCost(result))],
        [bToken, borrower, 'borrows', borrowAmount]
      ]));
    });
  });

  describe('repayBorrowFresh', () => {
    [true, false].forEach(async (benefactorPaying) => {
      let payer;
      const label = benefactorPaying ? "benefactor paying" : "borrower paying";
      describe(label, () => {
        beforeEach(async () => {
          payer = benefactorPaying ? benefactor : borrower;

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

        it("returns an error if calculating account new account borrow balance fails", async () => {
          await pretendBorrow(bToken, borrower, 1, 1, 1);
          await expect(repayBorrowFresh(bToken, payer, borrower, repayAmount)).rejects.toRevert('revert subtraction underflow');
        });

        it("returns an error if calculation of new total borrow balance fails", async () => {
          await send(bToken, 'harnessSetTotalBorrows', [1]);
          await expect(repayBorrowFresh(bToken, payer, borrower, repayAmount)).rejects.toRevert('revert subtraction underflow');
        });

        it("reverts if checkTransferIn fails", async () => {
          await expect(
            send(bToken, 'harnessRepayBorrowFresh', [payer, borrower, repayAmount], {from: root, value: repayAmount})
          ).rejects.toRevert("revert sender mismatch");
          await expect(
            send(bToken, 'harnessRepayBorrowFresh', [payer, borrower, repayAmount], {from: payer, value: 1})
          ).rejects.toRevert("revert value mismatch");
        });

        it("transfers the underlying cash, and emits RepayBorrow event", async () => {
          const beforeBalances = await getBalances([bToken], [borrower]);
          const result = await repayBorrowFresh(bToken, payer, borrower, repayAmount);
          const afterBalances = await getBalances([bToken], [borrower]);
          expect(result).toSucceed();
          if (borrower == payer) {
            expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
              [bToken, 'borrows', -repayAmount],
              [bToken, 'cash', repayAmount],
              [bToken, borrower, 'borrows', -repayAmount],
              [bToken, borrower, 'eth', -repayAmount.plus(await etherGasCost(result))]
            ]));
          } else {
            expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
              [bToken, 'borrows', -repayAmount],
              [bToken, 'cash', repayAmount],
              [bToken, borrower, 'borrows', -repayAmount],
            ]));
          }
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

  describe('repayBorrowNative', () => {
    beforeEach(async () => {
      await preRepay(bToken, borrower, borrower, repayAmount);
    });

    it("reverts if interest accrual fails", async () => {
      await send(bToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(repayBorrowNative(bToken, borrower, repayAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("reverts when repay borrow fresh fails", async () => {
      await send(bToken.comptroller, 'setRepayBorrowAllowed', [false]);
      await expect(repayBorrowNative(bToken, borrower, repayAmount)).rejects.toRevert("revert rejected");
    });

    it("returns success from repayBorrowFresh and repays the right amount", async () => {
      await fastForward(bToken);
      const beforeAccountBorrowSnap = await borrowSnapshot(bToken, borrower);
      expect(await repayBorrowNative(bToken, borrower, repayAmount)).toSucceed();
      const afterAccountBorrowSnap = await borrowSnapshot(bToken, borrower);
      expect(afterAccountBorrowSnap.principal).toEqualNumber(beforeAccountBorrowSnap.principal.minus(repayAmount));
    });

    it("reverts if overpaying", async () => {
      const beforeAccountBorrowSnap = await borrowSnapshot(bToken, borrower);
      let tooMuch = new BigNumber(beforeAccountBorrowSnap.principal).plus(1);
      await expect(repayBorrowNative(bToken, borrower, tooMuch)).rejects.toRevert("revert subtraction underflow");
    });
  });

  describe('repayBorrow', () => {
    beforeEach(async () => {
      await preRepay(bToken, borrower, borrower, repayAmount);

      // Give some weth to borrower for repayment.
      await send(bToken.underlying, 'deposit', [], { from: borrower, value: repayAmount.multipliedBy(2) });
      await send(bToken.underlying, 'approve', [bToken._address, repayAmount.multipliedBy(2)], { from: borrower });
    });

    it("reverts if interest accrual fails", async () => {
      await send(bToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(repayBorrow(bToken, borrower, repayAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("reverts when repay borrow fresh fails", async () => {
      await send(bToken.comptroller, 'setRepayBorrowAllowed', [false]);
      await expect(repayBorrow(bToken, borrower, repayAmount)).rejects.toRevert("revert rejected");
    });

    it("returns success from repayBorrowFresh and repays the right amount", async () => {
      await fastForward(bToken);
      const beforeAccountBorrowSnap = await borrowSnapshot(bToken, borrower);
      expect(await repayBorrow(bToken, borrower, repayAmount)).toSucceed();
      const afterAccountBorrowSnap = await borrowSnapshot(bToken, borrower);
      expect(afterAccountBorrowSnap.principal).toEqualNumber(beforeAccountBorrowSnap.principal.minus(repayAmount));
    });

    it("reverts if overpaying", async () => {
      const beforeAccountBorrowSnap = await borrowSnapshot(bToken, borrower);
      let tooMuch = new BigNumber(beforeAccountBorrowSnap.principal).plus(1);
      await expect(repayBorrow(bToken, borrower, tooMuch)).rejects.toRevert("revert subtraction underflow");
    });
  });

  describe('repayBorrowBehalfNative', () => {
    let payer;

    beforeEach(async () => {
      payer = benefactor;
      await preRepay(bToken, payer, borrower, repayAmount);
    });

    it("reverts if interest accrual fails", async () => {
      await send(bToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(repayBorrowBehalfNative(bToken, payer, borrower, repayAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns success from repayBorrowFresh and repays the right amount", async () => {
      await fastForward(bToken);
      const beforeAccountBorrowSnap = await borrowSnapshot(bToken, borrower);
      expect(await repayBorrowBehalfNative(bToken, payer, borrower, repayAmount)).toSucceed();
      const afterAccountBorrowSnap = await borrowSnapshot(bToken, borrower);
      expect(afterAccountBorrowSnap.principal).toEqualNumber(beforeAccountBorrowSnap.principal.minus(repayAmount));
    });

    it("reverts if overpaying", async () => {
      const beforeAccountBorrowSnap = await borrowSnapshot(bToken, borrower);
      let tooMuch = new BigNumber(beforeAccountBorrowSnap.principal).plus(1);
      await expect(repayBorrowBehalfNative(bToken, payer, borrower, tooMuch)).rejects.toRevert("revert subtraction underflow");
    });
  });

  describe('repayBorrowBehalf', () => {
    let payer;

    beforeEach(async () => {
      payer = benefactor;
      await preRepay(bToken, payer, borrower, repayAmount);

      // Give some weth to payer for repayment.
      await send(bToken.underlying, 'deposit', [], { from: payer, value: repayAmount.multipliedBy(2) });
      await send(bToken.underlying, 'approve', [bToken._address, repayAmount.multipliedBy(2)], { from: payer });
    });

    it("reverts if interest accrual fails", async () => {
      await send(bToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(repayBorrowBehalf(bToken, payer, borrower, repayAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns success from repayBorrowFresh and repays the right amount", async () => {
      await fastForward(bToken);
      const beforeAccountBorrowSnap = await borrowSnapshot(bToken, borrower);
      expect(await repayBorrowBehalf(bToken, payer, borrower, repayAmount)).toSucceed();
      const afterAccountBorrowSnap = await borrowSnapshot(bToken, borrower);
      expect(afterAccountBorrowSnap.principal).toEqualNumber(beforeAccountBorrowSnap.principal.minus(repayAmount));
    });

    it("reverts if overpaying", async () => {
      const beforeAccountBorrowSnap = await borrowSnapshot(bToken, borrower);
      let tooMuch = new BigNumber(beforeAccountBorrowSnap.principal).plus(1);
      await expect(repayBorrowBehalf(bToken, payer, borrower, tooMuch)).rejects.toRevert("revert subtraction underflow");
    });
  });
});
