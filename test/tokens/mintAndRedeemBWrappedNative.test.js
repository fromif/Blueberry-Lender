const { expect } = require("chai");
const { ethers } = require("hardhat");
const { CONTRACT_NAMES } = require("../../constants");
const {
  setBalance,
  makeBToken,
  fastForward,
  getBalances,
  adjustBalances,
} = require("../utils/compound");
const {
  etherUnsigned,
  etherMantissa,
  etherGasCost,
} = require("../utils/ethereum");

const exchangeRate = 5;
const mintAmount = etherUnsigned(1e5);
const mintTokens = mintAmount.div(exchangeRate);
const redeemTokens = etherUnsigned(10e3);
const redeemAmount = redeemTokens.mul(exchangeRate);

async function preMint(bToken, minter, mintAmount, mintTokens, exchangeRate) {
  const comptrollerAddr = await bToken.comptroller();
  const comptroller = await ethers.getContractAt(
    CONTRACT_NAMES.BOOL_COMPTROLLER,
    comptrollerAddr
  );
  await comptroller.setMintAllowed(true);
  await comptroller.setMintVerify(true);
  const interestRateModelAddr = await bToken.interestRateModel();
  const interestRateModel = await ethers.getContractAt(
    CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
    interestRateModelAddr
  );
  await interestRateModel.setFailBorrowRate(false);
  const underlyingAddr = await bToken.underlying();
  const underlying = await ethers.getContractAt(
    CONTRACT_NAMES.WETH9,
    underlyingAddr
  );
  await underlying.connect(minter).deposit({ value: mintAmount });
  await underlying.connect(minter).approve(bToken.address, mintAmount);
  await bToken.harnessSetBalance(minter.address, 0);
  await bToken.harnessSetExchangeRate(etherMantissa(exchangeRate));
}

async function mintNative(bToken, minter, mintAmount) {
  return bToken.connect(minter).mintNative({ value: mintAmount });
}

async function mint(bToken, minter, mintAmount) {
  return bToken.connect(minter).mint(mintAmount);
}

async function preRedeem(
  bToken,
  redeemer,
  redeemTokens,
  redeemAmount,
  exchangeRate
) {
  const comptrollerAddr = await bToken.comptroller();
  const comptroller = await ethers.getContractAt(
    CONTRACT_NAMES.BOOL_COMPTROLLER,
    comptrollerAddr
  );
  await comptroller.setRedeemAllowed(true);
  await comptroller.setRedeemVerify(true);
  const interestRateModelAddr = await bToken.interestRateModel();
  const interestRateModel = await ethers.getContractAt(
    CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
    interestRateModelAddr
  );
  await interestRateModel.setFailBorrowRate(false);
  await bToken.harnessSetExchangeRate(etherMantissa(exchangeRate));
  const underlyingAddr = await bToken.underlying();
  const underlying = await ethers.getContractAt(
    CONTRACT_NAMES.WETH9,
    underlyingAddr
  );
  await underlying.deposit({ value: redeemAmount });
  await underlying.harnessSetBalance(bToken.address, redeemAmount);
  await bToken.harnessSetTotalSupply(redeemTokens);
  await setBalance(bToken, redeemer.address, redeemTokens);
}

async function redeemBTokensNative(
  bToken,
  redeemer,
  redeemTokens,
  redeemAmount
) {
  return bToken.connect(redeemer).redeemNative(redeemTokens);
}

async function redeemBTokens(bToken, redeemer, redeemTokens, redeemAmount) {
  return bToken.connect(redeemer).redeem(redeemTokens);
}

async function redeemUnderlyingNative(
  bToken,
  redeemer,
  redeemTokens,
  redeemAmount
) {
  return bToken.connect(redeemer).redeemUnderlyingNative(redeemAmount);
}

async function redeemUnderlying(bToken, redeemer, redeemTokens, redeemAmount) {
  return bToken.connect(redeemer).redeemUnderlying(redeemAmount);
}

describe("BWrappedNative", () => {
  let root, minter, redeemer, accounts;
  let bToken, interestRateModel;

  beforeEach(async () => {
    [root, minter, redeemer, ...accounts] = await ethers.getSigners();
    bToken = await makeBToken({
      kind: "bwrapped",
      comptrollerOpts: { kind: "bool" },
      exchangeRate,
    });
    await fastForward(bToken, 1);
    let interestRateModelAddr = await bToken.interestRateModel();
    interestRateModel = await ethers.getContractAt(
      CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
      interestRateModelAddr
    );
  });

  [mintNative, mint].forEach((mint) => {
    describe(mint.name, () => {
      beforeEach(async () => {
        await preMint(bToken, minter, mintAmount, mintTokens, exchangeRate);
      });

      it("reverts if interest accrual fails", async () => {
        await interestRateModel.setFailBorrowRate(true);
        await expect(mint(bToken, minter, mintAmount)).to.be.revertedWith(
          "INTEREST_RATE_MODEL_ERROR"
        );
      });
    });
  });

  describe("mint", () => {
    beforeEach(async () => {
      await preMint(bToken, minter, mintAmount, mintTokens, exchangeRate);
    });

    it("mint", async () => {
      const beforeBalances = await getBalances([bToken], [minter.address]);
      const receipt = await mint(bToken, minter, mintAmount);
      const afterBalances = await getBalances([bToken], [minter.address]);
      const expectedBalances = await adjustBalances(beforeBalances, [
        [bToken, "tokens", mintTokens],
        [bToken, "cash", mintAmount],
        [bToken, minter.address, "cash", mintAmount],
        [bToken, minter.address, "eth", await etherGasCost(receipt)],
        [bToken, minter.address, "tokens", mintTokens],
      ]);
      expect(mintTokens).to.be.not.equal(0);
      expect(afterBalances.toString()).to.be.equal(expectedBalances.toString());
    });

    it("mintNative", async () => {
      const beforeBalances = await getBalances([bToken], [minter.address]);
      const receipt = await mintNative(bToken, minter, mintAmount);
      const afterBalances = await getBalances([bToken], [minter.address]);
      const expectedBalances = await adjustBalances(beforeBalances, [
        [bToken, "tokens", mintTokens],
        [bToken, "cash", mintAmount],
        [
          bToken,
          minter.address,
          "eth",
          mintAmount.add(await etherGasCost(receipt)),
        ],
        [bToken, minter.address, "tokens", mintTokens],
      ]);
      expect(mintTokens).to.be.not.equal(0);
      expect(afterBalances.toString()).to.be.equal(expectedBalances.toString());
    });
  });

  [redeemBTokensNative, redeemUnderlyingNative].forEach((redeem) => {
    describe(redeem.name, () => {
      beforeEach(async () => {
        await preRedeem(
          bToken,
          redeemer,
          redeemTokens,
          redeemAmount,
          exchangeRate
        );
      });

      it("emits a redeem failure if interest accrual fails", async () => {
        await interestRateModel.setFailBorrowRate(true);
        await expect(
          redeem(bToken, redeemer, redeemTokens, redeemAmount)
        ).to.be.revertedWith("INTEREST_RATE_MODEL_ERROR");
      });

      it("returns error from redeemFresh without emitting any extra logs", async () => {
        await expect(
          redeem(bToken, redeemer, redeemTokens.mul(5), redeemAmount.mul(5))
        ).to.be.revertedWith("subtraction underflow");
      });

      it("returns success from redeemFresh and redeems the correct amount", async () => {
        await fastForward(bToken);
        const beforeBalances = await getBalances([bToken], [redeemer.address]);
        const receipt = await redeem(
          bToken,
          redeemer,
          redeemTokens,
          redeemAmount
        );
        const afterBalances = await getBalances([bToken], [redeemer.address]);
        const expectedBalances = await adjustBalances(beforeBalances, [
          [bToken, "tokens", -redeemTokens],
          [bToken, "cash", -redeemAmount],
          [
            bToken,
            redeemer.address,
            "eth",
            redeemAmount.sub(await etherGasCost(receipt)),
          ],
          [bToken, redeemer.address, "tokens", -redeemTokens],
        ]);
        expect(redeemTokens).to.be.not.equal(0);
        expect(afterBalances.toString()).to.be.equal(
          expectedBalances.toString()
        );
      });
    });
  });

  [redeemBTokens, redeemUnderlying].forEach((redeem) => {
    describe(redeem.name, () => {
      beforeEach(async () => {
        await preRedeem(
          bToken,
          redeemer,
          redeemTokens,
          redeemAmount,
          exchangeRate
        );
      });

      it("emits a redeem failure if interest accrual fails", async () => {
        await interestRateModel.setFailBorrowRate(true);
        await expect(
          redeem(bToken, redeemer, redeemTokens, redeemAmount)
        ).to.be.revertedWith("INTEREST_RATE_MODEL_ERROR");
      });

      it("returns error from redeemFresh without emitting any extra logs", async () => {
        await expect(
          redeem(bToken, redeemer, redeemTokens.mul(5), redeemAmount.mul(5))
        ).to.be.revertedWith("subtraction underflow");
      });

      it("returns success from redeemFresh and redeems the correct amount", async () => {
        await fastForward(bToken);
        const beforeBalances = await getBalances([bToken], [redeemer.address]);
        const receipt = await redeem(
          bToken,
          redeemer,
          redeemTokens,
          redeemAmount
        );
        const afterBalances = await getBalances([bToken], [redeemer.address]);
        const expectedBalances = await adjustBalances(beforeBalances, [
          [bToken, "tokens", -redeemTokens],
          [bToken, "cash", -redeemAmount],
          [bToken, redeemer.address, "cash", redeemAmount],
          [bToken, redeemer.address, "eth", await etherGasCost(receipt)],
          [bToken, redeemer.address, "tokens", -redeemTokens],
        ]);
        expect(redeemTokens).to.be.not.equal(0);
        expect(afterBalances.toString()).to.be.equal(expectedBalances.toString());
      });
    });
  });
});
