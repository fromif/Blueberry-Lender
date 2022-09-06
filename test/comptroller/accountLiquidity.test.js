const { expect } = require("chai");
const { ethers } = require("hardhat");
const { CONTRACT_NAMES } = require("../../constants");
const {
  makeBToken,
  enterMarkets,
  quickMint,
  makeComptroller,
} = require("../utils/compound");
const { UInt256Max } = require("../utils/ethereum");

describe("Comptroller", () => {
  let root, accounts;

  beforeEach(async () => {
    [root, ...accounts] = await ethers.getSigners();
  });

  describe("liquidity", () => {
    it("fails if a price has not been set", async () => {
      const user = accounts[1],
        amount = 1e6;
      const bToken = await makeBToken({ supportMarket: true });
      await enterMarkets([bToken], user);
      await quickMint(bToken, user, amount);
      const comptrollerAddr = await bToken.comptroller();
      const Comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        comptrollerAddr
      );
      await expect(
        Comptroller.getAccountLiquidity(user.address)
      ).to.be.revertedWith("price error");
    });

    it("allows a borrow up to collateralFactor, but not more", async () => {
      const collateralFactor = 0.5,
        underlyingPrice = 1,
        user = accounts[1],
        amount = 1e6;
      const bToken = await makeBToken({
        supportMarket: true,
        collateralFactor,
        underlyingPrice,
      });

      let error, liquidity, shortfall;

      // not in market yet, hypothetical borrow should have no effect
      const comptrollerAddr = await bToken.comptroller();
      const Comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        comptrollerAddr
      );
      [, liquidity, shortfall] =
        await Comptroller.getHypotheticalAccountLiquidity(
          user.address,
          bToken.address,
          0,
          amount
        );
      expect(liquidity).to.be.equal(0);
      expect(shortfall).to.be.equal(0);

      await enterMarkets([bToken], user);
      await quickMint(bToken, user, amount);

      // total account liquidity after supplying `amount`
      [, liquidity, shortfall] = await Comptroller.getAccountLiquidity(
        user.address
      );
      expect(liquidity).to.be.equal(amount * collateralFactor);
      expect(shortfall).to.be.equal(0);

      // hypothetically borrow `amount`, should shortfall over collateralFactor
      [, liquidity, shortfall] =
        await Comptroller.getHypotheticalAccountLiquidity(
          user.address,
          bToken.address,
          0,
          amount
        );
      expect(liquidity).to.be.equal(0);
      expect(shortfall).to.be.equal(amount * (1 - collateralFactor));

      // hypothetically redeem `amount`, should be back to even
      [, liquidity, shortfall] =
        await Comptroller.getHypotheticalAccountLiquidity(
          user.address,
          bToken.address,
          amount,
          0
        );
      expect(liquidity).to.be.equal(0);
      expect(shortfall).to.be.equal(0);
    }, 20000);

    it("allows entering 3 markets, supplying to 2 and borrowing up to collateralFactor in the 3rd", async () => {
      const amount1 = 1e6,
        amount2 = 1e3,
        user = accounts[1];
      const cf1 = 0.5,
        cf2 = 0.666,
        cf3 = 0,
        up1 = 3,
        up2 = 2.718,
        up3 = 1;
      const c1 = amount1 * cf1 * up1,
        c2 = amount2 * cf2 * up2,
        collateral = Math.floor(c1 + c2);
      const bToken1 = await makeBToken({
        supportMarket: true,
        collateralFactor: cf1,
        underlyingPrice: up1,
      });
      const bToken1ComptrollerAddr = await bToken1.comptroller();
      const bToken1Comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        bToken1ComptrollerAddr
      );
      const bToken2 = await makeBToken({
        supportMarket: true,
        comptroller: bToken1Comptroller,
        collateralFactor: cf2,
        underlyingPrice: up2,
      });
      const bToken3 = await makeBToken({
        supportMarket: true,
        comptroller: bToken1Comptroller,
        collateralFactor: cf3,
        underlyingPrice: up3,
      });

      await enterMarkets([bToken1, bToken2, bToken3], user);
      await quickMint(bToken1, user, amount1);
      await quickMint(bToken2, user, amount2);

      const bToken3ComptrollerAddr = await bToken3.comptroller();
      const bToken3Comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        bToken3ComptrollerAddr
      );

      let error, liquidity, shortfall;

      [error, liquidity, shortfall] =
        await bToken3Comptroller.getAccountLiquidity(user.address);
      expect(error).to.be.equal(0);
      expect(liquidity).to.be.equal(collateral);
      expect(shortfall).to.be.equal(0);

      [error, liquidity, shortfall] =
        await bToken3Comptroller.getHypotheticalAccountLiquidity(
          user.address,
          bToken3.address,
          Math.floor(c2),
          0
        );
      expect(liquidity).to.be.equal(collateral);
      expect(shortfall).to.be.equal(0);

      [error, liquidity, shortfall] =
        await bToken3Comptroller.getHypotheticalAccountLiquidity(
          user.address,
          bToken3.address,
          0,
          Math.floor(c2)
        );
      expect(liquidity).to.be.equal(c1);
      expect(shortfall).to.be.equal(0);

      [error, liquidity, shortfall] =
        await bToken3Comptroller.getHypotheticalAccountLiquidity(
          user.address,
          bToken3.address,
          0,
          collateral + c1
        );
      expect(liquidity).to.be.equal(0);
      expect(shortfall).to.be.equal(c1);

      [error, liquidity, shortfall] =
        await bToken1Comptroller.getHypotheticalAccountLiquidity(
          user.address,
          bToken1.address,
          amount1,
          0
        );
      expect(liquidity).to.be.equal(Math.floor(c2));
      expect(shortfall).to.be.equal(0);
    });
  });

  describe("getAccountLiquidity", () => {
    it("returns 0 if not 'in' any markets", async () => {
      const comptroller = await makeComptroller();
      const [error, liquidity, shortfall] =
        await comptroller.getAccountLiquidity(accounts[0].address);
      expect(error).to.be.equal(0);
      expect(liquidity).to.be.equal(0);
      expect(shortfall).to.be.equal(0);
    });
  });

  describe("getHypotheticalAccountLiquidity", () => {
    it("returns 0 if not 'in' any markets", async () => {
      const bToken = await makeBToken();
      const comptrollerAddr = await bToken.comptroller();
      const Comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        comptrollerAddr
      );
      const [error, liquidity, shortfall] =
        await Comptroller.getHypotheticalAccountLiquidity(
          accounts[0].address,
          bToken.address,
          0,
          0
        );
      expect(error).to.be.equal(0);
      expect(liquidity).to.be.equal(0);
      expect(shortfall).to.be.equal(0);
    });
    it("returns collateral factor times dollar amount of tokens minted in a single market", async () => {
      const collateralFactor = 0.5,
        exchangeRate = 1,
        underlyingPrice = 1;
      const bToken = await makeBToken({
        supportMarket: true,
        collateralFactor,
        exchangeRate,
        underlyingPrice,
      });
      const from = accounts[0],
        balance = 1e7,
        amount = 1e6;
      await enterMarkets([bToken], from);

      const underlyingAddr = await bToken.underlying();
      const Underlying = await ethers.getContractAt(
        CONTRACT_NAMES.ERC20_HARNESS,
        underlyingAddr
      );
      await Underlying.connect(from).harnessSetBalance(from.address, balance);
      await Underlying.connect(from).approve(bToken.address, balance);
      await bToken.connect(from).mint(amount);

      const comptrollerAddr = await bToken.comptroller();
      const Comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        comptrollerAddr
      );
      const [error, liquidity, shortfall] =
        await Comptroller.getHypotheticalAccountLiquidity(
          from.address,
          bToken.address,
          0,
          0
        );
      expect(error).to.be.equal(0);
      expect(liquidity).to.be.equal(
        amount * collateralFactor * exchangeRate * underlyingPrice
      );
      expect(shortfall).to.be.equal(0);
    });
  });
});
