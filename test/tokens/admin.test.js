const { expect } = require("chai");
const { ethers } = require("hardhat");
const { makeBToken } = require("../utils/compound");

describe("admin / _setPendingAdmin / _acceptAdmin", () => {
  let bToken, root, accounts;

  beforeEach(async () => {
    [root, ...accounts] = await ethers.getSigners();
    bToken = await makeBToken();
  });

  describe("admin()", () => {
    it("should return correct admin", async () => {
      expect(await bToken.admin()).to.be.equal(root.address);
    });
  });

  describe("pendingAdmin()", () => {
    it("should return correct pending admin", async () => {
      expect(await bToken.pendingAdmin()).to.be.equal(
        ethers.constants.AddressZero
      );
    });
  });

  describe("_setPendingAdmin()", () => {
    it("should only be callable by admin", async () => {
      await expect(
        bToken.connect(accounts[0])._setPendingAdmin(accounts[0].address)
      )
        .to.emit(bToken, "Failure")
        .withArgs(1, 47, 0);

      // Check admin stays the same
      expect(await bToken.admin()).to.be.equal(root.address);
      expect(await bToken.pendingAdmin()).to.be.equal(
        ethers.constants.AddressZero
      );
    });

    it("should properly set pending admin", async () => {
      await bToken._setPendingAdmin(accounts[0].address);

      // Check admin stays the same
      expect(await bToken.admin()).to.be.equal(root.address);
      expect(await bToken.pendingAdmin()).to.be.equal(accounts[0].address);
    });

    it("should properly set pending admin twice", async () => {
      await bToken._setPendingAdmin(accounts[0].address);
      await bToken._setPendingAdmin(accounts[1].address);

      // Check admin stays the same
      expect(await bToken.admin()).to.be.equal(root.address);
      expect(await bToken.pendingAdmin()).to.be.equal(accounts[1].address);
    });

    it("should emit event", async () => {
      await expect(bToken._setPendingAdmin(accounts[0].address))
        .to.emit(bToken, "NewPendingAdmin")
        .withArgs(ethers.constants.AddressZero, accounts[0].address);
    });
  });

  describe("_acceptAdmin()", () => {
    it("should fail when pending admin is zero", async () => {
      await expect(bToken._acceptAdmin())
        .to.emit(bToken, "Failure")
        .withArgs(1, 0, 0);

      // Check admin stays the same
      expect(await bToken.admin()).to.be.equal(root.address);
      expect(await bToken.pendingAdmin()).to.be.equal(
        ethers.constants.AddressZero
      );
    });

    it("should fail when called by another account (e.g. root)", async () => {
      await bToken._setPendingAdmin(accounts[0].address);
      await expect(bToken._acceptAdmin())
        .to.emit(bToken, "Failure")
        .withArgs(1, 0, 0);

      // Check admin stays the same
      expect(await bToken.admin()).to.be.equal(root.address);
      expect(await bToken.pendingAdmin()).to.be.equal(accounts[0].address);
    });

    it("should succeed and set admin and clear pending admin", async () => {
      await bToken._setPendingAdmin(accounts[0].address);
      await bToken.connect(accounts[0])._acceptAdmin();

      // Check admin stays the same
      expect(await bToken.admin()).to.be.equal(accounts[0].address);
      expect(await bToken.pendingAdmin()).to.be.equal(
        ethers.constants.AddressZero
      );
    });

    it("should emit log on success", async () => {
      await bToken._setPendingAdmin(accounts[0].address);
      await expect(bToken.connect(accounts[0])._acceptAdmin())
        .to.emit(bToken, "NewAdmin")
        .withArgs(root.address, accounts[0].address)
        .to.emit(bToken, "NewPendingAdmin")
        .withArgs(accounts[0].address, ethers.constants.AddressZero);
    });
  });
});
