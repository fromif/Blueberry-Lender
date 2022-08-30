const {
  etherUnsigned,
  etherMantissa,
  UInt256Max
} = require('../Utils/Ethereum');

const {
  makeBToken,
  setBorrowRate,
  pretendBorrow
} = require('../Utils/Compound');

describe('BToken', function () {
  let root, admin, accounts;
  beforeEach(async () => {
    [root, admin, ...accounts] = saddle.accounts;
  });

  describe('constructor', () => {
    it("fails when non erc-20 underlying", async () => {
      await expect(makeBToken({ underlying: { _address: root } })).rejects.toRevert("revert");
    });

    it("fails when 0 initial exchange rate", async () => {
      await expect(makeBToken({ exchangeRate: 0 })).rejects.toRevert("revert invalid exchange rate");
    });

    it("succeeds with erc-20 underlying and non-zero exchange rate", async () => {
      const bToken = await makeBToken();
      expect(await call(bToken, 'underlying')).toEqual(bToken.underlying._address);
      expect(await call(bToken, 'admin')).toEqual(root);
    });

    it("succeeds when setting admin to contructor argument", async () => {
      const bToken = await makeBToken({ admin: admin });
      expect(await call(bToken, 'admin')).toEqual(admin);
    });
  });

  describe('name, symbol, decimals', () => {
    let bToken;

    beforeEach(async () => {
      bToken = await makeBToken({ name: "BToken Foo", symbol: "cFOO", decimals: 10 });
    });

    it('should return correct name', async () => {
      expect(await call(bToken, 'name')).toEqual("BToken Foo");
    });

    it('should return correct symbol', async () => {
      expect(await call(bToken, 'symbol')).toEqual("cFOO");
    });

    it('should return correct decimals', async () => {
      expect(await call(bToken, 'decimals')).toEqualNumber(10);
    });
  });

  describe('balanceOfUnderlying', () => {
    it("has an underlying balance", async () => {
      const bToken = await makeBToken({ supportMarket: true, exchangeRate: 2 });
      await send(bToken, 'harnessSetBalance', [root, 100]);
      expect(await call(bToken, 'balanceOfUnderlying', [root])).toEqualNumber(200);
    });
  });

  describe('borrowRatePerBlock', () => {
    it("has a borrow rate", async () => {
      const bToken = await makeBToken({ supportMarket: true, interestRateModelOpts: { kind: 'jump-rate', baseRate: .05, multiplier: 0.45, kink: 0.95, jump: 5, roof: 1 } });
      const perBlock = await call(bToken, 'borrowRatePerBlock');
      expect(Math.abs(perBlock * 2102400 - 5e16)).toBeLessThanOrEqual(1e8);
    });

    it("has a borrow rate but excludes evil spell", async () => {
      const evilSpell = '0x560A8E3B79d23b0A525E15C6F3486c6A293DDAd2';
      const bToken = await makeBToken({ kind: 'bcollateralcapnointerest', supportMarket: true, interestRateModelOpts: { kind: 'jump-rate', baseRate: .05, multiplier: 0.45, kink: 0.95, jump: 5, roof: 1 } });

      // cash: 10000
      // borrows: 1000
      await send(bToken, 'harnessSetInternalCash', [10000]);
      await send(bToken, 'harnessSetTotalBorrows', [1000]);
      const perBlock1 = await call(bToken, 'borrowRatePerBlock');

      // cash: 10000
      // borrows: 2000 (1000 is from evil spell)
      await send(bToken, 'harnessSetTotalBorrows', [2000]);
      await send(bToken, 'harnessSetAccountBorrows', [evilSpell, 1000, 0]);
      const perBlock2 = await call(bToken, 'borrowRatePerBlock');
      expect(perBlock1).toEqual(perBlock2);
    });
  });

  describe('supplyRatePerBlock', () => {
    it("returns 0 if there's no supply", async () => {
      const bToken = await makeBToken({ supportMarket: true, interestRateModelOpts: { kind: 'jump-rate', baseRate: .05, multiplier: 0.45, kink: 0.95, jump: 5, roof: 1 } });
      const perBlock = await call(bToken, 'supplyRatePerBlock');
      await expect(perBlock).toEqualNumber(0);
    });

    it("has a supply rate", async () => {
      const baseRate = 0.05;
      const multiplier = 0.45;
      const kink = 0.95;
      const jump = 5 * multiplier;
      const roof = 1;
      const bToken = await makeBToken({ supportMarket: true, interestRateModelOpts: { kind: 'jump-rate', baseRate, multiplier: multiplier*kink, kink, jump, roof } });
      await send(bToken, 'harnessSetReserveFactorFresh', [etherMantissa(.01)]);
      await send(bToken, 'harnessExchangeRateDetails', [1, 1, 0]);
      await send(bToken, 'harnessSetExchangeRate', [etherMantissa(1)]);
      // Full utilization (Over the kink so jump is included), 1% reserves
      const borrowRate = baseRate + multiplier * kink + jump * .05;
      const expectedSuplyRate = borrowRate * .99;

      const perBlock = await call(bToken, 'supplyRatePerBlock');
      expect(Math.abs(perBlock * 2102400 - expectedSuplyRate * 1e18)).toBeLessThanOrEqual(1e8);
    });

    it("has a supply rate but excludes evil spell", async () => {
      const evilSpell = '0x560A8E3B79d23b0A525E15C6F3486c6A293DDAd2';
      const bToken = await makeBToken({ kind: 'bcollateralcapnointerest', supportMarket: true, interestRateModelOpts: { kind: 'jump-rate', baseRate: .05, multiplier: 0.45, kink: 0.95, jump: 5, roof: 1 } });

      // cash: 10000
      // borrows: 1000
      await send(bToken, 'harnessSetInternalCash', [10000]);
      await send(bToken, 'harnessSetTotalBorrows', [2000]);
      const perBlock1 = await call(bToken, 'supplyRatePerBlock');

      // cash: 10000
      // borrows: 2000 (1000 is from evil spell)
      await send(bToken, 'harnessSetTotalBorrows', [2000]);
      await send(bToken, 'harnessSetAccountBorrows', [evilSpell, 1000, 0]);
      const perBlock2 = await call(bToken, 'supplyRatePerBlock');
      expect(Number(perBlock1)).toBeGreaterThan(Number(perBlock2));
    });
  });

  describe("borrowBalanceCurrent", () => {
    let borrower;
    let bToken;

    beforeEach(async () => {
      borrower = accounts[0];
      bToken = await makeBToken();
    });

    beforeEach(async () => {
      await setBorrowRate(bToken, .001)
      await send(bToken.interestRateModel, 'setFailBorrowRate', [false]);
    });

    it("reverts if interest accrual fails", async () => {
      await send(bToken.interestRateModel, 'setFailBorrowRate', [true]);
      // make sure we accrue interest
      await send(bToken, 'harnessFastForward', [1]);
      await expect(send(bToken, 'borrowBalanceCurrent', [borrower])).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns successful result from borrowBalanceStored with no interest", async () => {
      await setBorrowRate(bToken, 0);
      await pretendBorrow(bToken, borrower, 1, 1, 5e18);
      expect(await call(bToken, 'borrowBalanceCurrent', [borrower])).toEqualNumber(5e18)
    });

    it("returns successful result from borrowBalanceCurrent with no interest", async () => {
      await setBorrowRate(bToken, 0);
      await pretendBorrow(bToken, borrower, 1, 3, 5e18);
      expect(await send(bToken, 'harnessFastForward', [5])).toSucceed();
      expect(await call(bToken, 'borrowBalanceCurrent', [borrower])).toEqualNumber(5e18 * 3)
    });
  });

  describe("borrowBalanceStored", () => {
    let borrower;
    let bToken;

    beforeEach(async () => {
      borrower = accounts[0];
      bToken = await makeBToken({ comptrollerOpts: { kind: 'bool' } });
    });

    it("returns 0 for account with no borrows", async () => {
      expect(await call(bToken, 'borrowBalanceStored', [borrower])).toEqualNumber(0)
    });

    it("returns stored principal when account and market indexes are the same", async () => {
      await pretendBorrow(bToken, borrower, 1, 1, 5e18);
      expect(await call(bToken, 'borrowBalanceStored', [borrower])).toEqualNumber(5e18);
    });

    it("returns calculated balance when market index is higher than account index", async () => {
      await pretendBorrow(bToken, borrower, 1, 3, 5e18);
      expect(await call(bToken, 'borrowBalanceStored', [borrower])).toEqualNumber(5e18 * 3);
    });

    it("has undefined behavior when market index is lower than account index", async () => {
      // The market index < account index should NEVER happen, so we don't test this case
    });

    it("reverts on overflow of principal", async () => {
      await pretendBorrow(bToken, borrower, 1, 3, UInt256Max());
      await expect(call(bToken, 'borrowBalanceStored', [borrower])).rejects.toRevert("revert multiplication overflow");
    });

    it("reverts on non-zero stored principal with zero account index", async () => {
      await pretendBorrow(bToken, borrower, 0, 3, 5);
      await expect(call(bToken, 'borrowBalanceStored', [borrower])).rejects.toRevert("revert divide by zero");
    });
  });

  describe('exchangeRateStored', () => {
    let bToken, exchangeRate = 2;

    beforeEach(async () => {
      bToken = await makeBToken({ exchangeRate });
    });

    it("returns initial exchange rate with zero bTokenSupply", async () => {
      const result = await call(bToken, 'exchangeRateStored');
      expect(result).toEqualNumber(etherMantissa(exchangeRate));
    });

    it("calculates with single bTokenSupply and single total borrow", async () => {
      const bTokenSupply = 1, totalBorrows = 1, totalReserves = 0;
      await send(bToken, 'harnessExchangeRateDetails', [bTokenSupply, totalBorrows, totalReserves]);
      const result = await call(bToken, 'exchangeRateStored');
      expect(result).toEqualNumber(etherMantissa(1));
    });

    it("calculates with bTokenSupply and total borrows", async () => {
      const bTokenSupply = 100e18, totalBorrows = 10e18, totalReserves = 0;
      await send(bToken, 'harnessExchangeRateDetails', [bTokenSupply, totalBorrows, totalReserves].map(etherUnsigned));
      const result = await call(bToken, 'exchangeRateStored');
      expect(result).toEqualNumber(etherMantissa(.1));
    });

    it("calculates with cash and bTokenSupply", async () => {
      const bTokenSupply = 5e18, totalBorrows = 0, totalReserves = 0;
      expect(
        await send(bToken.underlying, 'transfer', [bToken._address, etherMantissa(500)])
      ).toSucceed();
      await send(bToken, 'harnessExchangeRateDetails', [bTokenSupply, totalBorrows, totalReserves].map(etherUnsigned));
      const result = await call(bToken, 'exchangeRateStored');
      expect(result).toEqualNumber(etherMantissa(100));
    });

    it("calculates with cash, borrows, reserves and bTokenSupply", async () => {
      const bTokenSupply = 500e18, totalBorrows = 500e18, totalReserves = 5e18;
      expect(
        await send(bToken.underlying, 'transfer', [bToken._address, etherMantissa(500)])
      ).toSucceed();
      await send(bToken, 'harnessExchangeRateDetails', [bTokenSupply, totalBorrows, totalReserves].map(etherUnsigned));
      const result = await call(bToken, 'exchangeRateStored');
      expect(result).toEqualNumber(etherMantissa(1.99));
    });
  });

  describe('getCash', () => {
    it("gets the cash", async () => {
      const bToken = await makeBToken();
      const result = await call(bToken, 'getCash');
      expect(result).toEqualNumber(0);
    });
  });
});
