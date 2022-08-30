const {
  etherMantissa,
  etherUnsigned,
  UInt256Max
} = require('../Utils/Ethereum');
const {
  makeBToken,
  setBorrowRate
} = require('../Utils/Compound');

const blockNumber = 2e7;
const borrowIndex = 1e18;
const borrowRate = .000001;

async function pretendBlock(bToken, accrualBlock = blockNumber, deltaBlocks = 1) {
  await send(bToken, 'harnessSetAccrualBlockNumber', [etherUnsigned(blockNumber)]);
  await send(bToken, 'harnessSetBlockNumber', [etherUnsigned(blockNumber + deltaBlocks)]);
  await send(bToken, 'harnessSetBorrowIndex', [etherUnsigned(borrowIndex)]);
}

async function preAccrue(bToken) {
  await setBorrowRate(bToken, borrowRate);
  await send(bToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(bToken, 'harnessExchangeRateDetails', [0, 0, 0]);
}

describe('BToken', () => {
  let root, accounts;
  let bToken, bToken2;
  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
    bToken = await makeBToken({comptrollerOpts: {kind: 'bool'}});
    bToken2 = await makeBToken({ kind: 'bcollateralcapnointerest' });
  });

  beforeEach(async () => {
    await preAccrue(bToken);
    await preAccrue(bToken2);
  });

  describe('accrueInterest', () => {
    it('reverts if the interest rate is absurdly high', async () => {
      await pretendBlock(bToken, blockNumber, 1);
      expect(await call(bToken, 'getBorrowRateMaxMantissa')).toEqualNumber(etherMantissa(0.000005)); // 0.0005% per block
      await setBorrowRate(bToken, 0.001e-2); // 0.0010% per block
      await expect(send(bToken, 'accrueInterest')).rejects.toRevert("revert borrow rate too high");
    });

    it('fails if new borrow rate calculation fails', async () => {
      await pretendBlock(bToken, blockNumber, 1);
      await send(bToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(send(bToken, 'accrueInterest')).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it('fails if simple interest factor calculation fails', async () => {
      await pretendBlock(bToken, blockNumber, 5e70);
      await expect(send(bToken, 'accrueInterest')).rejects.toRevert("revert multiplication overflow");
    });

    it('fails if new borrow index calculation fails', async () => {
      await pretendBlock(bToken, blockNumber, 5e60);
      await expect(send(bToken, 'accrueInterest')).rejects.toRevert("revert multiplication overflow");
    });

    it('fails if new borrow interest index calculation fails', async () => {
      await pretendBlock(bToken)
      await send(bToken, 'harnessSetBorrowIndex', [UInt256Max()]);
      await expect(send(bToken, 'accrueInterest')).rejects.toRevert("revert multiplication overflow");
    });

    it('fails if interest accumulated calculation fails', async () => {
      await send(bToken, 'harnessExchangeRateDetails', [0, UInt256Max(), 0]);
      await pretendBlock(bToken)
      await expect(send(bToken, 'accrueInterest')).rejects.toRevert("revert multiplication overflow");
    });

    it('fails if new total borrows calculation fails', async () => {
      await setBorrowRate(bToken, 1e-18);
      await pretendBlock(bToken)
      await send(bToken, 'harnessExchangeRateDetails', [0, UInt256Max(), 0]);
      await expect(send(bToken, 'accrueInterest')).rejects.toRevert("revert addition overflow");
    });

    it('fails if interest accumulated for reserves calculation fails', async () => {
      await setBorrowRate(bToken, .000001);
      await send(bToken, 'harnessExchangeRateDetails', [0, etherUnsigned(1e30), UInt256Max()]);
      await send(bToken, 'harnessSetReserveFactorFresh', [etherUnsigned(1e10)]);
      await pretendBlock(bToken, blockNumber, 5e20)
      await expect(send(bToken, 'accrueInterest')).rejects.toRevert("revert addition overflow");
    });

    it('fails if new total reserves calculation fails', async () => {
      await setBorrowRate(bToken, 1e-18);
      await send(bToken, 'harnessExchangeRateDetails', [0, etherUnsigned(1e56), UInt256Max()]);
      await send(bToken, 'harnessSetReserveFactorFresh', [etherUnsigned(1e17)]);
      await pretendBlock(bToken)
      await expect(send(bToken, 'accrueInterest')).rejects.toRevert("revert addition overflow");
    });

    it('succeeds and saves updated values in storage on success', async () => {
      const startingTotalBorrows = 1e22;
      const startingTotalReserves = 1e20;
      const reserveFactor = 1e17;

      await send(bToken, 'harnessExchangeRateDetails', [0, etherUnsigned(startingTotalBorrows), etherUnsigned(startingTotalReserves)]);
      await send(bToken, 'harnessSetReserveFactorFresh', [etherUnsigned(reserveFactor)]);
      await pretendBlock(bToken)

      const expectedAccrualBlockNumber = blockNumber + 1;
      const expectedBorrowIndex = borrowIndex + borrowIndex * borrowRate;
      const expectedTotalBorrows = startingTotalBorrows + startingTotalBorrows * borrowRate;
      const expectedTotalReserves = startingTotalReserves + startingTotalBorrows *  borrowRate * reserveFactor / 1e18;

      const receipt = await send(bToken, 'accrueInterest')
      expect(receipt).toSucceed();
      expect(receipt).toHaveLog('AccrueInterest', {
        cashPrior: 0,
        interestAccumulated: etherUnsigned(expectedTotalBorrows).minus(etherUnsigned(startingTotalBorrows)).toFixed(),
        borrowIndex: etherUnsigned(expectedBorrowIndex).toFixed(),
        totalBorrows: etherUnsigned(expectedTotalBorrows).toFixed()
      })
      expect(await call(bToken, 'accrualBlockNumber')).toEqualNumber(expectedAccrualBlockNumber);
      expect(await call(bToken, 'borrowIndex')).toEqualNumber(expectedBorrowIndex);
      expect(await call(bToken, 'totalBorrows')).toEqualNumber(expectedTotalBorrows);
      expect(await call(bToken, 'totalReserves')).toEqualNumber(expectedTotalReserves);
    });

    it('succeeds and saves updated values in storage but excludes evil spell', async () => {
      const evilSpell = '0x560A8E3B79d23b0A525E15C6F3486c6A293DDAd2';

      const startingTotalBorrows = 2e22;
      const evilSpellBorrows = 1e22;
      const startingTotalReserves = 1e20;
      const reserveFactor = 1e17;

      await send(bToken2, 'harnessSetAccountBorrows', [evilSpell, etherUnsigned(evilSpellBorrows), 0]);
      await send(bToken2, 'harnessExchangeRateDetails', [0, etherUnsigned(startingTotalBorrows), etherUnsigned(startingTotalReserves)]);
      await send(bToken2, 'harnessSetReserveFactorFresh', [etherUnsigned(reserveFactor)]);
      await pretendBlock(bToken2);

      const expectedAccrualBlockNumber = blockNumber + 1;
      const expectedBorrowIndex = borrowIndex + borrowIndex * borrowRate;
      const expectedTotalBorrows = startingTotalBorrows + (startingTotalBorrows - evilSpellBorrows) * borrowRate;
      const expectedTotalReserves = startingTotalReserves + (startingTotalBorrows - evilSpellBorrows) *  borrowRate * reserveFactor / 1e18;

      const receipt = await send(bToken2, 'accrueInterest')
      expect(receipt).toSucceed();
      expect(receipt).toHaveLog('AccrueInterest', {
        cashPrior: 0,
        interestAccumulated: etherUnsigned(expectedTotalBorrows).minus(etherUnsigned(startingTotalBorrows)).toFixed(),
        borrowIndex: etherUnsigned(expectedBorrowIndex).toFixed(),
        totalBorrows: etherUnsigned(expectedTotalBorrows).toFixed()
      })
      expect(await call(bToken2, 'accrualBlockNumber')).toEqualNumber(expectedAccrualBlockNumber);
      expect(await call(bToken2, 'borrowIndex')).toEqualNumber(expectedBorrowIndex);
      expect(await call(bToken2, 'totalBorrows')).toEqualNumber(expectedTotalBorrows);
      expect(await call(bToken2, 'totalReserves')).toEqualNumber(expectedTotalReserves);
    });
  });
});
