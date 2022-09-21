const { expect } = require("chai");
const { ethers } = require("hardhat");
const { CONTRACT_NAMES } = require("../../constants");
const {
  makeBToken,
  makeFlashloanReceiver,
  balanceOf,
} = require("../utils/compound");
const { etherUnsigned, etherMantissa } = require("../utils/ethereum");

describe("Flashloan test", function () {
  let admin;
  let nonAdmin;
  let bToken;
  let flashloanReceiver;
  let cash = 1000000;
  let cashOnChain = 1000000;
  let receiverBalance = 100;
  let reservesFactor = 0.5;

  beforeEach(async () => {
    admin = (await ethers.getSigners())[0];
    nonAdmin = (await ethers.getSigners())[1];
    other = (await ethers.getSigners())[2];
    bToken = await makeBToken({ kind: "bcollateralcap", supportMarket: true });
    flashloanReceiver = await makeFlashloanReceiver();

    // so that we can format bToken event logs
    // mergeInterface(flashloanReceiver, cToken);

    const underlyingAddr = await bToken.underlying();
    const underlying = await ethers.getContractAt(
      CONTRACT_NAMES.ERC20_HARNESS,
      underlyingAddr
    );

    await underlying.harnessSetBalance(bToken.address, cashOnChain);
    await bToken.harnessSetInternalCash(cash);
    await bToken.harnessSetBlockNumber(etherUnsigned(1e6));
    await bToken.harnessSetAccrualBlockNumber(etherUnsigned(1e6));
    await bToken.harnessSetReserveFactorFresh(etherMantissa(reservesFactor));
    await underlying.harnessSetBalance(
      flashloanReceiver.address,
      receiverBalance
    );
  });

  describe("test FlashLoanLender interface", () => {
    let unsupportedBToken;

    beforeEach(async () => {
      unsupportedBToken = await makeBToken({
        kind: "bcollateralcap",
        supportMarket: true,
      });
    });

    it("test maxFlashLoan return 0 for unsupported token", async () => {
      const unsupportedBTokenUnderlyingAddr =
        await unsupportedBToken.underlying();
      expect(
        await bToken.maxFlashLoan(unsupportedBTokenUnderlyingAddr)
      ).to.be.equal(0);
      const bTokenUnderlyingAddr = await bToken.underlying();
      expect(await bToken.maxFlashLoan(bTokenUnderlyingAddr)).to.be.equal(
        cashOnChain
      );
    });

    it("test flashFee revert for unsupported token", async () => {
      const borrowAmount = 10000;
      const totalFee = 3;
      const unsupportedBTokenUnderlyingAddr =
        await unsupportedBToken.underlying();
      await expect(
        bToken.flashFee(unsupportedBTokenUnderlyingAddr, borrowAmount)
      ).to.be.revertedWith("unsupported currency");
      const bTokenUnderlyingAddr = await bToken.underlying();
      expect(
        await bToken.flashFee(bTokenUnderlyingAddr, borrowAmount)
      ).to.be.equal(totalFee);
    });
  });

  describe("internal cash equal underlying balance", () => {
    it("repay correctly", async () => {
      const borrowAmount = 10000;
      const totalFee = 3;
      const reservesFee = 1;

      await expect(
        flashloanReceiver.doFlashloan(
          bToken.address,
          borrowAmount,
          borrowAmount + totalFee
        )
      )
        .to.emit(bToken, "Flashloan")
        .withArgs(
          flashloanReceiver.address,
          borrowAmount,
          totalFee,
          reservesFee
        );

      const bTokenUnderlyingAddr = await bToken.underlying();
      const bTokenUnderlying = await ethers.getContractAt(
        CONTRACT_NAMES.ERC20_HARNESS,
        bTokenUnderlyingAddr
      );
      expect(await balanceOf(bTokenUnderlying, bToken.address)).to.be.equal(
        cashOnChain + totalFee
      );
      expect(await bToken.getCash()).to.be.equal(cash + totalFee);
      expect(await bToken.totalReserves()).to.be.equal(reservesFee);
      expect(
        await balanceOf(bTokenUnderlying, flashloanReceiver.address)
      ).to.be.equal(receiverBalance - totalFee);
    });

    it("repay correctly, total fee is truncated", async () => {
      const borrowAmount = 1000;
      const totalFee = 0;
      const reservesFee = 0;
      await expect(
        flashloanReceiver.doFlashloan(
          bToken.address,
          borrowAmount,
          borrowAmount + totalFee
        )
      )
        .to.emit(bToken, "Flashloan")
        .withArgs(
          flashloanReceiver.address,
          borrowAmount,
          totalFee,
          reservesFee
        );

      const bTokenUnderlyingAddr = await bToken.underlying();
      const bTokenUnderlying = await ethers.getContractAt(
        CONTRACT_NAMES.ERC20_HARNESS,
        bTokenUnderlyingAddr
      );
      expect(await balanceOf(bTokenUnderlying, bToken.address)).to.be.equal(
        cashOnChain + totalFee
      );
      expect(await bToken.getCash()).to.be.equal(cash + totalFee);
      expect(await bToken.totalReserves()).to.be.equal(reservesFee);
      expect(
        await balanceOf(bTokenUnderlying, flashloanReceiver.address)
      ).to.be.equal(receiverBalance - totalFee);
    });

    it("repay correctly, reserve fee is truncated", async () => {
      const borrowAmount = 3334;
      const totalFee = 1;
      const reservesFee = 0;
      await expect(
        flashloanReceiver.doFlashloan(
          bToken.address,
          borrowAmount,
          borrowAmount + totalFee
        )
      )
        .to.emit(bToken, "Flashloan")
        .withArgs(
          flashloanReceiver.address,
          borrowAmount,
          totalFee,
          reservesFee
        );

      const bTokenUnderlyingAddr = await bToken.underlying();
      const bTokenUnderlying = await ethers.getContractAt(
        CONTRACT_NAMES.ERC20_HARNESS,
        bTokenUnderlyingAddr
      );
      expect(await balanceOf(bTokenUnderlying, bToken.address)).to.be.equal(
        cashOnChain + totalFee
      );
      expect(await bToken.getCash()).to.be.equal(cash + totalFee);
      expect(await bToken.totalReserves()).to.be.equal(reservesFee);
      expect(
        await balanceOf(bTokenUnderlying, flashloanReceiver.address)
      ).to.be.equal(receiverBalance - totalFee);
    });

    it("borrow exceed cash", async () => {
      const borrowAmount = cash + 1;
      const totalFee = 3;
      await expect(
        flashloanReceiver.doFlashloan(
          bToken.address,
          borrowAmount,
          borrowAmount + totalFee
        )
      ).to.be.revertedWith("insufficient cash");
    });
  });

  describe("internal cash less than underlying balance", () => {
    let bTokenUnderlying;
    beforeEach(async () => {
      // increase underlying balance without setting internal cash
      cashOnChain = cash + 100;
      const bTokenUnderlyingAddr = await bToken.underlying();
      bTokenUnderlying = await ethers.getContractAt(
        CONTRACT_NAMES.ERC20_HARNESS,
        bTokenUnderlyingAddr
      );
      await bTokenUnderlying.harnessSetBalance(bToken.address, cashOnChain);
    });

    afterEach(async () => {
      cashOnChain = cash;
    });

    it("repay correctly", async () => {
      const borrowAmount = 10000;
      const totalFee = 3;
      const reservesFee = 1;
      await expect(
        flashloanReceiver.doFlashloan(
          bToken.address,
          borrowAmount,
          borrowAmount + totalFee
        )
      )
        .to.emit(bToken, "Flashloan")
        .withArgs(
          flashloanReceiver.address,
          borrowAmount,
          totalFee,
          reservesFee
        );

      expect(await balanceOf(bTokenUnderlying, bToken.address)).to.be.equal(
        cashOnChain + totalFee
      );
      expect(await bToken.getCash()).to.be.equal(cash + totalFee);
      expect(await bToken.totalReserves()).to.be.equal(reservesFee);
      expect(
        await balanceOf(bTokenUnderlying, flashloanReceiver.address)
      ).to.be.equal(receiverBalance - totalFee);
    });

    it("repay correctly, total fee is truncated", async () => {
      const borrowAmount = 1000;
      const totalFee = 0;
      const reservesFee = 0;
      expect(
        await flashloanReceiver.doFlashloan(
          bToken.address,
          borrowAmount,
          borrowAmount + totalFee
        )
      )
        .to.emit(bToken, "Flashloan")
        .withArgs(
          flashloanReceiver.address,
          borrowAmount,
          totalFee,
          reservesFee
        );

      expect(await balanceOf(bTokenUnderlying, bToken.address)).to.be.equal(
        cashOnChain + totalFee
      );
      expect(await bToken.getCash()).to.be.equal(cash + totalFee);
      expect(await bToken.totalReserves()).to.be.equal(reservesFee);
      expect(
        await balanceOf(bTokenUnderlying, flashloanReceiver.address)
      ).to.be.equal(receiverBalance - totalFee);
    });

    it("repay correctly, reserve fee is truncated", async () => {
      const borrowAmount = 3334;
      const totalFee = 1;
      const reservesFee = 0;

      expect(
        await flashloanReceiver.doFlashloan(
          bToken.address,
          borrowAmount,
          borrowAmount + totalFee
        )
      )
        .to.emit(bToken, "Flashloan")
        .withArgs(
          flashloanReceiver.address,
          borrowAmount,
          totalFee,
          reservesFee
        );

      expect(await balanceOf(bTokenUnderlying, bToken.address)).to.be.equal(
        cashOnChain + totalFee
      );
      expect(await bToken.getCash()).to.be.equal(cash + totalFee);
      expect(await bToken.totalReserves()).to.be.equal(reservesFee);
      expect(
        await balanceOf(bTokenUnderlying, flashloanReceiver.address)
      ).to.be.equal(receiverBalance - totalFee);
    });

    it("borrow exceed cash", async () => {
      const borrowAmount = cash + 1;
      const totalFee = 3;
      await expect(
        flashloanReceiver.doFlashloan(
          bToken.address,
          borrowAmount,
          borrowAmount + totalFee
        )
      ).to.be.revertedWith("insufficient cash");
    });
  });

  it("reject by comptroller", async () => {
    const borrowAmount = 10000;
    const totalFee = 3;
    await flashloanReceiver.doFlashloan(
      bToken.address,
      borrowAmount,
      borrowAmount + totalFee
    );

    const comptrollerAddr = await bToken.comptroller();
    const comptroller = await ethers.getContractAt(
      CONTRACT_NAMES.COMPTROLLER_HARNESS,
      comptrollerAddr
    );
    await comptroller._setFlashloanPaused(bToken.address, true);
    await expect(
      flashloanReceiver.doFlashloan(
        bToken.address,
        borrowAmount,
        borrowAmount + totalFee
      )
    ).to.be.revertedWith("flashloan is paused");

    await comptroller._setFlashloanPaused(bToken.address, false);

    await flashloanReceiver.doFlashloan(
      bToken.address,
      borrowAmount,
      borrowAmount + totalFee
    );
  });
});

describe("Flashloan re-entry test", () => {
  let bToken, bTokenUnderlying;
  let cash = 1000000;
  let admin;

  beforeEach(async () => {
    admin = (await ethers.getSigners())[0];
    bToken = await makeBToken({ kind: "bcollateralcap", supportMarket: true });
    const bTokenUnderlyingAddr = await bToken.underlying();
    bTokenUnderlying = await ethers.getContractAt(
      CONTRACT_NAMES.ERC20_HARNESS,
      bTokenUnderlyingAddr
    );
    await bTokenUnderlying.harnessSetBalance(bToken.address, cash);
    await bToken.harnessSetInternalCash(cash);
    await bToken.harnessSetBlockNumber(etherUnsigned(1e6));
    await bToken.harnessSetAccrualBlockNumber(etherUnsigned(1e6));
  });

  it("flashloan and mint", async () => {
    const flashloanAndMint = await makeFlashloanReceiver({
      kind: "flashloan-and-mint",
    });
    const borrowAmount = 100;
    await expect(
      flashloanAndMint.doFlashloan(bToken.address, borrowAmount)
    ).to.be.revertedWith("re-entered");
  });

  it("flashloan and repay borrow", async () => {
    const flashloanAndRepayBorrow = await makeFlashloanReceiver({
      kind: "flashloan-and-repay-borrow",
    });
    const borrowAmount = 100;
    await expect(
      flashloanAndRepayBorrow.doFlashloan(bToken.address, borrowAmount)
    ).to.be.revertedWith("re-entered");
  });

  it("flashloan twice", async () => {
    const flashloanTwice = await makeFlashloanReceiver({
      kind: "flashloan-twice",
    });
    const borrowAmount = 100;
    await expect(
      flashloanTwice.doFlashloan(bToken.address, borrowAmount)
    ).to.be.revertedWith("re-entered");
  });
});
