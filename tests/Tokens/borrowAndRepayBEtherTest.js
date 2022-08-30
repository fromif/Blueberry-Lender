const {
  etherGasCost,
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
  pretendBorrow,
  setEtherBalance,
  getBalances,
  adjustBalances
} = require('../Utils/Compound');

const BigNumber = require('bignumber.js');

const borrowAmount = etherUnsigned(10e3);
const repayAmount = etherUnsigned(10e2);

async function preBorrow(bToken, borrower, borrowAmount) {
  await send(bToken.comptroller, 'setBorrowAllowed', [true]);
  await send(bToken.comptroller, 'setBorrowVerify', [true]);
  await send(bToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(bToken, 'harnessSetFailTransferToAddress', [borrower, false]);
  await send(bToken, 'harnessSetAccountBorrows', [borrower, 0, 0]);
  await send(bToken, 'harnessSetTotalBorrows', [0]);
  await setEtherBalance(bToken, borrowAmount);
}

async function borrowFresh(bToken, borrower, borrowAmount) {
  return send(bToken, 'harnessBorrowFresh', [borrower, borrowAmount], {from: borrower});
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

async function repayBorrow(bToken, borrower, repayAmount) {
  await send(bToken, 'harnessFastForward', [1]);
  return send(bToken, 'repayBorrow', [], {from: borrower, value: repayAmount});
}

describe('BEther', function () {
  let bToken, root, borrower, benefactor, accounts;
  beforeEach(async () => {
    [root, borrower, benefactor, ...accounts] = saddle.accounts;
    bToken = await makeBToken({kind: 'bether', comptrollerOpts: {kind: 'bool'}});
  });

  describe('borrowFresh', () => {
    beforeEach(async () => await preBorrow(bToken, borrower, borrowAmount));

    it("fails if comptroller tells it to", async () => {
      await send(bToken.comptroller, 'setBorrowAllowed', [false]);
      expect(await borrowFresh(bToken, borrower, borrowAmount)).toHaveTrollReject('BORROW_COMPTROLLER_REJECTION');
    });

    it("proceeds if comptroller tells it to", async () => {
      await expect(await borrowFresh(bToken, borrower, borrowAmount)).toSucceed();
    });

    it("fails if market is stale", async () => {
      await fastForward(bToken);
      expect(await borrowFresh(bToken, borrower, borrowAmount)).toHaveTokenFailure('MARKET_NOT_FRESH', 'BORROW_FRESHNESS_CHECK');
    });

    it("continues if fresh", async () => {
      await expect(await send(bToken, 'accrueInterest')).toSucceed();
      await expect(await borrowFresh(bToken, borrower, borrowAmount)).toSucceed();
    });

    it("fails if protocol has less than borrowAmount of underlying", async () => {
      expect(await borrowFresh(bToken, borrower, borrowAmount.plus(1))).toHaveTokenFailure('TOKEN_INSUFFICIENT_CASH', 'BORROW_CASH_NOT_AVAILABLE');
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
      await expect(borrowFresh(bToken, borrower, borrowAmount)).rejects.toRevert("revert TOKEN_TRANSFER_OUT_FAILED");
    });

    it("reverts if borrowVerify fails", async() => {
      await send(bToken.comptroller, 'setBorrowVerify', [false]);
      await expect(borrowFresh(bToken, borrower, borrowAmount)).rejects.toRevert("revert borrowVerify rejected borrow");
    });

    it("transfers the underlying cash, tokens, and emits Borrow event", async () => {
      const beforeBalances = await getBalances([bToken], [borrower]);
      const beforeProtocolBorrows = await totalBorrows(bToken);
      const result = await borrowFresh(bToken, borrower, borrowAmount);
      const afterBalances = await getBalances([bToken], [borrower]);
      expect(result).toSucceed();
      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [bToken, 'eth', -borrowAmount],
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

  describe('borrow', () => {
    beforeEach(async () => await preBorrow(bToken, borrower, borrowAmount));

    it("emits a borrow failure if interest accrual fails", async () => {
      await send(bToken.interestRateModel, 'setFailBorrowRate', [true]);
      await send(bToken, 'harnessFastForward', [1]);
      await expect(borrow(bToken, borrower, borrowAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from borrowFresh without emitting any extra logs", async () => {
      expect(await borrow(bToken, borrower, borrowAmount.plus(1))).toHaveTokenFailure('TOKEN_INSUFFICIENT_CASH', 'BORROW_CASH_NOT_AVAILABLE');
    });

    it("returns success from borrowFresh and transfers the correct amount", async () => {
      const beforeBalances = await getBalances([bToken], [borrower]);
      await fastForward(bToken);
      const result = await borrow(bToken, borrower, borrowAmount);
      const afterBalances = await getBalances([bToken], [borrower]);
      expect(result).toSucceed();
      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [bToken, 'eth', -borrowAmount],
        [bToken, 'borrows', borrowAmount],
        [bToken, 'cash', -borrowAmount],
        [bToken, borrower, 'eth', borrowAmount.minus(await etherGasCost(result))],
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
          expect(await repayBorrowFresh(bToken, payer, borrower, repayAmount)).toHaveTrollReject('REPAY_BORROW_COMPTROLLER_REJECTION', 'MATH_ERROR');
        });

        it("fails if block number ≠ current block number", async () => {
          await fastForward(bToken);
          expect(await repayBorrowFresh(bToken, payer, borrower, repayAmount)).toHaveTokenFailure('MARKET_NOT_FRESH', 'REPAY_BORROW_FRESHNESS_CHECK');
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

        it("reverts if repayBorrowVerify fails", async() => {
          await send(bToken.comptroller, 'setRepayBorrowVerify', [false]);
          await expect(repayBorrowFresh(bToken, payer, borrower, repayAmount)).rejects.toRevert("revert repayBorrowVerify rejected repayBorrow");
        });

        it("transfers the underlying cash, and emits RepayBorrow event", async () => {
          const beforeBalances = await getBalances([bToken], [borrower]);
          const result = await repayBorrowFresh(bToken, payer, borrower, repayAmount);
          const afterBalances = await getBalances([bToken], [borrower]);
          expect(result).toSucceed();
          if (borrower == payer) {
            expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
              [bToken, 'eth', repayAmount],
              [bToken, 'borrows', -repayAmount],
              [bToken, 'cash', repayAmount],
              [bToken, borrower, 'borrows', -repayAmount],
              [bToken, borrower, 'eth', -repayAmount.plus(await etherGasCost(result))]
            ]));
          } else {
            expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
              [bToken, 'eth', repayAmount],
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

  describe('repayBorrow', () => {
    beforeEach(async () => {
      await preRepay(bToken, borrower, borrower, repayAmount);
    });

    it("reverts if interest accrual fails", async () => {
      await send(bToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(repayBorrow(bToken, borrower, repayAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("reverts when repay borrow fresh fails", async () => {
      await send(bToken.comptroller, 'setRepayBorrowAllowed', [false]);
      await expect(repayBorrow(bToken, borrower, repayAmount)).rejects.toRevertWithError('COMPTROLLER_REJECTION', "revert repayBorrow failed");
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
});
