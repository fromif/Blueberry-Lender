const { expect } = require("chai");
const { ethers } = require("hardhat");
const { CONTRACT_NAMES } = require("../../constants");
const { makePriceOracle } = require("../utils/compound");

describe("Unitroller", () => {
  let root, accounts;
  let unitroller;
  let brains;
  let oracle;

  beforeEach(async () => {
    [root, ...accounts] = await ethers.getSigners();
    oracle = await makePriceOracle();
    const Comptroller = await ethers.getContractFactory(
      CONTRACT_NAMES.COMPTROLLER
    );
    brains = await Comptroller.deploy();
    const Unitroller = await ethers.getContractFactory(
      CONTRACT_NAMES.UNITROLLER
    );
    unitroller = await Unitroller.deploy();
  });

  let setPending = (implementation, from) => {
    return unitroller
      .connect(from)
      ._setPendingImplementation(implementation.address);
  };

  describe("constructor", () => {
    it("sets admin to caller and addresses to 0", async () => {
      expect(await unitroller.admin()).to.be.equal(root.address);
      expect(await unitroller.pendingAdmin()).to.be.equal(
        ethers.constants.AddressZero
      );
      expect(await unitroller.pendingComptrollerImplementation()).to.be.equal(
        ethers.constants.AddressZero
      );
      expect(await unitroller.comptrollerImplementation()).to.be.equal(
        ethers.constants.AddressZero
      );
    });
  });

  describe("_setPendingImplementation", () => {
    describe("Check caller is admin", () => {
      let result;
      beforeEach(async () => {
        result = await setPending(brains, accounts[1]);
      });

      it("emits a failure log", async () => {
        expect(await result)
          .to.emit(brains, "Failure")
          .withArgs(1, 15, 0);
      });

      it("does not change pending implementation address", async () => {
        expect(await unitroller.pendingComptrollerImplementation()).to.be.equal(
          ethers.constants.AddressZero
        );
      });
    });

    describe("succeeding", () => {
      it("stores pendingComptrollerImplementation with value newPendingImplementation", async () => {
        await setPending(brains, root);
        expect(await unitroller.pendingComptrollerImplementation()).to.be.equal(
          brains.address
        );
      });

      it("emits NewPendingImplementation event", async () => {
        await expect(unitroller._setPendingImplementation(brains.address))
          .to.emit(unitroller, "NewPendingImplementation")
          .withArgs(ethers.constants.AddressZero, brains.address);
      });
    });
  });

  describe("_acceptImplementation", () => {
    describe("Check caller is pendingComptrollerImplementation and pendingComptrollerImplementation ≠ address(0) ", () => {
      let result;
      beforeEach(async () => {
        await setPending(unitroller, root);
        result = unitroller._acceptImplementation();
      });

      it("emits a failure log", async () => {
        await expect(result).to.emit(unitroller, "Failure").withArgs(1, 1, 0);
      });

      it("does not change current implementation address", async () => {
        expect(await unitroller.comptrollerImplementation()).not.to.be.equal(
          unitroller.address
        );
      });
    });

    describe("the brains must accept the responsibility of implementation", () => {
      beforeEach(async () => {
        await setPending(brains, root);
        await brains._become(unitroller.address);
      });

      it("Store comptrollerImplementation with value pendingComptrollerImplementation", async () => {
        expect(await unitroller.comptrollerImplementation()).to.be.equal(
          brains.address
        );
      });

      it("Unset pendingComptrollerImplementation", async () => {
        expect(await unitroller.pendingComptrollerImplementation()).to.be.equal(
          ethers.constants.AddressZero
        );
      });
    });

    describe("fallback delegates to brains", () => {
      let troll;
      beforeEach(async () => {
        const EchoTypesComptroller = await ethers.getContractFactory(
          CONTRACT_NAMES.ECHO_TYPES_COMPTROLLER
        );
        troll = await EchoTypesComptroller.deploy();
        await troll.deployed();
        const Unitroller = await ethers.getContractFactory(
          CONTRACT_NAMES.UNITROLLER
        );
        unitroller = await Unitroller.deploy();
        await unitroller.deployed();
        await setPending(troll, root);
        await troll.becomeBrains(unitroller.address);
        // troll.options.address = unitroller.address;
      });

      it("forwards reverts", async () => {
        await expect(troll.reverty()).to.be.revertedWith("gotcha sucka");
      });

      it("gets addresses", async () => {
        expect(await troll.addresses(troll.address)).to.be.equal(troll.address);
      });

      it("gets strings", async () => {
        expect(await troll.stringy("yeet")).to.be.equal("yeet");
      });

      it("gets bools", async () => {
        expect(await troll.booly(true)).to.be.equal(true);
      });

      it("gets list of ints", async () => {
        expect((await troll.listOInts([1, 2, 3])).toString()).to.be.equal(
          ["1", "2", "3"].toString()
        );
      });
    });
  });
});
