const {
  etherUnsigned,
  etherMantissa
} = require('../Utils/Ethereum');

const {
  makeBToken,
  preApprove,
  balanceOf,
  fastForward
} = require('../Utils/Compound');

const exchangeRate = 50e3;
const mintAmount = etherUnsigned(10e4);
const mintTokens = mintAmount.div(exchangeRate);

async function preMint(bToken, minter, mintAmount, exchangeRate) {
  await preApprove(bToken, minter, mintAmount);
  await send(bToken.comptroller, 'setMintAllowed', [true]);
  await send(bToken.comptroller, 'setMintVerify', [true]);
  await send(bToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(bToken.underlying, 'harnessSetFailTransferFromAddress', [minter, false]);
  await send(bToken, 'harnessSetBalance', [minter, 0]);
  await send(bToken, 'harnessSetExchangeRate', [etherMantissa(exchangeRate)]);
}

async function mintFresh(bToken, minter, mintAmount) {
  return send(bToken, 'harnessMintFresh', [minter, mintAmount]);
}

describe('BToken', function () {
  let root, minter, accounts;
  beforeEach(async () => {
    [root, minter, ...accounts] = saddle.accounts;
  });

  describe('transfer', () => {
    it("cannot transfer from a zero balance", async () => {
      const bToken = await makeBToken({supportMarket: true});
      expect(await call(bToken, 'balanceOf', [root])).toEqualNumber(0);
      await expect(send(bToken, 'transfer', [accounts[0], 100])).rejects.toRevert('revert subtraction underflow');
    });

    it("transfers 50 tokens", async () => {
      const bToken = await makeBToken({supportMarket: true});
      await send(bToken, 'harnessSetBalance', [root, 100]);
      expect(await call(bToken, 'balanceOf', [root])).toEqualNumber(100);
      await send(bToken, 'transfer', [accounts[0], 50]);
      expect(await call(bToken, 'balanceOf', [root])).toEqualNumber(50);
      expect(await call(bToken, 'balanceOf', [accounts[0]])).toEqualNumber(50);
    });

    it("doesn't transfer when src == dst", async () => {
      const bToken = await makeBToken({supportMarket: true});
      await send(bToken, 'harnessSetBalance', [root, 100]);
      expect(await call(bToken, 'balanceOf', [root])).toEqualNumber(100);
      await expect(send(bToken, 'transfer', [root, 50])).rejects.toRevert('revert bad input');
    });

    it("rejects transfer when not allowed and reverts if not verified", async () => {
      const bToken = await makeBToken({comptrollerOpts: {kind: 'bool'}});
      await send(bToken, 'harnessSetBalance', [root, 100]);
      expect(await call(bToken, 'balanceOf', [root])).toEqualNumber(100);

      await send(bToken.comptroller, 'setTransferAllowed', [false])
      await expect(send(bToken, 'transfer', [root, 50])).rejects.toRevert('revert rejected');

      await send(bToken.comptroller, 'setTransferAllowed', [true])
      await send(bToken.comptroller, 'setTransferVerify', [false])
      await expect(send(bToken, 'transfer', [accounts[0], 50])).rejects.toRevert("revert transferVerify rejected transfer");
    });

    describe("transfer bcollateralcap token", () => {
      it("transfers collateral tokens", async () => {
        const bToken = await makeBToken({kind: 'bcollateralcap', supportMarket: true});
        await send(bToken, 'harnessSetBalance', [root, 100]);
        await send(bToken, 'harnessSetCollateralBalance', [root, 100]);
        await send(bToken, 'harnessSetTotalSupply', [100]);
        await send(bToken, 'harnessSetTotalCollateralTokens', [100]);

        expect(await call(bToken, 'balanceOf', [root])).toEqualNumber(100);
        expect(await call(bToken, 'accountCollateralTokens', [root])).toEqualNumber(100);
        await send(bToken, 'transfer', [accounts[0], 50]);
        expect(await call(bToken, 'balanceOf', [root])).toEqualNumber(50);
        expect(await call(bToken, 'accountCollateralTokens', [root])).toEqualNumber(50);
        expect(await call(bToken, 'balanceOf', [accounts[0]])).toEqualNumber(50);
        expect(await call(bToken, 'accountCollateralTokens', [accounts[0]])).toEqualNumber(50);
      });

      it("transfers non-collateral tokens", async () => {
        const bToken = await makeBToken({kind: 'bcollateralcap', supportMarket: true});
        await send(bToken, 'harnessSetBalance', [root, 100]);
        await send(bToken, 'harnessSetCollateralBalance', [root, 50]);
        await send(bToken, 'harnessSetTotalSupply', [100]);
        await send(bToken, 'harnessSetTotalCollateralTokens', [50]);

        expect(await call(bToken, 'balanceOf', [root])).toEqualNumber(100);
        expect(await call(bToken, 'accountCollateralTokens', [root])).toEqualNumber(50);
        await send(bToken, 'transfer', [accounts[0], 50]);
        expect(await call(bToken, 'balanceOf', [root])).toEqualNumber(50);
        expect(await call(bToken, 'accountCollateralTokens', [root])).toEqualNumber(50);
        expect(await call(bToken, 'balanceOf', [accounts[0]])).toEqualNumber(50);
        expect(await call(bToken, 'accountCollateralTokens', [accounts[0]])).toEqualNumber(0);
      });

      it("transfers partial collateral tokens", async () => {
        const bToken = await makeBToken({kind: 'bcollateralcap', supportMarket: true});
        await send(bToken, 'harnessSetBalance', [root, 100]);
        await send(bToken, 'harnessSetCollateralBalance', [root, 80]);
        await send(bToken, 'harnessSetTotalSupply', [100]);
        await send(bToken, 'harnessSetTotalCollateralTokens', [80]);

        expect(await call(bToken, 'balanceOf', [root])).toEqualNumber(100);
        expect(await call(bToken, 'accountCollateralTokens', [root])).toEqualNumber(80);
        await send(bToken, 'transfer', [accounts[0], 50]);
        expect(await call(bToken, 'balanceOf', [root])).toEqualNumber(50);
        expect(await call(bToken, 'accountCollateralTokens', [root])).toEqualNumber(50);
        expect(await call(bToken, 'balanceOf', [accounts[0]])).toEqualNumber(50);
        expect(await call(bToken, 'accountCollateralTokens', [accounts[0]])).toEqualNumber(30);
      });
    })
  });
});
