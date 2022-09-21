const { expect } = require("chai");
const { ethers } = require("hardhat");
const { CONTRACT_NAMES } = require("../../constants");
const { makeBToken } = require("../utils/compound");
const { etherUnsigned } = require("../utils/ethereum");

const amount = etherUnsigned(10e4);

describe("BToken", function () {
  let bToken, root, admin, accounts;
  beforeEach(async () => {
    [root, admin, ...accounts] = await ethers.getSigners();
    bToken = await makeBToken({ comptrollerOpts: { kind: "bool" } });
  });

  describe("_setImplementation", () => {
    describe("bcapable", () => {
      let bCapableDelegate;
      beforeEach(async () => {
        const BCapableDelegate = await ethers.getContractFactory(
          CONTRACT_NAMES.BCAPABLE_ERC20_DELEGATE
        );
        bCapableDelegate = await BCapableDelegate.deploy();
      });

      it("fails due to non admin", async () => {
        bToken = await ethers.getContractAt(
          CONTRACT_NAMES.BERC20_DELEGATOR,
          bToken.address
        );
        await expect(
          bToken
            .connect(accounts[0])
            ._setImplementation(bCapableDelegate.address, true, "0x")
        ).to.be.revertedWith(
          "BErc20Delegator::_setImplementation: Caller must be admin"
        );
      });

      it("succeeds to have internal cash", async () => {
        const underlyingAddr = await bToken.underlying();
        const underlying = await ethers.getContractAt(
          CONTRACT_NAMES.ERC20_HARNESS,
          underlyingAddr
        );
        await underlying.harnessSetBalance(bToken.address, amount);

        bToken = await ethers.getContractAt(
          CONTRACT_NAMES.BERC20_DELEGATOR,
          bToken.address
        );

        await bToken._setImplementation(bCapableDelegate.address, true, "0x");

        bToken = await ethers.getContractAt(
          CONTRACT_NAMES.BCAPABLE_ERC20_DELEGATE,
          bToken.address
        );
        expect(await bToken.getCash()).to.be.equal(amount);
      });
    });

    describe("bCollateralCap", () => {
      let bCollateralCapDelegate;
      beforeEach(async () => {
        const BCollateralCapDelegate = await ethers.getContractFactory(
          CONTRACT_NAMES.BCOLLATERAL_CAP_ERC20_DELEGATE
        );
        bCollateralCapDelegate = await BCollateralCapDelegate.deploy();
      });

      it("fails due to non admin", async () => {
        bToken = await ethers.getContractAt(
          CONTRACT_NAMES.BERC20_DELEGATOR,
          bToken.address
        );
        await expect(
          bToken
            .connect(accounts[0])
            ._setImplementation(bCollateralCapDelegate.address, true, "0x")
        ).to.be.revertedWith(
          "BErc20Delegator::_setImplementation: Caller must be admin"
        );
      });

      it("succeeds to have internal cash", async () => {
        const underlyingAddr = await bToken.underlying();
        const underlying = await ethers.getContractAt(
          CONTRACT_NAMES.ERC20_HARNESS,
          underlyingAddr
        );
        await underlying.harnessSetBalance(bToken.address, amount);

        bToken = await ethers.getContractAt(
          CONTRACT_NAMES.BERC20_DELEGATOR,
          bToken.address
        );

        await bToken._setImplementation(
          bCollateralCapDelegate.address,
          true,
          "0x"
        );

        bToken = await ethers.getContractAt(
          CONTRACT_NAMES.BCOLLATERAL_CAP_ERC20_DELEGATE,
          bToken.address
        );
        expect(await bToken.getCash()).to.be.equal(amount);
      });
    });
  });
});
