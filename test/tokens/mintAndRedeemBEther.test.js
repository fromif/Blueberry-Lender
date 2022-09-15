const { expect } = require("chai");
const { ethers } = require("hardhat");
const { CONTRACT_NAMES } = require("../../constants");
const {
  setEtherBalance,
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
  sendFallback,
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
  await bToken.harnessSetExchangeRate(etherMantissa(exchangeRate));
}

async function mintExplicit(bToken, minter, mintAmount) {
  return bToken.connect(minter).mint({ value: mintAmount });
}

async function mintFallback(bToken, minter, mintAmount) {
  return sendFallback(bToken, minter, mintAmount);
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
  await setEtherBalance(bToken, redeemAmount);
  await bToken.harnessSetTotalSupply(redeemTokens);
  await setBalance(bToken, redeemer.address, redeemTokens);
}

async function redeemBTokens(bToken, redeemer, redeemTokens, redeemAmount) {
  return bToken.connect(redeemer).redeem(redeemTokens);
}

async function redeemUnderlying(bToken, redeemer, redeemTokens, redeemAmount) {
  return bToken.connect(redeemer).redeemUnderlying(redeemAmount);
}

describe("BEther", () => {
  let root, minter, redeemer, accounts;
  let bToken;

  beforeEach(async () => {
    [root, minter, redeemer, ...accounts] = await ethers.getSigners();
    bToken = await makeBToken({
      kind: "bether",
      comptrollerOpts: { kind: "bool" },
    });
    await fastForward(bToken, 1);
  });

  [mintExplicit, mintFallback].forEach((mint) => {
    describe(mint.name, () => {
      beforeEach(async () => {
        await preMint(bToken, minter, mintAmount, mintTokens, exchangeRate);
      });

      it("reverts if interest accrual fails", async () => {
        const interestRateModelAddr = await bToken.interestRateModel();
        const interestRateModel = await ethers.getContractAt(
          CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
          interestRateModelAddr
        );
        await interestRateModel.setFailBorrowRate(true);
        await expect(mint(bToken, minter, mintAmount)).to.be.revertedWith(
          "INTEREST_RATE_MODEL_ERROR"
        );
      });

      it("returns success from mintFresh and mints the correct number of tokens", async () => {
        const beforeBalances = await getBalances([bToken], [minter.address]);
        const receipt = await mint(bToken, minter, mintAmount);
        const afterBalances = await getBalances([bToken], [minter.address]);
        const expectedBalances = await adjustBalances(beforeBalances, [
          [bToken, "eth", mintAmount],
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
        expect(mintTokens).to.not.be.equal(0);
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
        const interestRateModelAddr = await bToken.interestRateModel();
        const interestRateModel = await ethers.getContractAt(
          CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS,
          interestRateModelAddr
        );
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
          [bToken, "eth", -redeemAmount],
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
        expect(redeemTokens).to.not.be.equal(0);
        expect(afterBalances.toString()).to.be.equal(
          expectedBalances.toString()
        );
      });
    });
  });
});
