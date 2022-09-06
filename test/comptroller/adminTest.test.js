const { expect } = require("chai");
const { ethers } = require("hardhat");
const { CONTRACT_NAMES } = require("../../constants");

describe("admin / _setPendingAdmin / _acceptAdmin", () => {
  let root, accounts;
  let comptroller;
  beforeEach(async () => {
    [root, ...accounts] = await ethers.getSigners();
    const Comptroller = await ethers.getContractFactory(
      CONTRACT_NAMES.UNITROLLER
    );
    comptroller = await Comptroller.deploy();
    await comptroller.deployed();
  });

  describe("admin()", () => {
    it("should return correct admin", async () => {
      expect(await comptroller.admin()).to.be.equal(root.address);
    });
  });

  describe("pendingAdmin()", () => {
    it("should return correct pending admin", async () => {
      expect(await comptroller.pendingAdmin()).to.be.equal(
        ethers.constants.AddressZero
      );
    });
  });

  describe("_setPendingAdmin()", () => {
    it("should only be callable by admin", async () => {
      await comptroller
        .connect(accounts[0])
        ._setPendingAdmin(accounts[0].address);

      // Check admin stays the same
      expect(await comptroller.admin()).to.be.equal(root.address);
      expect(await comptroller.pendingAdmin()).to.be.equal(
        ethers.constants.AddressZero
      );
    });

    it("should properly set pending admin", async () => {
      await comptroller.connect(root)._setPendingAdmin(accounts[0].address);

      // Check admin stays the same
      expect(await comptroller.admin()).to.be.equal(root.address);
      expect(await comptroller.pendingAdmin()).to.be.equal(accounts[0].address);
    });

    it("should properly set pending admin twice", async () => {
      await comptroller.connect(root)._setPendingAdmin(accounts[0].address);
      await comptroller.connect(root)._setPendingAdmin(accounts[1].address);

      // Check admin stays the same
      expect(await comptroller.admin()).to.be.equal(root.address);
      expect(await comptroller.pendingAdmin()).to.be.equal(accounts[1].address);
    });

    it("should emit event", async () => {
      await expect(
        comptroller.connect(root)._setPendingAdmin(accounts[0].address)
      )
        .to.emit(comptroller, "NewPendingAdmin")
        .withArgs(ethers.constants.AddressZero, accounts[0].address);
    });
  });

  describe("_acceptAdmin()", () => {
    it("should fail when pending admin is zero", async () => {
      await comptroller.connect(root)._acceptAdmin();
      // Check admin stays the same
      expect(await comptroller.admin()).to.be.equal(root.address);
      expect(await comptroller.pendingAdmin()).to.be.equal(
        ethers.constants.AddressZero
      );
    });

    it("should fail when called by another account (e.g. root)", async () => {
      await comptroller.connect(root)._setPendingAdmin(accounts[0].address);
      await comptroller.connect(root)._acceptAdmin();
      // Check admin stays the same
      expect(await comptroller.admin()).to.be.equal(root.address);
      expect(await comptroller.pendingAdmin()).to.be.equal(accounts[0].address);
    });

    it("should succeed and set admin and clear pending admin", async () => {
      await comptroller.connect(root)._setPendingAdmin(accounts[0].address);
      await comptroller.connect(accounts[0])._acceptAdmin();
      // Check admin stays the same
      expect(await comptroller.admin()).to.be.equal(accounts[0].address);
      expect(await comptroller.pendingAdmin()).to.be.equal(
        ethers.constants.AddressZero
      );
    });

    it("should emit log on success", async () => {
      await comptroller.connect(root)._setPendingAdmin(accounts[0].address);
      await expect(comptroller.connect(accounts[0])._acceptAdmin())
        .to.emit(comptroller, "NewAdmin")
        .withArgs(root.address, accounts[0].address)
        .to.emit(comptroller, "NewPendingAdmin")
        .withArgs(accounts[0].address, ethers.constants.AddressZero);
    });
  });
});
