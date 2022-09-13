const { expect } = require("chai");
const { ethers } = require("hardhat");
const { CONTRACT_NAMES } = require("../../constants");
const {
  makeInterestRateModel,
  makeBToken,
  fastForward,
} = require("../utils/compound");

describe("BToken", function () {
  let root, accounts;
  let newModel;
  beforeEach(async () => {
    [root, ...accounts] = await ethers.getSigners();
    newModel = await makeInterestRateModel();
  });

  describe("_setInterestRateModelFresh", () => {
    let bToken, oldModel;
    beforeEach(async () => {
      bToken = await makeBToken();
      let oldModelAddr = await bToken.interestRateModel();
      oldModel = await ethers.getContractAt(
        CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
        oldModelAddr
      );
      expect(oldModel.address).to.be.not.equal(newModel.address);
    });

    it("fails if called by non-admin", async () => {
      await expect(
        bToken
          .connect(accounts[0])
          .harnessSetInterestRateModelFresh(newModel.address)
      )
        .to.emit(bToken, "Failure")
        .withArgs(1, 44, 0);
      expect(await bToken.interestRateModel()).to.be.equal(oldModel.address);
    });

    it("fails if market is stale", async () => {
      await bToken.harnessFastForward(5);
      await expect(bToken.harnessSetInterestRateModelFresh(newModel.address))
        .to.emit(bToken, "Failure")
        .withArgs(10, 43, 0);
      expect(await bToken.interestRateModel()).to.be.equal(oldModel.address);
    });

    it("reverts if passed a contract that doesn't implement isInterestRateModel", async () => {
      const bTokenUnderlyingAddr = await bToken.underlying();
      await expect(
        bToken.harnessSetInterestRateModelFresh(bTokenUnderlyingAddr)
      ).to.be.revertedWithoutReason();
      expect(await bToken.interestRateModel()).to.be.equal(oldModel.address);
    });

    it("reverts if passed a contract that implements isInterestRateModel as false", async () => {
      // extremely unlikely to occur, of course, but let's be exhaustive
      const badModel = await makeInterestRateModel({ kind: "false-marker" });
      await expect(
        bToken.harnessSetInterestRateModelFresh(badModel.address)
      ).to.be.revertedWith("invalid IRM");
      expect(await bToken.interestRateModel()).to.be.equal(oldModel.address);
    });

    it("accepts new valid interest rate model", async () => {
      await bToken.harnessSetInterestRateModelFresh(newModel.address);
      expect(await bToken.interestRateModel()).to.be.equal(newModel.address);
    });

    it("emits expected log when accepting a new valid interest rate model", async () => {
      await expect(bToken.harnessSetInterestRateModelFresh(newModel.address))
        .to.emit(bToken, "NewMarketInterestRateModel")
        .withArgs(oldModel.address, newModel.address);
      expect(await bToken.interestRateModel()).to.be.equal(newModel.address);
    });
  });

  describe("_setInterestRateModel", () => {
    let bToken, interestRateModel;
    beforeEach(async () => {
      bToken = await makeBToken();
    });

    beforeEach(async () => {
      const interestRateModelAddr = await bToken.interestRateModel();
      interestRateModel = await ethers.getContractAt(
        CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
        interestRateModelAddr
      );
      await interestRateModel.setFailBorrowRate(false);
    });

    it("emits a set market interest rate model failure if interest accrual fails", async () => {
      await interestRateModel.setFailBorrowRate(true);
      await fastForward(bToken, 1);
      await expect(
        bToken._setInterestRateModel(newModel.address)
      ).to.be.revertedWith("INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from _setInterestRateModelFresh without emitting any extra logs", async () => {
      await expect(
        bToken.connect(accounts[0])._setInterestRateModel(newModel.address)
      )
        .to.emit(bToken, "Failure")
        .withArgs(1, 44, 0);
    });

    it("reports success when _setInterestRateModelFresh succeeds", async () => {
      await bToken._setInterestRateModel(newModel.address);
      expect(await bToken.interestRateModel()).to.be.equal(newModel.address);
    });
  });
});
