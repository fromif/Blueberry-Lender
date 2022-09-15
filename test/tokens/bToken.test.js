const { expect } = require("chai");
const { ethers } = require("hardhat");
const { CONTRACT_NAMES } = require("../../constants");
const {
  makeBToken,
  setBorrowRate,
  pretendBorrow,
} = require("../utils/compound");
const {
  etherMantissa,
  UInt256Max,
  etherUnsigned,
} = require("../utils/ethereum");

describe("BToken", function () {
  let root, admin, accounts;
  beforeEach(async () => {
    [root, admin, ...accounts] = await ethers.getSigners();
  });

  describe("constructor", () => {
    it("fails when non erc-20 underlying", async () => {
      await expect(
        makeBToken({ underlying: { address: root.address } })
      ).to.be.revertedWithoutReason();
    });

    it("fails when 0 initial exchange rate", async () => {
      await expect(makeBToken({ exchangeRate: 0 })).to.be.revertedWith(
        "invalid exchange rate"
      );
    });

    it("succeeds with erc-20 underlying and non-zero exchange rate", async () => {
      const bToken = await makeBToken();
      expect(await bToken.admin()).to.be.equal(root.address);
    });

    it("succeeds when setting admin to contructor argument", async () => {
      const bToken = await makeBToken({ admin: admin });
      expect(await bToken.admin()).to.be.equal(admin.address);
    });
  });

  describe("name, symbol, decimals", () => {
    let bToken;

    beforeEach(async () => {
      bToken = await makeBToken({
        name: "BToken Foo",
        symbol: "bFOO",
        decimals: 10,
      });
    });

    it("should return correct name", async () => {
      expect(await bToken.name()).to.be.equal("BToken Foo");
    });

    it("should return correct symbol", async () => {
      expect(await bToken.symbol()).to.be.equal("bFOO");
    });

    it("should return correct decimals", async () => {
      expect(await bToken.decimals()).to.be.equal(10);
    });
  });

  describe("balanceOfUnderlying", () => {
    it("has an underlying balance", async () => {
      const bToken = await makeBToken({ supportMarket: true, exchangeRate: 2 });
      await bToken.harnessSetBalance(root.address, 100);
      expect(
        await bToken.callStatic.balanceOfUnderlying(root.address)
      ).to.be.equal(200);
    });
  });

  describe("borrowRatePerBlock", () => {
    it("has a borrow rate", async () => {
      const bToken = await makeBToken({
        supportMarket: true,
        interestRateModelOpts: {
          kind: "jump-rate",
          baseRate: 0.05,
          multiplier: 0.45,
          kink: 0.95,
          jump: 5,
          roof: 1,
        },
      });
      const perBlock = await bToken.borrowRatePerBlock();
      expect(Math.abs(perBlock * 2102400 - 5e16)).to.be.lessThanOrEqual(1e8);
    });

    it("has a borrow rate but excludes evil spell", async () => {
      const evilSpell = "0x560A8E3B79d23b0A525E15C6F3486c6A293DDAd2";
      const bToken = await makeBToken({
        kind: "bcollateralcapnointerest",
        supportMarket: true,
        interestRateModelOpts: {
          kind: "jump-rate",
          baseRate: 0.05,
          multiplier: 0.45,
          kink: 0.95,
          jump: 5,
          roof: 1,
        },
      });

      // cash: 10000
      // borrows: 1000
      await bToken.harnessSetInternalCash(10000);
      await bToken.harnessSetTotalBorrows(1000);
      const perBlock1 = await bToken.borrowRatePerBlock();

      // cash: 10000
      // borrows: 2000 (1000 is from evil spell)
      await bToken.harnessSetTotalBorrows(2000);
      await bToken.harnessSetAccountBorrows(evilSpell, 1000, 0);
      const perBlock2 = await bToken.borrowRatePerBlock();
      expect(perBlock1).to.be.equal(perBlock2);
    });
  });

  describe("supplyRatePerBlock", () => {
    it("returns 0 if there's no supply", async () => {
      const bToken = await makeBToken({
        supportMarket: true,
        interestRateModelOpts: {
          kind: "jump-rate",
          baseRate: 0.05,
          multiplier: 0.45,
          kink: 0.95,
          jump: 5,
          roof: 1,
        },
      });
      const perBlock = await bToken.supplyRatePerBlock();
      await expect(perBlock).to.be.equal(0);
    });

    it("has a supply rate", async () => {
      const baseRate = 0.05;
      const multiplier = 0.45;
      const kink = 0.95;
      const jump = 5 * multiplier;
      const roof = 1;
      const bToken = await makeBToken({
        supportMarket: true,
        interestRateModelOpts: {
          kind: "jump-rate",
          baseRate,
          multiplier: multiplier * kink,
          kink,
          jump,
          roof,
        },
      });
      await bToken.harnessSetReserveFactorFresh(etherMantissa(0.01));
      await bToken.harnessExchangeRateDetails(1, 1, 0);
      await bToken.harnessSetExchangeRate(etherMantissa(1));
      // Full utilization (Over the kink so jump is included), 1% reserves
      const borrowRate = baseRate + multiplier * kink + jump * 0.05;
      const expectedSuplyRate = borrowRate * 0.99;

      const perBlock = await bToken.supplyRatePerBlock();
      expect(
        Math.abs(perBlock * 2102400 - expectedSuplyRate * 1e18)
      ).to.be.lessThanOrEqual(1e8);
    });

    it("has a supply rate but excludes evil spell", async () => {
      const evilSpell = "0x560A8E3B79d23b0A525E15C6F3486c6A293DDAd2";
      const bToken = await makeBToken({
        kind: "bcollateralcapnointerest",
        supportMarket: true,
        interestRateModelOpts: {
          kind: "jump-rate",
          baseRate: 0.05,
          multiplier: 0.45,
          kink: 0.95,
          jump: 5,
          roof: 1,
        },
      });

      // cash: 10000
      // borrows: 1000
      await bToken.harnessSetInternalCash(10000);
      await bToken.harnessSetTotalBorrows(2000);
      const perBlock1 = await bToken.supplyRatePerBlock();

      // cash: 10000
      // borrows: 2000 (1000 is from evil spell)
      await bToken.harnessSetTotalBorrows(2000);
      await bToken.harnessSetAccountBorrows(evilSpell, 1000, 0);
      const perBlock2 = await bToken.supplyRatePerBlock();
      expect(perBlock1).to.be.greaterThan(perBlock2);
    });
  });

  describe("borrowBalanceCurrent", () => {
    let borrower;
    let bToken, interestRateModel;

    beforeEach(async () => {
      borrower = accounts[0];
      bToken = await makeBToken();
      const interestRateModelAddr = await bToken.interestRateModel();
      interestRateModel = await ethers.getContractAt(
        CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
        interestRateModelAddr
      );
    });

    beforeEach(async () => {
      await setBorrowRate(bToken, 0.001);
      await interestRateModel.setFailBorrowRate(false);
    });

    it("reverts if interest accrual fails", async () => {
      await interestRateModel.setFailBorrowRate(true);
      // make sure we accrue interest
      await bToken.harnessFastForward(1);
      await expect(
        bToken.borrowBalanceCurrent(borrower.address)
      ).to.be.revertedWith("INTEREST_RATE_MODEL_ERROR");
    });

    it("returns successful result from borrowBalanceStored with no interest", async () => {
      await setBorrowRate(bToken, 0);
      await pretendBorrow(
        bToken,
        borrower.address,
        1,
        1,
        (5e18).toFixed().toString()
      );
      expect(
        await bToken.callStatic.borrowBalanceCurrent(borrower.address)
      ).to.be.equal((5e18).toFixed().toString());
    });

    it("returns successful result from borrowBalanceCurrent with no interest", async () => {
      await setBorrowRate(bToken, 0);
      await pretendBorrow(
        bToken,
        borrower.address,
        1,
        3,
        (5e18).toFixed().toString()
      );
      await bToken.harnessFastForward(5);
      expect(
        await bToken.callStatic.borrowBalanceCurrent(borrower.address)
      ).to.be.equal((15e18).toFixed().toString());
    });
  });

  describe("borrowBalanceStored", () => {
    let borrower;
    let bToken;

    beforeEach(async () => {
      borrower = accounts[0];
      bToken = await makeBToken({ comptrollerOpts: { kind: "bool" } });
    });

    it("returns 0 for account with no borrows", async () => {
      expect(
        await bToken.callStatic.borrowBalanceStored(borrower.address)
      ).to.be.equal(0);
    });

    it("returns stored principal when account and market indexes are the same", async () => {
      await pretendBorrow(
        bToken,
        borrower.address,
        1,
        1,
        (5e18).toFixed().toString()
      );
      expect(
        await bToken.callStatic.borrowBalanceStored(borrower.address)
      ).to.be.equal((5e18).toFixed().toString());
    });

    it("returns calculated balance when market index is higher than account index", async () => {
      await pretendBorrow(
        bToken,
        borrower.address,
        1,
        3,
        (5e18).toFixed().toString()
      );
      expect(
        await bToken.callStatic.borrowBalanceStored(borrower.address)
      ).to.be.equal((15e18).toFixed().toString());
    });

    it("reverts on overflow of principal", async () => {
      await pretendBorrow(bToken, borrower.address, 1, 3, UInt256Max());
      await expect(
        bToken.borrowBalanceStored(borrower.address)
      ).to.be.revertedWith("multiplication overflow");
    });

    it("reverts on non-zero stored principal with zero account index", async () => {
      await pretendBorrow(bToken, borrower.address, 0, 3, 5);
      await expect(
        bToken.borrowBalanceStored(borrower.address)
      ).to.be.revertedWith("divide by zero");
    });
  });

  describe("exchangeRateStored", () => {
    let bToken,
      exchangeRate = 2;

    beforeEach(async () => {
      bToken = await makeBToken({ exchangeRate });
    });

    it("returns initial exchange rate with zero bTokenSupply", async () => {
      const result = await bToken.exchangeRateStored();
      expect(result).to.be.equal(etherMantissa(exchangeRate));
    });

    it("calculates with single bTokenSupply and single total borrow", async () => {
      const bTokenSupply = 1,
        totalBorrows = 1,
        totalReserves = 0;
      await bToken.harnessExchangeRateDetails(
        bTokenSupply,
        totalBorrows,
        totalReserves
      );
      const result = await bToken.exchangeRateStored();
      expect(result).to.be.equal(etherMantissa(1));
    });

    it("calculates with bTokenSupply and total borrows", async () => {
      const bTokenSupply = (100e18).toLocaleString("fullwide", {
          useGrouping: false,
        }),
        totalBorrows = (10e18).toLocaleString("fullwide", {
          useGrouping: false,
        }),
        totalReserves = 0;
      await bToken.harnessExchangeRateDetails(
        bTokenSupply,
        totalBorrows,
        totalReserves
      );
      const result = await bToken.exchangeRateStored();
      expect(result).to.be.equal(etherMantissa(0.1));
    });

    it("calculates with cash and bTokenSupply", async () => {
      const bTokenSupply = (5e18).toLocaleString("fullwide", {
          useGrouping: false,
        }),
        totalBorrows = 0,
        totalReserves = 0;
      const underlyingAddr = await bToken.underlying();
      const underlying = await ethers.getContractAt(
        CONTRACT_NAMES.ERC20_HARNESS,
        underlyingAddr
      );
      await underlying.transfer(bToken.address, etherMantissa(500));
      await bToken.harnessExchangeRateDetails(
        bTokenSupply,
        totalBorrows,
        totalReserves
      );
      const result = await bToken.exchangeRateStored();
      expect(result).to.be.equal(etherMantissa(100));
    });

    it("calculates with cash, borrows, reserves and bTokenSupply", async () => {
      const bTokenSupply = (500e18).toLocaleString("fullwide", {
          useGrouping: false,
        }),
        totalBorrows = (500e18).toLocaleString("fullwide", {
          useGrouping: false,
        }),
        totalReserves = (5e18).toLocaleString("fullwide", {
          useGrouping: false,
        });
      const underlyingAddr = await bToken.underlying();
      const underlying = await ethers.getContractAt(
        CONTRACT_NAMES.ERC20_HARNESS,
        underlyingAddr
      );
      await underlying.transfer(bToken.address, etherMantissa(500));
      await bToken.harnessExchangeRateDetails(
        bTokenSupply,
        totalBorrows,
        totalReserves
      );
      const result = await bToken.exchangeRateStored();
      expect(result).to.be.equal(etherMantissa(1.99));
    });
  });

  describe("getCash", () => {
    it("gets the cash", async () => {
      const bToken = await makeBToken();
      const result = await bToken.getCash();
      expect(result).to.be.equal(0);
    });
  });
});
