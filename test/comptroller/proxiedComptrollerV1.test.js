const { expect } = require("chai");
const { ethers } = require("hardhat");
const { CONTRACT_NAMES } = require("../../constants");
const { makePriceOracle, makeBToken } = require("../utils/compound");
const { etherMantissa } = require("../utils/ethereum");

describe("Comptroller", function () {
  let root, accounts;
  let unitroller;
  let brains;
  let oracle;

  beforeEach(async () => {
    [root, ...accounts] = await ethers.getSigners();
    oracle = await makePriceOracle();
    const ComptrollerG1 = await ethers.getContractFactory(
      CONTRACT_NAMES.COMPTROLLER_G1
    );
    brains = await ComptrollerG1.deploy();
    const Unitroller = await ethers.getContractFactory(
      CONTRACT_NAMES.UNITROLLER
    );
    unitroller = await Unitroller.deploy();
  });

  let initializeBrains = async (priceOracle, closeFactor) => {
    await unitroller._setPendingImplementation(brains.address);
    await brains._become(unitroller.address);
    // mergeInterface(unitroller, brains);
    await brains._setPriceOracle(priceOracle.address);
    await brains._setCloseFactor(closeFactor);
    return await ethers.getContractAt(
      CONTRACT_NAMES.COMPTROLLER_G1,
      brains.address
    );
  };

  let reinitializeBrains = async () => {
    await unitroller._setPendingImplementation(brains.address);
    await brains._become(unitroller.address);
    return await ethers.getContractAt(
      CONTRACT_NAMES.COMPTROLLER_G1,
      brains.address
    );
  };

  describe("delegating to comptroller v1", () => {
    const closeFactor = etherMantissa(0.051);
    let unitrollerAsComptroller, bToken;

    beforeEach(async () => {
      unitrollerAsComptroller = await initializeBrains(
        oracle,
        etherMantissa(0.06),
        30
      );
      bToken = await makeBToken({ comptroller: unitrollerAsComptroller });
    });

    describe("becoming brains sets initial state", () => {
      it("reverts if this is not the pending implementation", async () => {
        await expect(brains._become(unitroller.address)).to.be.revertedWith(
          "change not authorized"
        );
      });

      it("on success it sets admin to caller of constructor", async () => {
        expect(await unitrollerAsComptroller.admin()).to.be.equal(root.address);
        expect(await unitrollerAsComptroller.pendingAdmin()).to.be.equal(
          ethers.constants.AddressZero
        );
      });

      it("on success it sets closeFactor as specified", async () => {
        const comptroller = await initializeBrains(oracle, closeFactor);
        expect(await comptroller.closeFactorMantissa()).to.be.equal(
          closeFactor
        );
      });

      it("on reinitialization success, it doesn't set closeFactor", async () => {
        let comptroller = await initializeBrains(oracle, closeFactor);
        expect(await unitroller.comptrollerImplementation()).to.be.equal(
          brains.address
        );
        expect(await comptroller.closeFactorMantissa()).to.be.equal(
          closeFactor
        );

        comptroller = await reinitializeBrains();
        expect(await unitroller.comptrollerImplementation()).to.be.equal(
          brains.address
        );
        expect(await comptroller.closeFactorMantissa()).to.be.equal(
          closeFactor
        );
      });
    });

    describe("_setCollateralFactor", () => {
      const half = etherMantissa(0.5),
        one = etherMantissa(1);

      it("fails if not called by admin", async () => {
        await expect(
          unitrollerAsComptroller
            .connect(accounts[1])
            ._setCollateralFactor(bToken.address, half)
        )
          .to.emit(unitrollerAsComptroller, "Failure")
          .withArgs(1, 6, 0);
      });

      it("fails if asset is not listed", async () => {
        await expect(
          unitrollerAsComptroller._setCollateralFactor(bToken.address, half)
        )
          .to.emit(unitrollerAsComptroller, "Failure")
          .withArgs(9, 7, 0);
      });

      it("fails if factor is too high", async () => {
        const bToken = await makeBToken({
          comptroller: unitrollerAsComptroller,
        });
        await unitrollerAsComptroller._supportMarket(bToken.address); // old support market signature
        await expect(
          unitrollerAsComptroller._setCollateralFactor(bToken.address, one)
        )
          .to.emit(unitrollerAsComptroller, "Failure")
          .withArgs(6, 8, 0);
      });

      it("fails if factor is set without an underlying price", async () => {
        const bToken = await makeBToken({
          comptroller: unitrollerAsComptroller,
        });
        await unitrollerAsComptroller._supportMarket(bToken.address); // old support market signature
        await expect(
          unitrollerAsComptroller._setCollateralFactor(bToken.address, half)
        )
          .to.emit(unitrollerAsComptroller, "Failure")
          .withArgs(13, 9, 0);
      });

      it("succeeds and sets market", async () => {
        const bToken = await makeBToken({
          comptroller: unitrollerAsComptroller,
        });
        await unitrollerAsComptroller._supportMarket(bToken.address); // old support market signature
        await oracle.setUnderlyingPrice(bToken.address, 1);
        await expect(
          unitrollerAsComptroller._setCollateralFactor(bToken.address, half)
        )
          .to.emit(unitrollerAsComptroller, "NewCollateralFactor")
          .withArgs(bToken.address, 0, half.toString());
      });
    });

    describe("_supportMarket", () => {
      it("fails if not called by admin", async () => {
        // old support market signature
        await expect(
          unitrollerAsComptroller
            .connect(accounts[1])
            ._supportMarket(bToken.address)
        )
          .to.emit(unitrollerAsComptroller, "Failure")
          .withArgs(1, 18, 0);
      });

      it("fails if asset is not a BToken", async () => {
        const notABToken = await makePriceOracle();
        await expect(
          unitrollerAsComptroller._supportMarket(notABToken.address)
        ).to.be.revertedWithoutReason();
      });

      it("succeeds and sets market", async () => {
        await expect(unitrollerAsComptroller._supportMarket(bToken.address))
          .to.emit(unitrollerAsComptroller, "MarketListed")
          .withArgs(bToken.address);
      });

      it("cannot list a market a second time", async () => {
        await expect(unitrollerAsComptroller._supportMarket(bToken.address))
          .to.emit(unitrollerAsComptroller, "MarketListed")
          .withArgs(bToken.address);
        await expect(unitrollerAsComptroller._supportMarket(bToken.address))
          .to.emit(unitrollerAsComptroller, "Failure")
          .withArgs(10, 17, 0);
      });

      it("can list two different markets", async () => {
        const bToken1 = await makeBToken({ comptroller: unitroller });
        const bToken2 = await makeBToken({ comptroller: unitroller });
        await expect(unitrollerAsComptroller._supportMarket(bToken1.address))
          .to.emit(unitrollerAsComptroller, "MarketListed")
          .withArgs(bToken1.address);
        await expect(unitrollerAsComptroller._supportMarket(bToken2.address))
          .to.emit(unitrollerAsComptroller, "MarketListed")
          .withArgs(bToken2.address);
      });
    });
  });
});
