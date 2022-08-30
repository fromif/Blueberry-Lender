const {
  etherUnsigned,
  etherMantissa,
  UInt256Max
} = require('../Utils/Ethereum');

const {
  makeBToken,
  balanceOf,
  collateralTokenBalance,
  totalSupply,
  totalCollateralTokens,
  fastForward,
  setBalance,
  getBalances,
  adjustBalances,
  preApprove,
  quickMint,
  preSupply,
  quickRedeem,
  quickRedeemUnderlying
} = require('../Utils/Compound');

const exchangeRate = 50e3;
const mintAmount = etherUnsigned(10e4);
const mintTokens = mintAmount.div(exchangeRate);
const redeemTokens = etherUnsigned(10e3);
const redeemAmount = redeemTokens.multipliedBy(exchangeRate);

async function preMint(bToken, minter, mintAmount, mintTokens, exchangeRate) {
  await preApprove(bToken, minter, mintAmount);
  await send(bToken.comptroller, 'setMintAllowed', [true]);
  await send(bToken.comptroller, 'setMintVerify', [true]);
  await send(bToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(bToken.underlying, 'harnessSetFailTransferFromAddress', [minter, false]);
  await send(bToken, 'harnessSetBalance', [minter, 0]);
  await send(bToken, 'harnessSetCollateralBalance', [minter, 0]);
  await send(bToken, 'harnessSetExchangeRate', [etherMantissa(exchangeRate)]);
}

async function mintFresh(bToken, minter, mintAmount) {
  return send(bToken, 'harnessMintFresh', [minter, mintAmount]);
}

async function preRedeem(bToken, redeemer, redeemTokens, redeemAmount, exchangeRate) {
  await preSupply(bToken, redeemer, redeemTokens, {totalCollateralTokens: true});
  await send(bToken.comptroller, 'setRedeemAllowed', [true]);
  await send(bToken.comptroller, 'setRedeemVerify', [true]);
  await send(bToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(bToken.underlying, 'harnessSetBalance', [bToken._address, redeemAmount]);
  await send(bToken, 'harnessSetInternalCash', [redeemAmount]);
  await send(bToken.underlying, 'harnessSetBalance', [redeemer, 0]);
  await send(bToken.underlying, 'harnessSetFailTransferToAddress', [redeemer, false]);
  await send(bToken, 'harnessSetExchangeRate', [etherMantissa(exchangeRate)]);
}

async function redeemFreshTokens(bToken, redeemer, redeemTokens, redeemAmount) {
  return send(bToken, 'harnessRedeemFresh', [redeemer, redeemTokens, 0]);
}

async function redeemFreshAmount(bToken, redeemer, redeemTokens, redeemAmount) {
  return send(bToken, 'harnessRedeemFresh', [redeemer, 0, redeemAmount]);
}

describe('BToken', function () {
  let root, minter, redeemer, accounts;
  let bToken;
  beforeEach(async () => {
    [root, minter, redeemer, ...accounts] = saddle.accounts;
    bToken = await makeBToken({kind: 'bcollateralcap', comptrollerOpts: {kind: 'bool'}, exchangeRate});
  });

  describe('mintFresh', () => {
    beforeEach(async () => {
      await preMint(bToken, minter, mintAmount, mintTokens, exchangeRate);
    });

    it("fails if comptroller tells it to", async () => {
      await send(bToken.comptroller, 'setMintAllowed', [false]);
      await expect(mintFresh(bToken, minter, mintAmount)).rejects.toRevert('revert rejected');
    });

    it("proceeds if comptroller tells it to", async () => {
      await expect(await mintFresh(bToken, minter, mintAmount)).toSucceed();
    });

    it("fails if not fresh", async () => {
      await fastForward(bToken);
      await expect(mintFresh(bToken, minter, mintAmount)).rejects.toRevert('revert market is stale');
    });

    it("continues if fresh", async () => {
      await expect(await send(bToken, 'accrueInterest')).toSucceed();
      expect(await mintFresh(bToken, minter, mintAmount)).toSucceed();
    });

    it("fails if insufficient approval", async () => {
      expect(
        await send(bToken.underlying, 'approve', [bToken._address, 1], {from: minter})
      ).toSucceed();
      await expect(mintFresh(bToken, minter, mintAmount)).rejects.toRevert('revert Insufficient allowance');
    });

    it("fails if insufficient balance", async() => {
      await setBalance(bToken.underlying, minter, 1);
      await expect(mintFresh(bToken, minter, mintAmount)).rejects.toRevert('revert Insufficient balance');
    });

    it("proceeds if sufficient approval and balance", async () =>{
      expect(await mintFresh(bToken, minter, mintAmount)).toSucceed();
    });

    it("fails if exchange calculation fails", async () => {
      expect(await send(bToken, 'harnessSetExchangeRate', [0])).toSucceed();
      await expect(mintFresh(bToken, minter, mintAmount)).rejects.toRevert('revert divide by zero');
    });

    it("fails if transferring in fails", async () => {
      await send(bToken.underlying, 'harnessSetFailTransferFromAddress', [minter, true]);
      await expect(mintFresh(bToken, minter, mintAmount)).rejects.toRevert('revert transfer failed');
    });

    it("transfers the underlying cash, tokens, and emits Mint, Transfer events", async () => {
      const beforeBalances = await getBalances([bToken], [minter]);
      const result = await mintFresh(bToken, minter, mintAmount);
      const afterBalances = await getBalances([bToken], [minter]);
      expect(result).toSucceed();
      expect(result).toHaveLog('Mint', {
        minter,
        mintAmount: mintAmount.toString(),
        mintTokens: mintTokens.toString()
      });
      expect(result).toHaveLog(['Transfer', 1], {
        from: bToken._address,
        to: minter,
        amount: mintTokens.toString()
      });
      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [bToken, minter, 'cash', -mintAmount],
        [bToken, minter, 'tokens', mintTokens],
        [bToken, 'cash', mintAmount],
        [bToken, 'tokens', mintTokens]
      ]));
    });

    it("succeeds and not reach collateracl cap", async () => {
      expect(await send(bToken, '_setCollateralCap', [mintTokens])).toSucceed();
      expect(await mintFresh(bToken, minter, mintAmount)).toSucceed();

      const balance = await balanceOf(bToken, minter);
      const collateralTokens = await collateralTokenBalance(bToken, minter);
      const total = await totalSupply(bToken);
      const totalCollateral = await totalCollateralTokens(bToken);
      expect(balance).toEqual(collateralTokens);
      expect(total).toEqual(totalCollateral);
    });

    it("succeeds but reach collateracl cap", async () => {
      expect(await send(bToken, '_setCollateralCap', [mintTokens.minus(1)])).toSucceed();
      expect(await mintFresh(bToken, minter, mintAmount)).toSucceed();

      const balance = await balanceOf(bToken, minter);
      const collateralTokens = await collateralTokenBalance(bToken, minter);
      const total = await totalSupply(bToken);
      const totalCollateral = await totalCollateralTokens(bToken);
      expect(balance.minus(1)).toEqual(collateralTokens);
      expect(total.minus(1)).toEqual(totalCollateral);
    });
  });

  describe('mint', () => {
    beforeEach(async () => {
      await preMint(bToken, minter, mintAmount, mintTokens, exchangeRate);
    });

    it("emits a mint failure if interest accrual fails", async () => {
      await send(bToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(quickMint(bToken, minter, mintAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from mintFresh without emitting any extra logs", async () => {
      await send(bToken.underlying, 'harnessSetBalance', [minter, 1]);
      await expect(mintFresh(bToken, minter, mintAmount)).rejects.toRevert('revert Insufficient balance');
    });

    it("returns success from mintFresh and mints the correct number of tokens", async () => {
      expect(await quickMint(bToken, minter, mintAmount)).toSucceed();
      expect(mintTokens).not.toEqualNumber(0);
      expect(await balanceOf(bToken, minter)).toEqualNumber(mintTokens);
    });

    it("emits an AccrueInterest event", async () => {
      expect(await quickMint(bToken, minter, mintAmount)).toHaveLog('AccrueInterest', {
        borrowIndex: "1000000000000000000",
        cashPrior: "0",
        interestAccumulated: "0",
        totalBorrows: "0",
      });
    });
  });

  [redeemFreshTokens, redeemFreshAmount].forEach((redeemFresh) => {
    describe(redeemFresh.name, () => {
      beforeEach(async () => {
        await preRedeem(bToken, redeemer, redeemTokens, redeemAmount, exchangeRate);
      });

      it("fails if comptroller tells it to", async () =>{
        await send(bToken.comptroller, 'setRedeemAllowed', [false]);
        await expect(redeemFresh(bToken, redeemer, redeemTokens, redeemAmount)).rejects.toRevert("revert rejected");
      });

      it("fails if not fresh", async () => {
        await fastForward(bToken);
        await expect(redeemFresh(bToken, redeemer, redeemTokens, redeemAmount)).rejects.toRevert('revert market is stale');
      });

      it("continues if fresh", async () => {
        await expect(await send(bToken, 'accrueInterest')).toSucceed();
        expect(await redeemFresh(bToken, redeemer, redeemTokens, redeemAmount)).toSucceed();
      });

      it("fails if insufficient protocol cash to transfer out", async() => {
        await send(bToken.underlying, 'harnessSetBalance', [bToken._address, 1]);
        await send(bToken, 'harnessSetInternalCash', [1]);
        await expect(redeemFresh(bToken, redeemer, redeemTokens, redeemAmount)).rejects.toRevert('revert insufficient cash');
      });

      it("fails if exchange calculation fails", async () => {
        if (redeemFresh == redeemFreshTokens) {
          expect(await send(bToken, 'harnessSetExchangeRate', [UInt256Max()])).toSucceed();
          await expect(redeemFresh(bToken, redeemer, redeemTokens, redeemAmount)).rejects.toRevert("revert multiplication overflow");
        } else {
          expect(await send(bToken, 'harnessSetExchangeRate', [0])).toSucceed();
          await expect(redeemFresh(bToken, redeemer, redeemTokens, redeemAmount)).rejects.toRevert("revert divide by zero");
        }
      });

      it("fails if transferring out fails", async () => {
        await send(bToken.underlying, 'harnessSetFailTransferToAddress', [redeemer, true]);
        await expect(redeemFresh(bToken, redeemer, redeemTokens, redeemAmount)).rejects.toRevert("revert transfer failed");
      });

      it("fails if total supply < redemption amount", async () => {
        await send(bToken, 'harnessExchangeRateDetails', [0, 0, 0]);
        await expect(redeemFresh(bToken, redeemer, redeemTokens, redeemAmount)).rejects.toRevert("revert subtraction underflow");
      });

      it("reverts if new account balance underflows", async () => {
        await send(bToken, 'harnessSetBalance', [redeemer, 0]);
        await expect(redeemFresh(bToken, redeemer, redeemTokens, redeemAmount)).rejects.toRevert("revert subtraction underflow");
      });

      it("transfers the underlying cash, tokens, and emits Redeem, Transfer events", async () => {
        const beforeBalances = await getBalances([bToken], [redeemer]);
        const result = await redeemFresh(bToken, redeemer, redeemTokens, redeemAmount);
        const afterBalances = await getBalances([bToken], [redeemer]);
        expect(result).toSucceed();
        expect(result).toHaveLog('Redeem', {
          redeemer,
          redeemAmount: redeemAmount.toString(),
          redeemTokens: redeemTokens.toString()
        });
        expect(result).toHaveLog(['Transfer', 1], {
          from: redeemer,
          to: bToken._address,
          amount: redeemTokens.toString()
        });
        expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
          [bToken, redeemer, 'cash', redeemAmount],
          [bToken, redeemer, 'tokens', -redeemTokens],
          [bToken, 'cash', -redeemAmount],
          [bToken, 'tokens', -redeemTokens]
        ]));
      });

      it("succeeds and not consume collateral", async () => {
        await send(bToken, 'harnessSetBalance', [redeemer, redeemTokens.multipliedBy(3)]);
        await send(bToken, 'harnessSetCollateralBalance', [redeemer, redeemTokens]);
        await send(bToken, 'harnessSetTotalSupply', [redeemTokens.multipliedBy(3)]);
        await send(bToken, 'harnessSetTotalCollateralTokens', [redeemTokens]);
        await send(bToken, 'harnessSetCollateralBalanceInit', [redeemer]);

        expect(await redeemFresh(bToken, redeemer, redeemTokens, redeemAmount)).toSucceed();

        // balance:          30000 -> 20000
        // collateralTokens: 10000 -> 10000
        // total:            30000 -> 20000
        // totalCollateral:  10000 -> 10000
        const balance = await balanceOf(bToken, redeemer);
        const collateralTokens = await collateralTokenBalance(bToken, redeemer);
        const total = await totalSupply(bToken);
        const totalCollateral = await totalCollateralTokens(bToken);
        expect(balance).toEqual(collateralTokens.multipliedBy(2));
        expect(total).toEqual(totalCollateral.multipliedBy(2));
      });

      it("succeeds but consume partial collateral", async () => {
        await send(bToken, 'harnessSetBalance', [redeemer, redeemTokens.plus(1)]);
        await send(bToken, 'harnessSetCollateralBalance', [redeemer, redeemTokens]);
        await send(bToken, 'harnessSetTotalSupply', [redeemTokens.plus(1)]);
        await send(bToken, 'harnessSetTotalCollateralTokens', [redeemTokens]);
        await send(bToken, 'harnessSetCollateralBalanceInit', [redeemer]);

        expect(await redeemFresh(bToken, redeemer, redeemTokens, redeemAmount)).toSucceed();

        // balance:          10001 -> 1
        // collateralTokens: 10000 -> 1
        // total:            10001 -> 1
        // totalCollateral:  10000 -> 1
        const balance = await balanceOf(bToken, redeemer);
        const collateralTokens = await collateralTokenBalance(bToken, redeemer);
        const total = await totalSupply(bToken);
        const totalCollateral = await totalCollateralTokens(bToken);
        expect(balance).toEqual(collateralTokens);
        expect(total).toEqual(totalCollateral);
      });
    });
  });

  describe('redeem', () => {
    beforeEach(async () => {
      await preRedeem(bToken, redeemer, redeemTokens, redeemAmount, exchangeRate);
    });

    it("emits a redeem failure if interest accrual fails", async () => {
      await send(bToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(quickRedeem(bToken, redeemer, redeemTokens)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from redeemFresh without emitting any extra logs", async () => {
      await setBalance(bToken.underlying, bToken._address, 0);
      await send(bToken, 'harnessSetInternalCash', [0]);
      await expect(quickRedeem(bToken, redeemer, redeemTokens)).rejects.toRevert("revert insufficient cash");
    });

    it("returns success from redeemFresh and redeems the right amount", async () => {
      expect(
        await send(bToken.underlying, 'harnessSetBalance', [bToken._address, redeemAmount])
      ).toSucceed();
      expect(await quickRedeem(bToken, redeemer, redeemTokens, {exchangeRate})).toSucceed();
      expect(redeemAmount).not.toEqualNumber(0);
      expect(await balanceOf(bToken.underlying, redeemer)).toEqualNumber(redeemAmount);
    });

    it("returns success from redeemFresh and redeems the right amount of underlying", async () => {
      expect(
        await send(bToken.underlying, 'harnessSetBalance', [bToken._address, redeemAmount])
      ).toSucceed();
      expect(
        await quickRedeemUnderlying(bToken, redeemer, redeemAmount, {exchangeRate})
      ).toSucceed();
      expect(redeemAmount).not.toEqualNumber(0);
      expect(await balanceOf(bToken.underlying, redeemer)).toEqualNumber(redeemAmount);
    });

    it("emits an AccrueInterest event", async () => {
      expect(await quickMint(bToken, minter, mintAmount)).toHaveLog('AccrueInterest', {
        borrowIndex: "1000000000000000000",
        cashPrior: "500000000",
        interestAccumulated: "0",
        totalBorrows: "0",
      });
    });
  });
});
