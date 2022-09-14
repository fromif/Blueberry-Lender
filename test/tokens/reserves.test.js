const { expect } = require("chai");
const { ethers } = require("hardhat");
const { CONTRACT_NAMES } = require("../../constants");
const { makeBToken, fastForward } = require("../utils/compound");
const { etherMantissa, etherUnsigned } = require("../utils/ethereum");

const factor = etherMantissa(0.02);

const reserves = etherUnsigned(3e12);
const cash = etherUnsigned(reserves.mul(2));
const reduction = etherUnsigned(2e12);

describe("BToken", function () {
  let root, accounts;
  beforeEach(async () => {
    [root, ...accounts] = await ethers.getSigners();
  });

  describe("_setReserveFactorFresh", () => {
    let bToken;
    beforeEach(async () => {
      bToken = await makeBToken();
    });

    it("rejects change by non-admin", async () => {
      await expect(
        bToken.connect(accounts[0]).harnessSetReserveFactorFresh(factor)
      )
        .to.emit(bToken, "Failure")
        .withArgs(1, 49, 0);
      expect(await bToken.reserveFactorMantissa()).to.be.equal(0);
    });

    it("rejects change if market is stale", async () => {
      await bToken.harnessFastForward(5);
      await expect(bToken.harnessSetReserveFactorFresh(factor))
        .to.emit(bToken, "Failure")
        .withArgs(10, 50, 0);
      expect(await bToken.reserveFactorMantissa()).to.be.equal(0);
    });

    it("rejects newReserveFactor that descales to 1", async () => {
      await expect(bToken.harnessSetReserveFactorFresh(etherMantissa(1.01)))
        .to.emit(bToken, "Failure")
        .withArgs(2, 51, 0);
      expect(await bToken.reserveFactorMantissa()).to.be.equal(0);
    });

    it("accepts newReserveFactor in valid range and emits log", async () => {
      await expect(bToken.harnessSetReserveFactorFresh(factor))
        .to.emit(bToken, "NewReserveFactor")
        .withArgs(0, factor.toString());
      expect(await bToken.reserveFactorMantissa()).to.be.equal(factor);
    });

    it("accepts a change back to zero", async () => {
      await bToken.harnessSetReserveFactorFresh(factor);
      await expect(bToken.harnessSetReserveFactorFresh(0))
        .to.emit(bToken, "NewReserveFactor")
        .withArgs(factor.toString(), 0);
      expect(await bToken.reserveFactorMantissa()).to.be.equal(0);
    });
  });

  describe("_setReserveFactor", () => {
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
      await bToken._setReserveFactor(0);
    });

    it("emits a reserve factor failure if interest accrual fails", async () => {
      await interestRateModel.setFailBorrowRate(true);
      await fastForward(bToken, 1);
      await expect(bToken._setReserveFactor(factor)).to.be.revertedWith(
        "INTEREST_RATE_MODEL_ERROR"
      );
      expect(await bToken.reserveFactorMantissa()).to.be.equal(0);
    });

    it("returns error from setReserveFactorFresh without emitting any extra logs", async () => {
      await expect(bToken._setReserveFactor(etherMantissa(2)))
        .to.emit(bToken, "Failure")
        .withArgs(2, 51, 0);
      expect(await bToken.reserveFactorMantissa()).to.be.equal(0);
    });

    it("returns success from setReserveFactorFresh", async () => {
      expect(await bToken.reserveFactorMantissa()).to.be.equal(0);
      await bToken.harnessFastForward(5);
      await bToken._setReserveFactor(factor);
      expect(await bToken.reserveFactorMantissa()).to.be.equal(factor);
    });
  });

  describe("_reduceReservesFresh", () => {
    let bToken, bTokenUnderlying;
    beforeEach(async () => {
      bToken = await makeBToken();
      await bToken.harnessSetTotalReserves(reserves);
      const bTokenUnderlyingAddr = await bToken.underlying();
      bTokenUnderlying = await ethers.getContractAt(
        CONTRACT_NAMES.ERC20_HARNESS,
        bTokenUnderlyingAddr
      );
      await bTokenUnderlying.harnessSetBalance(bToken.address, cash);
    });

    it("fails if called by non-admin", async () => {
      await expect(
        bToken.connect(accounts[0]).harnessReduceReservesFresh(reduction)
      )
        .to.emit(bToken, "Failure")
        .withArgs(1, 30, 0);
      expect(await bToken.totalReserves()).to.be.equal(reserves);
    });

    it("fails if market is stale", async () => {
      await bToken.harnessFastForward(5);
      await expect(bToken.harnessReduceReservesFresh(reduction))
        .to.emit(bToken, "Failure")
        .withArgs(10, 32, 0);
      expect(await bToken.totalReserves()).to.be.equal(reserves);
    });

    it("fails if amount exceeds reserves", async () => {
      await expect(bToken.harnessReduceReservesFresh(reserves.add(1)))
        .to.emit(bToken, "Failure")
        .withArgs(2, 33, 0);
      expect(await bToken.totalReserves()).to.be.equal(reserves);
    });

    it("fails if amount exceeds available cash", async () => {
      const cashLessThanReserves = reserves.sub(2);
      await bTokenUnderlying.harnessSetBalance(
        bToken.address,
        cashLessThanReserves
      );
      await expect(bToken.harnessReduceReservesFresh(reserves))
        .to.emit(bToken, "Failure")
        .withArgs(14, 31, 0);
      expect(await bToken.totalReserves()).to.be.equal(reserves);
    });

    it("increases admin balance and reduces reserves on success", async () => {
      const balance = etherUnsigned(
        await bTokenUnderlying.balanceOf(root.address)
      );
      await bToken.harnessReduceReservesFresh(reserves);
      expect(await bTokenUnderlying.balanceOf(root.address)).to.be.equal(
        balance.add(reserves)
      );
      expect(await bToken.totalReserves()).to.be.equal(0);
    });

    it("emits an event on success", async () => {
      await expect(bToken.harnessReduceReservesFresh(reserves))
        .to.emit(bToken, "ReservesReduced")
        .withArgs(root.address, reserves.toString(), 0);
    });
  });

  describe("_reduceReserves", () => {
    let bToken, bTokenUnderlying, interestRateModel;
    beforeEach(async () => {
      bToken = await makeBToken();
      let interestRateModelAddr = await bToken.interestRateModel();
      interestRateModel = await ethers.getContractAt(
        CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
        interestRateModelAddr
      );
      await interestRateModel.setFailBorrowRate(false);
      await bToken.harnessSetTotalReserves(reserves);
      let bTokenUnderlyingAddr = await bToken.underlying();
      bTokenUnderlying = await ethers.getContractAt(
        CONTRACT_NAMES.ERC20_HARNESS,
        bTokenUnderlyingAddr
      );
      await bTokenUnderlying.harnessSetBalance(bToken.address, cash);
    });

    it("emits a reserve-reduction failure if interest accrual fails", async () => {
      await interestRateModel.setFailBorrowRate(true);
      await fastForward(bToken, 1);
      await expect(bToken._reduceReserves(reduction)).to.be.revertedWith(
        "INTEREST_RATE_MODEL_ERROR"
      );
    });

    it("returns error from _reduceReservesFresh without emitting any extra logs", async () => {
      await expect(bToken.harnessReduceReservesFresh(reserves.add(1)))
        .to.emit(bToken, "Failure")
        .withArgs(2, 33, 0);
    });

    it("returns success code from _reduceReservesFresh and reduces the correct amount", async () => {
      expect(await bToken.totalReserves()).to.be.equal(reserves);
      await bToken.harnessFastForward(5);
      await bToken._reduceReserves(reduction);
    });
  });

  describe("gulp", () => {
    let bToken, bTokenUnderlying;
    beforeEach(async () => {
      bToken = await makeBToken({ kind: "bcapable" });
      const bTokenUnderlyingAddr = await bToken.underlying();
      bTokenUnderlying = await ethers.getContractAt(
        CONTRACT_NAMES.ERC20_HARNESS,
        bTokenUnderlyingAddr
      );
    });

    it("absorbs excess cash into reserves", async () => {
      await bTokenUnderlying.transfer(bToken.address, cash);
      await bToken.gulp();
      expect(await bToken.getCash()).to.be.equal(cash);
      expect(await bToken.totalReserves()).to.be.equal(cash);
    });
  });
});
