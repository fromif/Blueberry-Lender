const { expect } = require("chai");
const { ethers } = require("hardhat");
const { makeBToken } = require("../utils/compound");

const exchangeRate = 50e3;

describe("BToken", function () {
  let root, admin, accounts;
  let bToken;

  beforeEach(async () => {
    [root, admin, ...accounts] = await ethers.getSigners();
    bToken = await makeBToken({
      kind: "bcollateralcap",
      comptrollerOpts: { kind: "bool" },
      exchangeRate,
    });
  });

  it("fails to register collateral for non comptroller", async () => {
    await expect(bToken.registerCollateral(root.address)).to.be.revertedWith(
      "comptroller only"
    );
  });

  it("fails to unregister collateral for non comptroller", async () => {
    await expect(bToken.unregisterCollateral(root.address)).to.be.revertedWith(
      "comptroller only"
    );
  });
});
