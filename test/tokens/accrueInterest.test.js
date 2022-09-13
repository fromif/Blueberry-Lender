const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");
const { CONTRACT_NAMES } = require("../../constants");
const { setBorrowRate, makeBToken } = require("../Utils/Compound");
const {
  etherUnsigned,
  etherMantissa,
  UInt256Max,
} = require("../Utils/ethereum");

const blockNumber = BigNumber.from(10).pow(7).mul(2);
const borrowIndex = ethers.utils.parseEther("1");
const borrowRate = 0.000001;

async function pretendBlock(
  bToken,
  accrualBlock = blockNumber,
  deltaBlocks = BigNumber.from(1)
) {
  await bToken.harnessSetAccrualBlockNumber(etherUnsigned(blockNumber));
  await bToken.harnessSetBlockNumber(blockNumber.add(deltaBlocks));
  await bToken.harnessSetBorrowIndex(borrowIndex);
}

async function preAccrue(bToken) {
  await setBorrowRate(bToken, borrowRate);
  const interestRateModelAddr = await bToken.interestRateModel();
  const interestRateModel = await ethers.getContractAt(
    CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
    interestRateModelAddr
  );
  await interestRateModel.setFailBorrowRate(false);
  await bToken.harnessExchangeRateDetails(0, 0, 0);
}

describe("BToken", () => {
  let root, accounts;
  let bToken, bToken2;
  beforeEach(async () => {
    [root, ...accounts] = await ethers.getSigners();
    bToken = await makeBToken({ comptrollerOpts: { kind: "bool" } });
    bToken2 = await makeBToken({ kind: "ccollateralcapnointerest" });
  });

  beforeEach(async () => {
    await preAccrue(bToken);
    await preAccrue(bToken2);
  });

  describe("accrueInterest", () => {
    it("reverts if the interest rate is absurdly high", async () => {
      await pretendBlock(bToken, blockNumber, BigNumber.from(1));
      expect(await bToken.getBorrowRateMaxMantissa()).to.be.equal(
        etherMantissa(0.000005)
      ); // 0.0005% per block
      await setBorrowRate(bToken, 0.001e-2); // 0.0010% per block
      await expect(bToken.accrueInterest()).to.be.revertedWith(
        "borrow rate too high"
      );
    });

    it("fails if new borrow rate calculation fails", async () => {
      await pretendBlock(bToken, blockNumber, BigNumber.from(1));
      const interestRateModelAddr = await bToken.interestRateModel();
      const interestRateModel = await ethers.getContractAt(
        CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
        interestRateModelAddr
      );
      await interestRateModel.setFailBorrowRate(true);
      await expect(bToken.accrueInterest()).to.be.revertedWith(
        "INTEREST_RATE_MODEL_ERROR"
      );
    });

    it("fails if simple interest factor calculation fails", async () => {
      await pretendBlock(
        bToken,
        blockNumber,
        BigNumber.from(10).pow(70).mul(5)
      );
      await expect(bToken.accrueInterest()).to.be.revertedWith(
        "multiplication overflow"
      );
    });

    it("fails if new borrow index calculation fails", async () => {
      await pretendBlock(
        bToken,
        blockNumber,
        BigNumber.from(10).pow(60).mul(5)
      );
      await expect(bToken.accrueInterest()).to.be.revertedWith(
        "multiplication overflow"
      );
    });

    it("fails if new borrow interest index calculation fails", async () => {
      await pretendBlock(bToken);
      await bToken.harnessSetBorrowIndex(UInt256Max());
      await expect(bToken.accrueInterest()).to.be.revertedWith(
        "multiplication overflow"
      );
    });

    it("fails if interest accumulated calculation fails", async () => {
      await bToken.harnessExchangeRateDetails(0, UInt256Max(), 0);
      await pretendBlock(bToken);
      await expect(bToken.accrueInterest()).to.be.revertedWith(
        "multiplication overflow"
      );
    });

    it("fails if new total borrows calculation fails", async () => {
      await setBorrowRate(bToken, 1e-18);
      await pretendBlock(bToken);
      await bToken.harnessExchangeRateDetails(0, UInt256Max(), 0);
      await expect(bToken.accrueInterest()).to.be.revertedWith(
        "addition overflow"
      );
    });

    it("fails if interest accumulated for reserves calculation fails", async () => {
      await setBorrowRate(bToken, 1e-6);
      await bToken.harnessExchangeRateDetails(
        0,
        BigNumber.from(10).pow(30),
        UInt256Max()
      );
      await bToken.harnessSetReserveFactorFresh(BigNumber.from(10).pow(10));
      await pretendBlock(
        bToken,
        blockNumber,
        BigNumber.from(10).pow(20).mul(5)
      );
      await expect(bToken.accrueInterest()).to.be.revertedWith(
        "addition overflow"
      );
    });

    it("fails if new total reserves calculation fails", async () => {
      await setBorrowRate(bToken, 1e-18);
      await bToken.harnessExchangeRateDetails(
        0,
        BigNumber.from(10).pow(56),
        UInt256Max()
      );
      await bToken.harnessSetReserveFactorFresh(BigNumber.from(10).pow(17));
      await pretendBlock(bToken);
      await expect(bToken.accrueInterest()).to.be.revertedWith(
        "addition overflow"
      );
    });

    it("succeeds and saves updated values in storage on success", async () => {
      const startingTotalBorrows = BigNumber.from(10).pow(22);
      const startingTotalReserves = BigNumber.from(10).pow(20);
      const reserveFactor = BigNumber.from(10).pow(17);
      await bToken.harnessExchangeRateDetails(
        0,
        startingTotalBorrows,
        startingTotalReserves
      );
      await bToken.harnessSetReserveFactorFresh(reserveFactor);
      await pretendBlock(bToken);

      const expectedAccrualBlockNumber = blockNumber.add(1);
      const expectedBorrowIndex = borrowIndex
        .mul(borrowRate * 1e6)
        .div(1e6)
        .add(borrowIndex);
      const expectedTotalBorrows = startingTotalBorrows
        .mul(borrowRate * 1e6)
        .div(1e6)
        .add(startingTotalBorrows);
      const expectedTotalReserves = startingTotalBorrows
        .mul(borrowRate * 1e6)
        .div(1e6)
        .mul(reserveFactor)
        .div(BigNumber.from(10).pow(18))
        .add(startingTotalReserves);

      await expect(bToken.accrueInterest())
        .to.emit(bToken, "AccrueInterest")
        .withArgs(
          0,
          expectedTotalBorrows.sub(startingTotalBorrows),
          expectedBorrowIndex,
          expectedTotalBorrows
        );
      expect(await bToken.accrualBlockNumber()).to.be.equal(
        expectedAccrualBlockNumber
      );
      expect(await bToken.borrowIndex()).to.be.equal(expectedBorrowIndex);
      expect(await bToken.totalBorrows()).to.be.equal(expectedTotalBorrows);
      expect(await bToken.totalReserves()).to.be.equal(expectedTotalReserves);
    });

    it("succeeds and saves updated values in storage but excludes evil spell", async () => {
      const evilSpell = "0x560A8E3B79d23b0A525E15C6F3486c6A293DDAd2";

      const startingTotalBorrows = BigNumber.from(10).pow(22).mul(2);
      const evilSpellBorrows = BigNumber.from(10).pow(22);
      const startingTotalReserves = BigNumber.from(10).pow(20);
      const reserveFactor = BigNumber.from(10).pow(17);

      await bToken2.harnessSetAccountBorrows(evilSpell, evilSpellBorrows, 0);
      await bToken2.harnessExchangeRateDetails(
        0,
        startingTotalBorrows,
        startingTotalReserves
      );
      await bToken2.harnessSetReserveFactorFresh(reserveFactor);
      await pretendBlock(bToken2);

      const expectedAccrualBlockNumber = blockNumber.add(1);
      const expectedBorrowIndex = borrowIndex
        .mul(borrowRate * 1e6)
        .div(1e6)
        .add(borrowIndex);
      const expectedTotalBorrows = startingTotalBorrows
        // .sub(evilSpellBorrows)
        .mul(borrowRate * 1e6)
        .div(1e6)
        .add(startingTotalBorrows);
      const expectedTotalReserves = startingTotalBorrows
        // .sub(evilSpellBorrows)
        .mul(borrowRate * 1e6)
        .div(1e6)
        .mul(reserveFactor)
        .div(BigNumber.from(10).pow(18))
        .add(startingTotalReserves);

      await expect(bToken2.accrueInterest())
        .to.emit(bToken2, "AccrueInterest")
        .withArgs(
          0,
          expectedTotalBorrows.sub(startingTotalBorrows),
          expectedBorrowIndex,
          expectedTotalBorrows
        );
      expect(await bToken2.accrualBlockNumber()).to.be.equal(
        expectedAccrualBlockNumber
      );
      expect(await bToken2.borrowIndex()).to.be.equal(expectedBorrowIndex);
      expect(await bToken2.totalBorrows()).to.be.equal(expectedTotalBorrows);
      expect(await bToken2.totalReserves()).to.be.equal(expectedTotalReserves);
    });
  });
});
