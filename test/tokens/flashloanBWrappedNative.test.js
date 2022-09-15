const { expect } = require("chai");
const { CONTRACT_NAMES } = require("../../constants");
const {
  makeFlashloanReceiver,
  balanceOf,
  makeBToken,
} = require("../utils/compound");
const { etherUnsigned, etherMantissa } = require("../utils/ethereum");

describe("Flashloan test", function () {
  let bToken;
  let flashloanReceiver;
  let cash = 1000000;
  let receiverBalance = 100;
  let reservesFactor = 0.5;

  beforeEach(async () => {
    bToken = await makeBToken({ kind: "bwrapped", supportMarket: true });
    flashloanReceiver = await makeFlashloanReceiver({ kind: "native" });

    // so that we can format cToken event logs
    // mergeInterface(flashloanReceiver, cToken);
    const underlyingAddr = await bToken.underlying();
    const underlying = await ethers.getContractAt(
      CONTRACT_NAMES.ERC20_HARNESS,
      underlyingAddr
    );
    await underlying.harnessSetBalance(bToken.address, cash);
    await bToken.harnessSetBlockNumber(etherUnsigned(1e6));
    await bToken.harnessSetAccrualBlockNumber(etherUnsigned(1e6));
    await bToken.harnessSetReserveFactorFresh(etherMantissa(reservesFactor));

    await underlying.harnessSetBalance(
      flashloanReceiver.address,
      receiverBalance
    );
  });

  describe("internal cash equal underlying balance", () => {
    it("repay correctly", async () => {
      const borrowAmount = 10000;
      const totalFee = 3;
      const reservesFee = 1;
      await flashloanReceiver.doFlashloan(
        bToken.address,
        borrowAmount,
        borrowAmount + totalFee
      );

      const underlyingAddr = await bToken.underlying();
      const underlying = await ethers.getContractAt(
        CONTRACT_NAMES.WETH9,
        underlyingAddr
      );

      expect(await balanceOf(underlying, bToken.address)).to.be.equal(
        cash + totalFee
      );
      expect(await bToken.getCash()).to.be.equal(cash + totalFee);
      expect(await bToken.totalReserves()).to.be.equal(reservesFee);
      expect(
        await balanceOf(underlying, flashloanReceiver.address)
      ).to.be.equal(receiverBalance - totalFee);
    });

    it("repay correctly, total fee is truncated", async () => {
      const borrowAmount = 1000;
      const totalFee = 0;
      const reservesFee = 0;
      await flashloanReceiver.doFlashloan(
        bToken.address,
        borrowAmount,
        borrowAmount + totalFee
      );

      const underlyingAddr = await bToken.underlying();
      const underlying = await ethers.getContractAt(
        CONTRACT_NAMES.WETH9,
        underlyingAddr
      );

      expect(await balanceOf(underlying, bToken.address)).to.be.equal(
        cash + totalFee
      );
      expect(await bToken.getCash()).to.be.equal(cash + totalFee);
      expect(await bToken.totalReserves()).to.be.equal(reservesFee);
      expect(
        await balanceOf(underlying, flashloanReceiver.address)
      ).to.be.equal(receiverBalance - totalFee);
    });

    it("repay correctly, reserve fee is truncated", async () => {
      const borrowAmount = 3334;
      const totalFee = 1;
      const reservesFee = 0;
      await flashloanReceiver.doFlashloan(
        bToken.address,
        borrowAmount,
        borrowAmount + totalFee
      );

      const underlyingAddr = await bToken.underlying();
      const underlying = await ethers.getContractAt(
        CONTRACT_NAMES.WETH9,
        underlyingAddr
      );

      expect(await balanceOf(underlying, bToken.address)).to.be.equal(
        cash + totalFee
      );
      expect(await bToken.getCash()).to.be.equal(cash + totalFee);
      expect(await bToken.totalReserves()).to.be.equal(reservesFee);
      expect(
        await balanceOf(underlying, flashloanReceiver.address)
      ).to.be.equal(receiverBalance - totalFee);
    });

    it("borrow exceed cash", async () => {
      const borrowAmount = cash + 1;
      const totalFee = 3;
      const result = flashloanReceiver.doFlashloan(
        bToken.address,
        borrowAmount,
        borrowAmount + totalFee
      );
      await expect(result).to.be.revertedWith("insufficient cash");
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
  let bToken;
  let cash = 1000000;

  beforeEach(async () => {
    bToken = await makeBToken({ kind: "bwrapped", supportMarket: true });
    const underlyingAddr = await bToken.underlying();
    const underlying = await ethers.getContractAt(
      CONTRACT_NAMES.WETH9,
      underlyingAddr
    );
    await underlying.harnessSetBalance(bToken.address, cash);
    await bToken.harnessSetBlockNumber(etherUnsigned(1e6));
    await bToken.harnessSetAccrualBlockNumber(etherUnsigned(1e6));
  });

  it("flashloan and mint", async () => {
    const flashloanAndMint = await makeFlashloanReceiver({
      kind: "flashloan-and-mint-native",
    });
    const borrowAmount = 100;
    const result = flashloanAndMint.doFlashloan(bToken.address, borrowAmount);
    await expect(result).to.be.revertedWith("re-entered");
  });

  it("flashloan and repay borrow", async () => {
    const flashloanAndRepayBorrow = await makeFlashloanReceiver({
      kind: "flashloan-and-repay-borrow-native",
    });
    const borrowAmount = 100;
    const result = flashloanAndRepayBorrow.doFlashloan(
      bToken.address,
      borrowAmount
    );
    await expect(result).to.be.revertedWith("re-entered");
  });

  it("flashloan twice", async () => {
    const flashloanTwice = await makeFlashloanReceiver({
      kind: "flashloan-twice-native",
    });
    const borrowAmount = 100;
    const result = flashloanTwice.doFlashloan(bToken.address, borrowAmount);
    await expect(result).to.be.revertedWith("re-entered");
  });
});
