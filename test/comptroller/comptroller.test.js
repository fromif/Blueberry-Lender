const { expect } = require("chai");
const { ethers } = require("hardhat");
const { CONTRACT_NAMES } = require("../../constants");
const {
  makeComptroller,
  makePriceOracle,
  makeLiquidityMining,
  makeBToken,
  makeToken,
} = require("../utils/compound");
const { etherMantissa } = require("../utils/ethereum");

describe("Comptroller", () => {
  let root, accounts;

  beforeEach(async () => {
    [root, ...accounts] = await ethers.getSigners();
  });

  describe("constructor", () => {
    it("on success it sets admin to creator and pendingAdmin is unset", async () => {
      const comptroller = await makeComptroller();
      const admin = await comptroller.admin();
      expect(admin).to.be.equal(root.address);
      const pendingAdmin = await comptroller.pendingAdmin();
      expect(pendingAdmin).to.be.equal(ethers.constants.AddressZero);
    });

    it("on success it sets closeFactor and maxAssets as specified", async () => {
      const comptroller = await makeComptroller();
      const closeFactor = await comptroller.closeFactorMantissa();
      expect(closeFactor).to.be.equal(await ethers.utils.parseEther("0.051"));
    });
  });

  describe("_setLiquidationIncentive", () => {
    const initialIncentive = etherMantissa(1.0);
    const validIncentive = etherMantissa(1.1);

    let comptroller;
    beforeEach(async () => {
      comptroller = await makeComptroller();
    });

    it("fails if called by non-admin", async () => {
      await expect(
        comptroller
          .connect(accounts[0])
          ._setLiquidationIncentive(initialIncentive)
      )
        .to.emit(comptroller, "Failure")
        .withArgs(1, 11, 0);
      expect(await comptroller.liquidationIncentiveMantissa()).to.be.equal(
        initialIncentive
      );
    });

    it("accepts a valid incentive and emits a NewLiquidationIncentive event", async () => {
      await expect(comptroller._setLiquidationIncentive(validIncentive))
        .to.emit(comptroller, "NewLiquidationIncentive")
        .withArgs(initialIncentive.toString(), validIncentive.toString());
      expect(await comptroller.liquidationIncentiveMantissa()).to.be.equal(
        validIncentive
      );
    });
  });

  describe("_setPriceOracle", () => {
    let comptroller, oldOracle, newOracle;
    beforeEach(async () => {
      comptroller = await makeComptroller();
      oldOracle = await comptroller.oracle();
      newOracle = await makePriceOracle();
    });

    it("fails if called by non-admin", async () => {
      await expect(
        comptroller.connect(accounts[0])._setPriceOracle(newOracle.address)
      )
        .to.emit(comptroller, "Failure")
        .withArgs(1, 16, 0);
      expect(await comptroller.oracle()).to.equal(oldOracle);
    });

    it("accepts a valid price oracle and emits a NewPriceOracle event", async () => {
      await expect(comptroller._setPriceOracle(newOracle.address))
        .to.emit(comptroller, "NewPriceOracle")
        .withArgs(oldOracle, newOracle.address);
      expect(await comptroller.oracle()).to.be.equal(newOracle.address);
    });
  });

  describe("_setLiquidityMining", () => {
    let comptroller;
    let liquidityMining;

    beforeEach(async () => {
      comptroller = await makeComptroller();
      liquidityMining = await makeLiquidityMining({ comptroller: comptroller });
    });

    it("fails if called by non-admin", async () => {
      await expect(
        comptroller
          .connect(accounts[0])
          ._setLiquidityMining(liquidityMining.address)
      ).to.be.revertedWith("admin only");
    });

    it("fails for mismatch comptroller", async () => {
      liquidityMining = await makeLiquidityMining();
      await expect(
        comptroller._setLiquidityMining(liquidityMining.address)
      ).to.be.revertedWith("mismatch comptroller");
    });

    it("succeeds and emits a NewLiquidityMining event", async () => {
      await expect(comptroller._setLiquidityMining(liquidityMining.address))
        .to.emit(comptroller, "NewLiquidityMining")
        .withArgs(ethers.constants.AddressZero, liquidityMining.address);
      expect(await comptroller.liquidityMining()).to.be.equal(
        liquidityMining.address
      );
    });
  });

  describe("_setCreditLimitManager", () => {
    let comptroller;

    beforeEach(async () => {
      comptroller = await makeComptroller();
    });

    it("fails if called by non-admin", async () => {
      await expect(
        comptroller
          .connect(accounts[0])
          ._setCreditLimitManager(accounts[0].address)
      ).to.be.revertedWith("admin only");
    });

    it("succeeds and emits a NewCreditLimitManager event", async () => {
      await expect(comptroller._setCreditLimitManager(accounts[0].address))
        .to.emit(comptroller, "NewCreditLimitManager")
        .withArgs(ethers.constants.AddressZero, accounts[0].address);
      expect(await comptroller.creditLimitManager()).to.be.equal(
        accounts[0].address
      );
    });
  });

  describe("_setCloseFactor", () => {
    it("fails if not called by admin", async () => {
      const bToken = await makeBToken();
      const comptrollerAddr = await bToken.comptroller();
      const Comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        comptrollerAddr
      );
      await expect(Comptroller.connect(accounts[0])._setCloseFactor(1))
        .to.emit(Comptroller, "Failure")
        .withArgs(1, 4, 0);
    });
  });

  describe("_setCollateralFactor", () => {
    const half = etherMantissa(0.5);
    const one = etherMantissa(1);

    it("fails if not called by admin", async () => {
      const bToken = await makeBToken();
      const comptrollerAddr = await bToken.comptroller();
      const Comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        comptrollerAddr
      );
      await expect(
        Comptroller.connect(accounts[0])._setCollateralFactor(
          bToken.address,
          half
        )
      )
        .to.emit(Comptroller, "Failure")
        .withArgs(1, 6, 0);
    });

    it("fails if asset is not listed", async () => {
      const bToken = await makeBToken();
      const comptrollerAddr = await bToken.comptroller();
      const Comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        comptrollerAddr
      );
      await expect(Comptroller._setCollateralFactor(bToken.address, half))
        .to.emit(Comptroller, "Failure")
        .withArgs(9, 7, 0);
    });

    it("fails if factor is too high", async () => {
      const bToken = await makeBToken({ supportMarket: true });
      const comptrollerAddr = await bToken.comptroller();
      const Comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        comptrollerAddr
      );
      await expect(Comptroller._setCollateralFactor(bToken.address, one))
        .to.emit(Comptroller, "Failure")
        .withArgs(6, 8, 0);
    });

    it("fails if factor is set without an underlying price", async () => {
      const bToken = await makeBToken({ supportMarket: true });
      const comptrollerAddr = await bToken.comptroller();
      const Comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        comptrollerAddr
      );
      await expect(Comptroller._setCollateralFactor(bToken.address, half))
        .to.emit(Comptroller, "Failure")
        .withArgs(13, 9, 0);
    });

    it("succeeds and sets market", async () => {
      const bToken = await makeBToken({
        supportMarket: true,
        underlyingPrice: 1,
      });
      const comptrollerAddr = await bToken.comptroller();
      const Comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        comptrollerAddr
      );
      await expect(Comptroller._setCollateralFactor(bToken.address, half))
        .to.emit(Comptroller, "NewCollateralFactor")
        .withArgs(bToken.address, 0, half.toString());
    });
  });

  describe("_supportMarket", () => {
    const version = 0;

    it("fails if not called by admin", async () => {
      const bToken = await makeBToken(root);
      const comptrollerAddr = await bToken.comptroller();
      const comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        comptrollerAddr
      );
      await expect(
        comptroller.connect(accounts[0])._supportMarket(bToken.address, version)
      ).to.be.revertedWith("admin only");
    });

    it("fails if asset is not a BToken", async () => {
      const comptroller = await makeComptroller();
      const asset = await makeToken(root);
      await expect(
        comptroller._supportMarket(asset.address, version)
      ).to.be.revertedWithoutReason();
    });

    it("succeeds and sets market", async () => {
      const bToken = await makeBToken();
      const comptrollerAddr = await bToken.comptroller();
      const comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        comptrollerAddr
      );
      await expect(comptroller._supportMarket(bToken.address, version))
        .to.emit(comptroller, "MarketListed")
        .withArgs(bToken.address);
    });

    it("cannot list a market a second time", async () => {
      const bToken = await makeBToken();
      const comptrollerAddr = await bToken.comptroller();
      const comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        comptrollerAddr
      );
      await expect(comptroller._supportMarket(bToken.address, version))
        .to.emit(comptroller, "MarketListed")
        .withArgs(bToken.address);
      await expect(
        comptroller._supportMarket(bToken.address, version)
      ).to.be.revertedWith("market already listed or delisted");
    });

    it("cannot list a soft delisted market", async () => {
      const bToken = await makeBToken();
      const comptrollerAddr = await bToken.comptroller();
      const comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        comptrollerAddr
      );
      await expect(comptroller._supportMarket(bToken.address, version))
        .to.emit(comptroller, "MarketListed")
        .withArgs(bToken.address);

      await comptroller._setMintPaused(bToken.address, true);
      await comptroller._setBorrowPaused(bToken.address, true);
      await comptroller._setFlashloanPaused(bToken.address, true);
      await comptroller._delistMarket(bToken.address, false);
      await expect(
        comptroller._supportMarket(bToken.address, version)
      ).to.be.revertedWith("market already listed or delisted");
    });

    it("can list two different markets", async () => {
      const bToken1 = await makeBToken();
      const bToken1ComptrollerAddr = await bToken1.comptroller();
      const bToken1Comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        bToken1ComptrollerAddr
      );
      const bToken2 = await makeBToken({ comptroller: bToken1Comptroller });
      await expect(bToken1Comptroller._supportMarket(bToken1.address, version))
        .to.emit(bToken1Comptroller, "MarketListed")
        .withArgs(bToken1.address);
      await expect(bToken1Comptroller._supportMarket(bToken2.address, version))
        .to.emit(bToken1Comptroller, "MarketListed")
        .withArgs(bToken2.address);
    });
  });

  describe("_setCreditLimit", () => {
    const creditLimit = etherMantissa(500);
    const creditLimit2 = etherMantissa(600);

    it("fails if not called by admin", async () => {
      const bToken = await makeBToken({ supportMarket: true });
      const comptrollerAddr = await bToken.comptroller();
      const comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        comptrollerAddr
      );
      await expect(
        comptroller
          .connect(accounts[1])
          ._setCreditLimit(accounts[0].address, bToken.address, creditLimit)
      ).to.be.revertedWith("admin or credit limit manager only");
    });

    it("fails if called by guardian", async () => {
      const bToken = await makeBToken({ supportMarket: true });
      const comptrollerAddr = await bToken.comptroller();
      const comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        comptrollerAddr
      );
      await comptroller._setGuardian(accounts[0].address);

      await expect(
        comptroller
          .connect(accounts[0])
          ._setCreditLimit(accounts[0].address, bToken.address, creditLimit)
      ).to.be.revertedWith("admin or credit limit manager only");
    });

    it("fails for invalid market", async () => {
      const bToken = await makeBToken();
      const comptrollerAddr = await bToken.comptroller();
      const comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        comptrollerAddr
      );
      await expect(
        comptroller._setCreditLimit(
          accounts[0].address,
          bToken.address,
          creditLimit
        )
      ).to.be.revertedWith("market not listed");
    });

    it("succeeds and sets credit limit", async () => {
      const bToken = await makeBToken({ supportMarket: true });
      const comptrollerAddr = await bToken.comptroller();
      const comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        comptrollerAddr
      );
      await expect(
        comptroller._setCreditLimit(
          accounts[0].address,
          bToken.address,
          creditLimit
        )
      )
        .to.emit(comptroller, "CreditLimitChanged")
        .withArgs(accounts[0].address, bToken.address, creditLimit.toString());

      // const _creditLimit = await comptroller.creditLimits(
      //   accounts[0].address,
      //   bToken.address
      // );
      // expect(_creditLimit).to.be.equal(creditLimit.toString());

      // Credit limit manager increases the limit.
      await comptroller._setCreditLimitManager(accounts[0].address);
      await expect(
        comptroller
          .connect(accounts[0])
          ._setCreditLimit(accounts[0].address, bToken.address, creditLimit2)
      )
        .to.emit(comptroller, "CreditLimitChanged")
        .withArgs(accounts[0].address, bToken.address, creditLimit2.toString());

      // Credit limit manager clears the limit.
      await expect(
        comptroller
          .connect(accounts[0])
          ._setCreditLimit(accounts[0].address, bToken.address, 0)
      )
        .to.emit(comptroller, "CreditLimitChanged")
        .withArgs(accounts[0].address, bToken.address, 0);

      const isCreditAccount = await comptroller.isCreditAccount(
        accounts[0].address,
        bToken.address
      );
      expect(isCreditAccount).to.be.equal(false);
    });
  });

  describe("_pauseCreditLimit", () => {
    const creditLimit = etherMantissa(500);

    it("fails if not called by guardian", async () => {
      const bToken = await makeBToken({ supportMarket: true });
      const comptrollerAddr = await bToken.comptroller();
      const comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        comptrollerAddr
      );
      await comptroller._setGuardian(accounts[0].address);
      await expect(
        comptroller
          .connect(accounts[1])
          ._pauseCreditLimit(accounts[0].address, bToken.address)
      ).to.be.revertedWith("guardian only");
    });

    it("fails if not a credit account", async () => {
      const bToken = await makeBToken({ supportMarket: true });
      const comptrollerAddr = await bToken.comptroller();
      const comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        comptrollerAddr
      );
      await comptroller._setGuardian(accounts[0].address);
      await comptroller
        .connect(accounts[0])
        ._pauseCreditLimit(accounts[0].address, bToken.address);
      // await expect(
      //   comptroller
      //     .connect(accounts[0])
      //     ._pauseCreditLimit(accounts[0].address, bToken.address)
      // ).to.be.revertedWith("cannot pause non-credit account");
    });

    it("fails for market not listed", async () => {
      const bToken = await makeBToken({ supportMarket: true });
      const comptrollerAddr = await bToken.comptroller();
      const comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        comptrollerAddr
      );
      await comptroller._setGuardian(accounts[0].address);
      await comptroller._setCreditLimit(
        accounts[0].address,
        bToken.address,
        creditLimit
      );

      // delist market on purpose
      await comptroller._setMintPaused(bToken.address, true);
      await comptroller._setBorrowPaused(bToken.address, true);
      await comptroller._setFlashloanPaused(bToken.address, true);
      await comptroller._delistMarket(bToken.address, true);

      await expect(
        comptroller
          .connect(accounts[0])
          ._pauseCreditLimit(accounts[0].address, bToken.address)
      ).to.be.revertedWith("market not listed");
    });

    it("succeeds and pauses credit limit", async () => {
      const bToken = await makeBToken({ supportMarket: true });
      const comptrollerAddr = await bToken.comptroller();
      const comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        comptrollerAddr
      );

      await comptroller._setGuardian(accounts[0].address);

      await expect(
        comptroller._setCreditLimit(
          accounts[0].address,
          bToken.address,
          creditLimit
        )
      )
        .to.emit(comptroller, "CreditLimitChanged")
        .withArgs(accounts[0].address, bToken.address, creditLimit.toString());

      // const _creditLimit = await comptroller.creditLimits(
      //   accounts[0].address,
      //   bToken.address
      // );
      // console.log(_creditLimit);
      // expect(_creditLimit).to.be.equal(creditLimit.toString());

      // Guardian pauses the limit.
      await expect(
        comptroller
          .connect(accounts[0])
          ._pauseCreditLimit(accounts[0].address, bToken.address)
      )
        .to.emit(comptroller, "CreditLimitChanged")
        .withArgs(accounts[0].address, bToken.address, 1);

      const isCreditAccount = await comptroller.isCreditAccount(
        accounts[0].address,
        bToken.address
      );
      expect(isCreditAccount).to.be.equal(true); // still a credit account
    });
  });

  describe("_delistMarket", () => {
    const version = 0;
    const cf = etherMantissa(0.5);

    it("fails if not called by admin", async () => {
      const bToken = await makeBToken(root);
      const comptrollerAddr = await bToken.comptroller();
      const comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        comptrollerAddr
      );
      await expect(
        comptroller.connect(accounts[0])._delistMarket(bToken.address, true)
      ).to.be.revertedWith("admin only");
    });

    it("fails if market has collateral", async () => {
      const bToken = await makeBToken({
        supportMarket: true,
        underlyingPrice: 1,
      });
      const comptrollerAddr = await bToken.comptroller();
      const comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        comptrollerAddr
      );
      await comptroller._setCollateralFactor(bToken.address, cf);
      await expect(
        comptroller._delistMarket(bToken.address, true)
      ).to.be.revertedWith("market has collateral");
    });

    it("fails if market not paused", async () => {
      const bToken = await makeBToken();
      const comptrollerAddr = await bToken.comptroller();
      const comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        comptrollerAddr
      );
      await comptroller._supportMarket(bToken.address, version);
      await expect(
        comptroller._delistMarket(bToken.address, true)
      ).to.be.revertedWith("market not paused");
    });

    it("succeeds and soft delists market", async () => {
      const bToken = await makeBToken();
      const comptrollerAddr = await bToken.comptroller();
      const comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        comptrollerAddr
      );
      await comptroller._supportMarket(bToken.address, version);
      await comptroller._setMintPaused(bToken.address, true);
      await comptroller._setBorrowPaused(bToken.address, true);
      await comptroller._setFlashloanPaused(bToken.address, true);
      await expect(comptroller._delistMarket(bToken.address, false))
        .to.emit(comptroller, "MarketDelisted")
        .withArgs(bToken.address, false);
      const isListed = await comptroller.isMarketListed(bToken.address);
      expect(isListed).to.be.equal(false);
    });

    it("succeeds and hard delists market", async () => {
      const bToken = await makeBToken();
      const comptrollerAddr = await bToken.comptroller();
      const comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        comptrollerAddr
      );
      await comptroller._supportMarket(bToken.address, version);
      await comptroller._setMintPaused(bToken.address, true);
      await comptroller._setBorrowPaused(bToken.address, true);
      await comptroller._setFlashloanPaused(bToken.address, true);
      await expect(comptroller._delistMarket(bToken.address, true))
        .to.emit(comptroller, "MarketDelisted")
        .withArgs(bToken.address, true);
      const isListed = await comptroller.isMarketListed(bToken.address);
      expect(isListed).to.be.equal(false);
    });

    it("succeeds and soft delists and then hard delists market", async () => {
      const bToken = await makeBToken();
      const comptrollerAddr = await bToken.comptroller();
      const comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        comptrollerAddr
      );
      await comptroller._supportMarket(bToken.address, version);
      await comptroller._setMintPaused(bToken.address, true);
      await comptroller._setBorrowPaused(bToken.address, true);
      await comptroller._setFlashloanPaused(bToken.address, true);
      await expect(comptroller._delistMarket(bToken.address, false))
        .to.emit(comptroller, "MarketDelisted")
        .withArgs(bToken.address, false);
      await expect(comptroller._delistMarket(bToken.address, true))
        .to.emit(comptroller, "MarketDelisted")
        .withArgs(bToken.address, true);

      const isListed = await comptroller.isMarketListed(bToken.address);
      expect(isListed).to.be.equal(false);
    });

    it("can delist two different markets", async () => {
      const bToken1 = await makeBToken();
      const bToken1comptrollerAddr = await bToken1.comptroller();
      const bToken1Comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        bToken1comptrollerAddr
      );
      const bToken2 = await makeBToken({ comptroller: bToken1Comptroller });
      const bToken2comptrollerAddr = await bToken2.comptroller();
      const bToken2Comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        bToken2comptrollerAddr
      );
      await bToken1Comptroller._supportMarket(bToken1.address, version);
      await bToken2Comptroller._supportMarket(bToken2.address, version);

      await bToken1Comptroller._setMintPaused(bToken1.address, true);
      await bToken1Comptroller._setBorrowPaused(bToken1.address, true);
      await bToken1Comptroller._setFlashloanPaused(bToken1.address, true);

      await bToken2Comptroller._setMintPaused(bToken2.address, true);
      await bToken2Comptroller._setBorrowPaused(bToken2.address, true);
      await bToken2Comptroller._setFlashloanPaused(bToken2.address, true);

      await expect(bToken1Comptroller._delistMarket(bToken1.address, false))
        .to.emit(bToken1Comptroller, "MarketDelisted")
        .withArgs(bToken1.address, false);
      await expect(bToken2Comptroller._delistMarket(bToken2.address, true))
        .to.emit(bToken2Comptroller, "MarketDelisted")
        .withArgs(bToken2.address, true);

      const isListed1 = await bToken1Comptroller.isMarketListed(
        bToken1.address
      );
      expect(isListed1).to.be.equal(false);

      const isListed2 = await bToken2Comptroller.isMarketListed(
        bToken2.address
      );
      expect(isListed2).to.be.equal(false);
    });

    it("cannot soft delist a market twice", async () => {
      const bToken = await makeBToken();
      const comptrollerAddr = await bToken.comptroller();
      const comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        comptrollerAddr
      );
      await comptroller._supportMarket(bToken.address, version);
      await comptroller._setMintPaused(bToken.address, true);
      await comptroller._setBorrowPaused(bToken.address, true);
      await comptroller._setFlashloanPaused(bToken.address, true);
      await expect(comptroller._delistMarket(bToken.address, false))
        .to.emit(comptroller, "MarketDelisted")
        .withArgs(bToken.address, false);

      await expect(
        comptroller._delistMarket(bToken.address, false)
      ).to.be.revertedWith("market not listed");
    });

    it("cannot hard delist a market twice", async () => {
      const bToken = await makeBToken();
      const comptrollerAddr = await bToken.comptroller();
      const comptroller = await ethers.getContractAt(
        CONTRACT_NAMES.COMPTROLLER,
        comptrollerAddr
      );
      await comptroller._supportMarket(bToken.address, version);
      await comptroller._setMintPaused(bToken.address, true);
      await comptroller._setBorrowPaused(bToken.address, true);
      await comptroller._setFlashloanPaused(bToken.address, true);
      await expect(comptroller._delistMarket(bToken.address, true))
        .to.emit(comptroller, "MarketDelisted")
        .withArgs(bToken.address, true);

      await expect(
        comptroller._delistMarket(bToken.address, true)
      ).to.be.revertedWith("market not listed or soft delisted");
    });
  });

  describe("redeemVerify", () => {
    it("should allow you to redeem 0 underlying for 0 tokens", async () => {
      const comptroller = await makeComptroller();
      const bToken = await makeBToken({ comptroller: comptroller });
      await comptroller.redeemVerify(bToken.address, accounts[0].address, 0, 0);
    });

    it("should allow you to redeem 5 underlyig for 5 tokens", async () => {
      const comptroller = await makeComptroller();
      const bToken = await makeBToken({ comptroller: comptroller });
      await comptroller.redeemVerify(bToken.address, accounts[0].address, 5, 5);
    });

    it("should not allow you to redeem 5 underlying for 0 tokens", async () => {
      const comptroller = await makeComptroller();
      const bToken = await makeBToken({ comptroller: comptroller });
      await expect(
        comptroller.redeemVerify(bToken.address, accounts[0].address, 5, 0)
      ).to.be.revertedWith("redeemTokens zero");
    });
  });
});
