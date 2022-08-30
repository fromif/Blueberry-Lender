const {
  etherGasCost,
  etherMantissa,
  etherUnsigned,
  sendFallback
} = require('../Utils/Ethereum');

const {
  makeBToken,
  balanceOf,
  fastForward,
  setBalance,
  setEtherBalance,
  getBalances,
  adjustBalances,
} = require('../Utils/Compound');

const exchangeRate = 5;
const mintAmount = etherUnsigned(1e5);
const mintTokens = mintAmount.dividedBy(exchangeRate);
const redeemTokens = etherUnsigned(10e3);
const redeemAmount = redeemTokens.multipliedBy(exchangeRate);

async function preMint(bToken, minter, mintAmount, mintTokens, exchangeRate) {
  await send(bToken.comptroller, 'setMintAllowed', [true]);
  await send(bToken.comptroller, 'setMintVerify', [true]);
  await send(bToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(bToken, 'harnessSetExchangeRate', [etherMantissa(exchangeRate)]);
}

async function mintExplicit(bToken, minter, mintAmount) {
  return send(bToken, 'mint', [], {from: minter, value: mintAmount});
}

async function mintFallback(bToken, minter, mintAmount) {
  return sendFallback(bToken, {from: minter, value: mintAmount});
}

async function preRedeem(bToken, redeemer, redeemTokens, redeemAmount, exchangeRate) {
  await send(bToken.comptroller, 'setRedeemAllowed', [true]);
  await send(bToken.comptroller, 'setRedeemVerify', [true]);
  await send(bToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(bToken, 'harnessSetExchangeRate', [etherMantissa(exchangeRate)]);
  await setEtherBalance(bToken, redeemAmount);
  await send(bToken, 'harnessSetTotalSupply', [redeemTokens]);
  await setBalance(bToken, redeemer, redeemTokens);
}

async function redeemBTokens(bToken, redeemer, redeemTokens, redeemAmount) {
  return send(bToken, 'redeem', [redeemTokens], {from: redeemer});
}

async function redeemUnderlying(bToken, redeemer, redeemTokens, redeemAmount) {
  return send(bToken, 'redeemUnderlying', [redeemAmount], {from: redeemer});
}

describe('BEther', () => {
  let root, minter, redeemer, accounts;
  let bToken;

  beforeEach(async () => {
    [root, minter, redeemer, ...accounts] = saddle.accounts;
    bToken = await makeBToken({kind: 'bether', comptrollerOpts: {kind: 'bool'}});
    await fastForward(bToken, 1);
  });

  [mintExplicit, mintFallback].forEach((mint) => {
    describe(mint.name, () => {
      beforeEach(async () => {
        await preMint(bToken, minter, mintAmount, mintTokens, exchangeRate);
      });

      it("reverts if interest accrual fails", async () => {
        await send(bToken.interestRateModel, 'setFailBorrowRate', [true]);
        await expect(mint(bToken, minter, mintAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
      });

      it("returns success from mintFresh and mints the correct number of tokens", async () => {
        const beforeBalances = await getBalances([bToken], [minter]);
        const receipt = await mint(bToken, minter, mintAmount);
        const afterBalances = await getBalances([bToken], [minter]);
        expect(receipt).toSucceed();
        expect(mintTokens).not.toEqualNumber(0);
        expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
          [bToken, 'eth', mintAmount],
          [bToken, 'tokens', mintTokens],
          [bToken, 'cash', mintAmount],
          [bToken, minter, 'eth', -mintAmount.plus(await etherGasCost(receipt))],
          [bToken, minter, 'tokens', mintTokens]
        ]));
      });
    });
  });

  [redeemBTokens, redeemUnderlying].forEach((redeem) => {
    describe(redeem.name, () => {
      beforeEach(async () => {
        await preRedeem(bToken, redeemer, redeemTokens, redeemAmount, exchangeRate);
      });

      it("emits a redeem failure if interest accrual fails", async () => {
        await send(bToken.interestRateModel, 'setFailBorrowRate', [true]);
        await expect(redeem(bToken, redeemer, redeemTokens, redeemAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
      });

      it("returns error from redeemFresh without emitting any extra logs", async () => {
        await expect(redeem(bToken, redeemer, redeemTokens.multipliedBy(5), redeemAmount.multipliedBy(5))).rejects.toRevert("revert subtraction underflow");
      });

      it("returns success from redeemFresh and redeems the correct amount", async () => {
        await fastForward(bToken);
        const beforeBalances = await getBalances([bToken], [redeemer]);
        const receipt = await redeem(bToken, redeemer, redeemTokens, redeemAmount);
        expect(receipt).toTokenSucceed();
        const afterBalances = await getBalances([bToken], [redeemer]);
        expect(redeemTokens).not.toEqualNumber(0);
        expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
          [bToken, 'eth', -redeemAmount],
          [bToken, 'tokens', -redeemTokens],
          [bToken, 'cash', -redeemAmount],
          [bToken, redeemer, 'eth', redeemAmount.minus(await etherGasCost(receipt))],
          [bToken, redeemer, 'tokens', -redeemTokens]
        ]));
      });
    });
  });
});
