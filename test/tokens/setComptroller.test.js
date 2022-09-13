const { expect } = require("chai");
const { ethers } = require("hardhat");
const { CONTRACT_NAMES } = require("../../constants");
const { makeBToken, makeComptroller } = require("../utils/compound");

describe("BToken", function () {
  let root, accounts;
  let bToken, oldComptroller, newComptroller;
  beforeEach(async () => {
    [root, ...accounts] = await ethers.getSigners();
    bToken = await makeBToken();
    let oldComptrollerAddr = await bToken.comptroller();
    oldComptroller = await ethers.getContractAt(
      CONTRACT_NAMES.COMPTROLLER_HARNESS,
      oldComptrollerAddr
    );
    newComptroller = await makeComptroller();
    expect(newComptroller.address).to.be.not.equal(oldComptroller.address);
  });

  describe("_setComptroller", () => {
    it("should fail if called by non-admin", async () => {
      await expect(
        bToken.connect(accounts[0])._setComptroller(newComptroller.address)
      )
        .to.emit(bToken, "Failure")
        .withArgs(1, 41, 0);
      expect(await bToken.comptroller()).to.be.equal(oldComptroller.address);
    });

    it("reverts if passed a contract that doesn't implement isComptroller", async () => {
      const bTokenUnderlyingAddr = await bToken.underlying();
      await expect(
        bToken._setComptroller(bTokenUnderlyingAddr)
      ).to.be.revertedWithoutReason();
      expect(await bToken.comptroller()).to.be.equal(oldComptroller.address);
    });

    it("reverts if passed a contract that implements isComptroller as false", async () => {
      // extremely unlikely to occur, of course, but let's be exhaustive
      const badComptroller = await makeComptroller({ kind: "false-marker" });
      await expect(
        bToken._setComptroller(badComptroller.address)
      ).to.be.revertedWith("not comptroller");
      expect(await bToken.comptroller()).to.be.equal(oldComptroller.address);
    });

    it("updates comptroller and emits log on success", async () => {
      await expect(bToken._setComptroller(newComptroller.address))
        .to.emit(bToken, "NewComptroller")
        .withArgs(oldComptroller.address, newComptroller.address);
      expect(await bToken.comptroller()).to.be.equal(newComptroller.address);
    });
  });
});
