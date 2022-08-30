const {
  etherUnsigned,
  etherMantissa
} = require('../Utils/Ethereum');
const {
  makeComptroller,
  makeBToken,
  fastForward,
  quickMint,
  preApprove
} = require('../Utils/Compound');

const exchangeRate = 50e3;
const mintAmount = etherUnsigned(10e4);
const mintTokens = mintAmount.div(exchangeRate);

function cullTuple(tuple) {
  return Object.keys(tuple).reduce((acc, key) => {
    if (Number.isNaN(Number(key))) {
      return {
        ...acc,
        [key]: tuple[key]
      };
    } else {
      return acc;
    }
  }, {});
}

async function preMint(bToken, minter, mintAmount, mintTokens, exchangeRate) {
  await preApprove(bToken, minter, mintAmount);
  await send(bToken.comptroller, 'setMintAllowed', [true]);
  await send(bToken.comptroller, 'setMintVerify', [true]);
  await send(bToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(bToken.underlying, 'harnessSetFailTransferFromAddress', [minter, false]);
  await send(bToken, 'harnessSetBalance', [minter, 0]);
  await send(bToken, 'harnessSetExchangeRate', [etherMantissa(exchangeRate)]);
}

describe('CompoundLens', () => {
  let compoundLens;
  let acct;

  beforeEach(async () => {
    compoundLens = await deploy('CompoundLens');
    acct = accounts[0];
  });

  describe('bTokenMetadata', () => {
    it('is correct for a bErc20', async () => {
      let bErc20 = await makeBToken();
      await send(bErc20.comptroller, '_supportMarket', [bErc20._address, 0]);
      await send(bErc20.comptroller, '_setMarketSupplyCaps', [[bErc20._address], [100]]);
      await send(bErc20.comptroller, '_setMarketBorrowCaps', [[bErc20._address], [200]]);
      await send(bErc20.comptroller, '_setMintPaused', [bErc20._address, true]);
      await send(bErc20.comptroller, '_setBorrowPaused', [bErc20._address, true]);
      expect(
        cullTuple(await call(compoundLens, 'bTokenMetadata', [bErc20._address]))
      ).toEqual(
        {
          bToken: bErc20._address,
          exchangeRateCurrent: "1000000000000000000",
          supplyRatePerBlock: "0",
          borrowRatePerBlock: "0",
          reserveFactorMantissa: "0",
          totalBorrows: "0",
          totalReserves: "0",
          totalSupply: "0",
          totalCash: "0",
          totalCollateralTokens: "0",
          isListed: true,
          collateralFactorMantissa: "0",
          underlyingAssetAddress: await call(bErc20, 'underlying', []),
          bTokenDecimals: "8",
          underlyingDecimals: "18",
          version: "0",
          collateralCap: "0",
          underlyingPrice: "0",
          supplyPaused: true,
          borrowPaused: true,
          supplyCap: "100",
          borrowCap: "200"
        }
      );
    });

    it('is correct for crEth', async () => {
      let crEth = await makeBToken({kind: 'bether'});
      expect(
        cullTuple(await call(compoundLens, 'bTokenMetadata', [crEth._address]))
      ).toEqual({
        borrowRatePerBlock: "0",
        bToken: crEth._address,
        bTokenDecimals: "8",
        collateralFactorMantissa: "0",
        exchangeRateCurrent: "1000000000000000000",
        isListed: false,
        reserveFactorMantissa: "0",
        supplyRatePerBlock: "0",
        totalBorrows: "0",
        totalCash: "0",
        totalReserves: "0",
        totalSupply: "0",
        totalCollateralTokens: "0",
        underlyingAssetAddress: "0x0000000000000000000000000000000000000000",
        underlyingDecimals: "18",
        version: "0",
        collateralCap: "0",
        underlyingPrice: "1000000000000000000",
        supplyPaused: false,
        borrowPaused: false,
        supplyCap: "0",
        borrowCap: "0"
      });
    });

    it('is correct for a bCollateralCapErc20', async () => {
      let bCollateralCapErc20 = await makeBToken({kind: 'bcollateralcap', supportMarket: true});
      expect(
        cullTuple(await call(compoundLens, 'bTokenMetadata', [bCollateralCapErc20._address]))
      ).toEqual(
        {
          bToken: bCollateralCapErc20._address,
          exchangeRateCurrent: "1000000000000000000",
          supplyRatePerBlock: "0",
          borrowRatePerBlock: "0",
          reserveFactorMantissa: "0",
          totalBorrows: "0",
          totalReserves: "0",
          totalSupply: "0",
          totalCash: "0",
          totalCollateralTokens: "0",
          isListed: true,
          collateralFactorMantissa: "0",
          underlyingAssetAddress: await call(bCollateralCapErc20, 'underlying', []),
          bTokenDecimals: "8",
          underlyingDecimals: "18",
          version: "1",
          collateralCap: "0",
          underlyingPrice: "0",
          supplyPaused: false,
          borrowPaused: false,
          supplyCap: "0",
          borrowCap: "0"
        }
      );
    });

    it('is correct for a bCollateralCapErc20 with collateral cap', async () => {
      let bCollateralCapErc20 = await makeBToken({kind: 'bcollateralcap', supportMarket: true});
      expect(await send(bCollateralCapErc20, '_setCollateralCap', [100])).toSucceed();
      expect(
        cullTuple(await call(compoundLens, 'bTokenMetadata', [bCollateralCapErc20._address]))
      ).toEqual(
        {
          bToken: bCollateralCapErc20._address,
          exchangeRateCurrent: "1000000000000000000",
          supplyRatePerBlock: "0",
          borrowRatePerBlock: "0",
          reserveFactorMantissa: "0",
          totalBorrows: "0",
          totalReserves: "0",
          totalSupply: "0",
          totalCash: "0",
          totalCollateralTokens: "0",
          isListed: true,
          collateralFactorMantissa: "0",
          underlyingAssetAddress: await call(bCollateralCapErc20, 'underlying', []),
          bTokenDecimals: "8",
          underlyingDecimals: "18",
          version: "1",
          collateralCap: "100",
          underlyingPrice: "0",
          supplyPaused: false,
          borrowPaused: false,
          supplyCap: "0",
          borrowCap: "0"
        }
      );
    });

    it('is correct for a bWrappedNative', async () => {
      let bWrappedNative = await makeBToken({kind: 'bwrapped', supportMarket: true});
      expect(
        cullTuple(await call(compoundLens, 'bTokenMetadata', [bWrappedNative._address]))
      ).toEqual(
        {
          bToken: bWrappedNative._address,
          exchangeRateCurrent: "1000000000000000000",
          supplyRatePerBlock: "0",
          borrowRatePerBlock: "0",
          reserveFactorMantissa: "0",
          totalBorrows: "0",
          totalReserves: "0",
          totalSupply: "0",
          totalCash: "0",
          totalCollateralTokens: "0",
          isListed: true,
          collateralFactorMantissa: "0",
          underlyingAssetAddress: await call(bWrappedNative, 'underlying', []),
          bTokenDecimals: "8",
          underlyingDecimals: "18",
          version: "2",
          collateralCap: "0",
          underlyingPrice: "0",
          supplyPaused: false,
          borrowPaused: false,
          supplyCap: "0",
          borrowCap: "0"
        }
      );
    });

    it('is correct for a bWrappedNative with supply cap', async () => {
      let bWrappedNative = await makeBToken({kind: 'bwrapped', supportMarket: true});
      await send(bWrappedNative.comptroller, '_setMarketSupplyCaps', [[bWrappedNative._address], [100]]);
      expect(
        cullTuple(await call(compoundLens, 'bTokenMetadata', [bWrappedNative._address]))
      ).toEqual(
        {
          bToken: bWrappedNative._address,
          exchangeRateCurrent: "1000000000000000000",
          supplyRatePerBlock: "0",
          borrowRatePerBlock: "0",
          reserveFactorMantissa: "0",
          totalBorrows: "0",
          totalReserves: "0",
          totalSupply: "0",
          totalCash: "0",
          totalCollateralTokens: "0",
          isListed: true,
          collateralFactorMantissa: "0",
          underlyingAssetAddress: await call(bWrappedNative, 'underlying', []),
          bTokenDecimals: "8",
          underlyingDecimals: "18",
          version: "2",
          collateralCap: "100", // collateralCap equals to supplyCap
          underlyingPrice: "0",
          supplyPaused: false,
          borrowPaused: false,
          supplyCap: "100",
          borrowCap: "0"
        }
      );
    });
  });

  describe('bTokenMetadataAll', () => {
    it('is correct for a bErc20 and bEther', async () => {
      let comptroller = await makeComptroller();
      let bErc20 = await makeBToken({comptroller: comptroller});
      let crEth = await makeBToken({kind: 'bether', comptroller: comptroller});
      let bCollateralCapErc20 = await makeBToken({kind: 'bcollateralcap', supportMarket: true, comptroller: comptroller});
      let bWrappedNative = await makeBToken({kind: 'bwrapped', supportMarket: true, comptroller: comptroller});
      expect(await send(bCollateralCapErc20, '_setCollateralCap', [100])).toSucceed();
      expect(
        (await call(compoundLens, 'bTokenMetadataAll', [[bErc20._address, crEth._address, bCollateralCapErc20._address, bWrappedNative._address]])).map(cullTuple)
      ).toEqual([
        {
          bToken: bErc20._address,
          exchangeRateCurrent: "1000000000000000000",
          supplyRatePerBlock: "0",
          borrowRatePerBlock: "0",
          reserveFactorMantissa: "0",
          totalBorrows: "0",
          totalReserves: "0",
          totalSupply: "0",
          totalCash: "0",
          totalCollateralTokens: "0",
          isListed: false,
          collateralFactorMantissa: "0",
          underlyingAssetAddress: await call(bErc20, 'underlying', []),
          bTokenDecimals: "8",
          underlyingDecimals: "18",
          version: "0",
          collateralCap: "0",
          underlyingPrice: "0",
          supplyPaused: false,
          borrowPaused: false,
          supplyCap: "0",
          borrowCap: "0"
        },
        {
          borrowRatePerBlock: "0",
          bToken: crEth._address,
          bTokenDecimals: "8",
          collateralFactorMantissa: "0",
          exchangeRateCurrent: "1000000000000000000",
          isListed: false,
          reserveFactorMantissa: "0",
          supplyRatePerBlock: "0",
          totalBorrows: "0",
          totalCash: "0",
          totalReserves: "0",
          totalSupply: "0",
          totalCollateralTokens: "0",
          underlyingAssetAddress: "0x0000000000000000000000000000000000000000",
          underlyingDecimals: "18",
          version: "0",
          collateralCap: "0",
          underlyingPrice: "1000000000000000000",
          supplyPaused: false,
          borrowPaused: false,
          supplyCap: "0",
          borrowCap: "0"
        },
        {
          borrowRatePerBlock: "0",
          bToken: bCollateralCapErc20._address,
          bTokenDecimals: "8",
          collateralFactorMantissa: "0",
          exchangeRateCurrent: "1000000000000000000",
          isListed: true,
          reserveFactorMantissa: "0",
          supplyRatePerBlock: "0",
          totalBorrows: "0",
          totalCash: "0",
          totalReserves: "0",
          totalSupply: "0",
          totalCollateralTokens: "0",
          underlyingAssetAddress: await call(bCollateralCapErc20, 'underlying', []),
          underlyingDecimals: "18",
          version: "1",
          collateralCap: "100",
          underlyingPrice: "0",
          supplyPaused: false,
          borrowPaused: false,
          supplyCap: "0",
          borrowCap: "0"
        },
        {
          bToken: bWrappedNative._address,
          exchangeRateCurrent: "1000000000000000000",
          supplyRatePerBlock: "0",
          borrowRatePerBlock: "0",
          reserveFactorMantissa: "0",
          totalBorrows: "0",
          totalReserves: "0",
          totalSupply: "0",
          totalCash: "0",
          totalCollateralTokens: "0",
          isListed: true,
          collateralFactorMantissa: "0",
          underlyingAssetAddress: await call(bWrappedNative, 'underlying', []),
          bTokenDecimals: "8",
          underlyingDecimals: "18",
          version: "2",
          collateralCap: "0",
          underlyingPrice: "0",
          supplyPaused: false,
          borrowPaused: false,
          supplyCap: "0",
          borrowCap: "0"
        }
      ]);
    });

    it('fails for mismatch comptroller', async () => {
      let comptroller = await makeComptroller();
      let comptroller2 = await makeComptroller();
      let bErc20 = await makeBToken({comptroller: comptroller});
      let crEth = await makeBToken({kind: 'bether', comptroller: comptroller});
      let bCollateralCapErc20 = await makeBToken({kind: 'bcollateralcap', supportMarket: true, comptroller: comptroller2}); // different comptroller
      let bWrappedNative = await makeBToken({kind: 'bwrapped', supportMarket: true, comptroller: comptroller2}); // different comptroller
      await expect(
        call(compoundLens, 'bTokenMetadataAll', [[bErc20._address, crEth._address, bCollateralCapErc20._address, bWrappedNative._address]])
      ).rejects.toRevert('revert mismatch comptroller');
    });

    it('fails for invalid input', async () => {
      await expect(
        call(compoundLens, 'bTokenMetadataAll', [[]])
      ).rejects.toRevert('revert invalid input');
    });
  });

  describe('bTokenBalances', () => {
    it('is correct for bERC20', async () => {
      let bErc20 = await makeBToken();
      let ethBalance = await web3.eth.getBalance(acct);
      expect(
        cullTuple(await call(compoundLens, 'bTokenBalances', [bErc20._address, acct], {gasPrice: '0'}))
      ).toEqual(
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          bToken: bErc20._address,
          tokenAllowance: "0",
          tokenBalance: "10000000000000000000000000",
          collateralEnabled: false,
          collateralBalance: "0",
          nativeTokenBalance: ethBalance
        }
      );
    });

    it('is correct for bETH', async () => {
      let bEth = await makeBToken({kind: 'bether'});
      let ethBalance = await web3.eth.getBalance(acct);
      expect(
        cullTuple(await call(compoundLens, 'bTokenBalances', [bEth._address, acct], {gasPrice: '0'}))
      ).toEqual(
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          bToken: bEth._address,
          tokenAllowance: ethBalance,
          tokenBalance: ethBalance,
          collateralEnabled: false,
          collateralBalance: "0",
          nativeTokenBalance: ethBalance
        }
      );
    });

    it('is correct for bCollateralCapErc20', async () => {
      let bCollateralCapErc20 = await makeBToken({kind: 'bcollateralcap', comptrollerOpts: {kind: 'bool'}});
      await send(bCollateralCapErc20, 'harnessSetBalance', [acct, mintTokens]);
      await send(bCollateralCapErc20, 'harnessSetCollateralBalance', [acct, mintTokens]);
      await send(bCollateralCapErc20, 'harnessSetCollateralBalanceInit', [acct]);
      let ethBalance = await web3.eth.getBalance(acct);
      expect(
        cullTuple(await call(compoundLens, 'bTokenBalances', [bCollateralCapErc20._address, acct], {gasPrice: '0'}))
      ).toEqual(
        {
          balanceOf: "2",
          balanceOfUnderlying: "2",
          borrowBalanceCurrent: "0",
          bToken: bCollateralCapErc20._address,
          tokenAllowance: "0",
          tokenBalance: "10000000000000000000000000",
          collateralEnabled: true,
          collateralBalance: "2",
          nativeTokenBalance: ethBalance
        }
      );
    });
  });

  describe('bTokenBalancesAll', () => {
    it('is correct for bEth and bErc20', async () => {
      let bErc20 = await makeBToken();
      let bEth = await makeBToken({kind: 'bether'});
      let ethBalance = await web3.eth.getBalance(acct);

      expect(
        (await call(compoundLens, 'bTokenBalancesAll', [[bErc20._address, bEth._address], acct], {gasPrice: '0'})).map(cullTuple)
      ).toEqual([
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          bToken: bErc20._address,
          tokenAllowance: "0",
          tokenBalance: "10000000000000000000000000",
          collateralEnabled: false,
          collateralBalance: "0",
          nativeTokenBalance: ethBalance
        },
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          bToken: bEth._address,
          tokenAllowance: ethBalance,
          tokenBalance: ethBalance,
          collateralEnabled: false,
          collateralBalance: "0",
          nativeTokenBalance: ethBalance
        }
      ]);
    })
  });

  describe('getAccountLimits', () => {
    it('gets correct values', async () => {
      let comptroller = await makeComptroller();

      expect(
        cullTuple(await call(compoundLens, 'getAccountLimits', [comptroller._address, acct]))
      ).toEqual({
        liquidity: "0",
        markets: [],
        shortfall: "0"
      });
    });
  });
});
