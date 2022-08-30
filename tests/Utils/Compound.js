"use strict";

const { dfn } = require('./JS');
const {
  etherBalance,
  etherMantissa,
  etherUnsigned,
  mergeInterface
} = require('./Ethereum');

async function makeComptroller(opts = {}) {
  const {
    root = saddle.account,
    kind = 'unitroller'
  } = opts || {};

  if (kind == 'bool') {
    return await deploy('BoolComptroller');
  }

  if (kind == 'false-marker') {
    return await deploy('FalseMarkerMethodComptroller');
  }

  if (kind == 'v1-no-proxy') {
    const comptroller = await deploy('ComptrollerHarness');
    const priceOracle = opts.priceOracle || await makePriceOracle(opts.priceOracleOpts);
    const closeFactor = etherMantissa(dfn(opts.closeFactor, .051));

    await send(comptroller, '_setCloseFactor', [closeFactor]);
    await send(comptroller, '_setPriceOracle', [priceOracle._address]);

    return Object.assign(comptroller, { priceOracle });
  }

  if (kind == 'unitroller') {
    const unitroller = opts.unitroller || await deploy('Unitroller');
    const comptroller = await deploy('ComptrollerHarness');
    const priceOracle = opts.priceOracle || await makePriceOracle(opts.priceOracleOpts);
    const closeFactor = etherMantissa(dfn(opts.closeFactor, .051));
    const liquidationIncentive = etherMantissa(1);

    await send(unitroller, '_setPendingImplementation', [comptroller._address]);
    await send(comptroller, '_become', [unitroller._address]);
    mergeInterface(unitroller, comptroller);
    await send(unitroller, '_setLiquidationIncentive', [liquidationIncentive]);
    await send(unitroller, '_setCloseFactor', [closeFactor]);
    await send(unitroller, '_setPriceOracle', [priceOracle._address]);

    return Object.assign(unitroller, { priceOracle });
  }
}

async function makeBToken(opts = {}) {
  const {
    root = saddle.account,
    kind = 'berc20'
  } = opts || {};

  const comptroller = opts.comptroller || await makeComptroller(opts.comptrollerOpts);
  const interestRateModel = opts.interestRateModel || await makeInterestRateModel(opts.interestRateModelOpts);
  const exchangeRate = etherMantissa(dfn(opts.exchangeRate, 1));
  const decimals = etherUnsigned(dfn(opts.decimals, 8));
  const symbol = opts.symbol || (kind === 'bether' ? 'crETH' : 'bOMG');
  const name = opts.name || `BToken ${symbol}`;
  const admin = opts.admin || root;

  let bToken, underlying;
  let bDelegator, bDelegatee;
  let version = 0;

  switch (kind) {
    case 'bether':
      bToken = await deploy('BEtherHarness',
        [
          comptroller._address,
          interestRateModel._address,
          exchangeRate,
          name,
          symbol,
          decimals,
          admin
        ])
      break;

    case 'bcapable':
      underlying = opts.underlying || await makeToken(opts.underlyingOpts);
      bDelegatee = await deploy('BCapableErc20Delegate');
      bDelegator = await deploy('BErc20Delegator',
        [
          underlying._address,
          comptroller._address,
          interestRateModel._address,
          exchangeRate,
          name,
          symbol,
          decimals,
          admin,
          bDelegatee._address,
          "0x0"
        ]
      );
      bToken = await saddle.getContractAt('BCapableErc20Delegate', bDelegator._address);
      break;

    case 'bcollateralcap':
      underlying = opts.underlying || await makeToken(opts.underlyingOpts);
      bDelegatee = await deploy('BCollateralCapErc20DelegateHarness');
      bDelegator = await deploy('BCollateralCapErc20Delegator',
        [
          underlying._address,
          comptroller._address,
          interestRateModel._address,
          exchangeRate,
          name,
          symbol,
          decimals,
          admin,
          bDelegatee._address,
          "0x0"
        ]
      );
      bToken = await saddle.getContractAt('BCollateralCapErc20DelegateHarness', bDelegator._address);
      version = 1; // bcollateralcap's version is 1
      break;

    case 'bcollateralcapnointerest':
      underlying = opts.underlying || await makeToken(opts.underlyingOpts);
      bDelegatee = await deploy('BCollateralCapErc20NoInterestDelegateHarness');
      bDelegator = await deploy('BCollateralCapErc20Delegator',
        [
          underlying._address,
          comptroller._address,
          interestRateModel._address,
          exchangeRate,
          name,
          symbol,
          decimals,
          admin,
          bDelegatee._address,
          "0x0"
        ]
      );
      bToken = await saddle.getContractAt('BCollateralCapErc20NoInterestDelegateHarness', cDelegator._address);
      version = 1; // bcollateralcap's version is 1
      break;

    case 'bwrapped':
      underlying = await makeToken({kind: "wrapped"});
      bDelegatee = await deploy('BWrappedNativeDelegateHarness');
      bDelegator = await deploy('BWrappedNativeDelegator',
        [
          underlying._address,
          comptroller._address,
          interestRateModel._address,
          exchangeRate,
          name,
          symbol,
          decimals,
          admin,
          bDelegatee._address,
          "0x0"
        ]
      );
      bToken = await saddle.getContractAt('BWrappedNativeDelegateHarness', bDelegator._address); // XXXS at
      version = 2; // bwrappednative's version is 2
      break;

    case 'bevil':
      underlying = await makeToken({kind: "evil"});
      bDelegatee = await deploy('BCollaterlaCapErc20CheckRepayDelegateHarness');
      bDelegator = await deploy('BCollateralCapErc20Delegator',
        [
          underlying._address,
          comptroller._address,
          interestRateModel._address,
          exchangeRate,
          name,
          symbol,
          decimals,
          admin,
          bDelegatee._address,
          "0x0"
        ]
      );
      bToken = await saddle.getContractAt('BCollaterlaCapErc20CheckRepayDelegateHarness', cDelegator._address); // XXXS at
      version = 1; // bcollateralcap's version is 1
      break;

    case 'berc20':
    default:
      underlying = opts.underlying || await makeToken(opts.underlyingOpts);
      bDelegatee = await deploy('BErc20DelegateHarness');
      bDelegator = await deploy('BErc20Delegator',
        [
          underlying._address,
          comptroller._address,
          interestRateModel._address,
          exchangeRate,
          name,
          symbol,
          decimals,
          admin,
          bDelegatee._address,
          "0x0"
        ]
      );
      bToken = await saddle.getContractAt('BErc20DelegateHarness', cDelegator._address); // XXXS at
      break;
  }

  if (opts.supportMarket) {
    await send(comptroller, '_supportMarket', [bToken._address, version]);
  }

  if (opts.underlyingPrice) {
    const price = etherMantissa(opts.underlyingPrice);
    await send(comptroller.priceOracle, 'setUnderlyingPrice', [bToken._address, price]);
  }

  if (opts.collateralFactor) {
    const factor = etherMantissa(opts.collateralFactor);
    expect(await send(comptroller, '_setCollateralFactor', [bToken._address, factor])).toSucceed();
  }

  return Object.assign(bToken, { name, symbol, underlying, comptroller, interestRateModel });
}

async function makeInterestRateModel(opts = {}) {
  const {
    kind = 'harnessed'
  } = opts || {};

  if (kind == 'harnessed') {
    const borrowRate = etherMantissa(dfn(opts.borrowRate, 0));
    return await deploy('InterestRateModelHarness', [borrowRate]);
  }

  if (kind == 'false-marker') {
    const borrowRate = etherMantissa(dfn(opts.borrowRate, 0));
    return await deploy('FalseMarkerMethodInterestRateModel', [borrowRate]);
  }

  if (kind == 'jump-rate') {
    const baseRate = etherMantissa(dfn(opts.baseRate, 0));
    const multiplier = etherMantissa(dfn(opts.multiplier, 1e-18));
    const jump = etherMantissa(dfn(opts.jump, 0));
    const kink = etherMantissa(dfn(opts.kink, 1));
    const roof = etherMantissa(dfn(opts.roof, 1));
    return await deploy('JumpRateModelV2', [baseRate, multiplier, jump, kink, roof]);
  }

  if (kind == 'triple-slope') {
    const baseRate = etherMantissa(dfn(opts.baseRate, 0));
    const multiplier = etherMantissa(dfn(opts.multiplier, 0.1));
    const jump = etherMantissa(dfn(opts.jump, 0));
    const kink1 = etherMantissa(dfn(opts.kink1, 1));
    const kink2 = etherMantissa(dfn(opts.kink2, 1));
    const roof = etherMantissa(dfn(opts.roof, 1));
    return await deploy('TripleSlopeRateModel', [baseRate, multiplier, jump, kink1, kink2, roof]);
  }
}

async function makePriceOracle(opts = {}) {
  const {
    root = saddle.account,
    kind = 'simple'
  } = opts || {};

  if (kind == 'simple') {
    return await deploy('SimplePriceOracle');
  }
}

async function makeMockReference(opts = {}) {
  return await deploy('MockReference');
}

async function makeBTokenAdmin(opts = {}) {
  const {
    root = saddle.account
  } = opts || {};

  const admin = opts.admin || root;
  return await deploy('MockBTokenAdmin', [admin]);
}

async function makeToken(opts = {}) {
  const {
    root = saddle.account,
    kind = 'erc20'
  } = opts || {};

  if (kind == 'erc20') {
    const quantity = etherUnsigned(dfn(opts.quantity, 1e25));
    const decimals = etherUnsigned(dfn(opts.decimals, 18));
    const symbol = opts.symbol || 'OMG';
    const name = opts.name || `Erc20 ${symbol}`;
    return await deploy('ERC20Harness', [quantity, name, decimals, symbol]);
  } else if (kind == 'curveToken') {
    const quantity = etherUnsigned(dfn(opts.quantity, 1e25));
    const decimals = etherUnsigned(dfn(opts.decimals, 18));
    const symbol = opts.symbol || 'crvIB';
    const name = opts.name || `Curve ${symbol}`;
    return await deploy('CurveTokenHarness', [quantity, name, decimals, symbol, opts.crvOpts.minter]);
  } else if (kind == 'yvaultToken') {
    const quantity = etherUnsigned(dfn(opts.quantity, 1e25));
    const decimals = etherUnsigned(dfn(opts.decimals, 18));
    const symbol = opts.symbol || 'yvIB';
    const version = (opts.yvOpts && opts.yvOpts.version) || 'v1';
    const name = opts.name || `yVault ${version} ${symbol}`;

    const underlying = (opts.yvOpts && opts.yvOpts.underlying) || await makeToken();
    const price = dfn((opts.yvOpts && opts.yvOpts.price), etherMantissa(1));
    if (version == 'v1') {
      return await deploy('YVaultV1TokenHarness', [quantity, name, decimals, symbol, underlying._address, price]);
    } else {
      return await deploy('YVaultV2TokenHarness', [quantity, name, decimals, symbol, underlying._address, price]);
    }
  } else if (kind == 'wrapped') {
    return await deploy('WETH9');
  } else if (kind == 'nonstandard') {
    const quantity = etherUnsigned(dfn(opts.quantity, 1e25));
    const decimals = etherUnsigned(dfn(opts.decimals, 18));
    const symbol = opts.symbol || 'MITH';
    const name = opts.name || `Erc20 ${symbol}`;
    return await deploy('FaucetNonStandardToken', [quantity, name, decimals, symbol]);
  } else if (kind == 'lp') {
    const quantity = etherUnsigned(dfn(opts.quantity, 1e25));
    const decimals = etherUnsigned(dfn(opts.decimals, 18));
    const symbol = opts.symbol || 'UNI-V2-LP';
    const name = opts.name || `Uniswap v2 LP`;
    return await deploy('LPTokenHarness', [quantity, name, decimals, symbol]);
  } else if (kind == 'evil') {
    const quantity = etherUnsigned(dfn(opts.quantity, 1e25));
    const decimals = etherUnsigned(dfn(opts.decimals, 18));
    const symbol = opts.symbol || 'Evil';
    const name = opts.name || `Evil Token`;
    return await deploy('EvilTransferToken', [quantity, name, decimals, symbol]);
  }
}

async function makeCurveSwap(opts = {}) {
  const price = dfn(opts.price, etherMantissa(1));
  return await deploy('CurveSwapHarness', [price]);
}

async function makeMockAggregator(opts = {}) {
  const answer = dfn(opts.answer, etherMantissa(1));
  return await deploy('MockAggregator', [answer]);
}

async function makeMockRegistry(opts = {}) {
  const answer = dfn(opts.answer, etherMantissa(1));
  return await deploy('MockRegistry', [answer]);
}

async function makeLiquidityMining(opts = {}) {
  const comptroller = opts.comptroller || await makeComptroller(opts.comptrollerOpts);
  return await deploy('MockLiquidityMining', [comptroller._address]);
}

async function makeEvilAccount(opts = {}) {
  const crEth = opts.crEth || await makeBToken({kind: 'bether'});
  const crEvil = opts.crEvil || await makeBToken({kind: 'bevil'});
  const borrowAmount = opts.borrowAmount || etherMantissa(1);
  return await deploy('EvilAccount', [crEth._address, crEvil._address, borrowAmount]);
}

async function makeEvilAccount2(opts = {}) {
  const crWeth = opts.crWeth || await makeBToken({kind: 'berc20'});
  const crEvil = opts.crEvil || await makeBToken({kind: 'bevil'});
  const borrower = opts.borrower;
  const repayAmount = opts.repayAmount || etherMantissa(1);
  return await deploy('EvilAccount2', [crWeth._address, crEvil._address, borrower, repayAmount]);
}

async function makeFlashloanReceiver(opts = {}) {
  const {
    kind = 'normal'
  } = opts || {};
  if (kind === 'normal') {
    return await deploy('FlashloanReceiver', [])
  }
  if (kind === 'flashloan-and-mint') {
    return await deploy('FlashloanAndMint', [])
  }
  if (kind === 'flashloan-and-repay-borrow') {
    return await deploy('FlashloanAndRepayBorrow', [])
  }
  if (kind === 'flashloan-twice') {
    return await deploy('FlashloanTwice', [])
  }
  if (kind === 'native') {
    return await deploy('FlashloanReceiverNative');
  }
  if (kind === 'flashloan-and-mint-native') {
    return await deploy('FlashloanAndMintNative');
  }
  if (kind === 'flashloan-and-repay-borrow-native') {
    return await deploy('FlashloanAndRepayBorrowNative');
  }
  if (kind === 'flashloan-twice-native') {
    return await deploy('FlashloanTwiceNative');
  }
}

async function balanceOf(token, account) {
  return etherUnsigned(await call(token, 'balanceOf', [account]));
}

async function collateralTokenBalance(token, account) {
  return etherUnsigned(await call(token, 'accountCollateralTokens', [account]));
}

async function cash(token) {
  return etherUnsigned(await call(token, 'getCash', []));
}

async function totalSupply(token) {
  return etherUnsigned(await call(token, 'totalSupply'));
}

async function totalCollateralTokens(token) {
  return etherUnsigned(await call(token, 'totalCollateralTokens'));
}

async function borrowSnapshot(bToken, account) {
  const { principal, interestIndex } = await call(bToken, 'harnessAccountBorrows', [account]);
  return { principal: etherUnsigned(principal), interestIndex: etherUnsigned(interestIndex) };
}

async function totalBorrows(bToken) {
  return etherUnsigned(await call(bToken, 'totalBorrows'));
}

async function totalReserves(bToken) {
  return etherUnsigned(await call(bToken, 'totalReserves'));
}

async function enterMarkets(bTokens, from) {
  return await send(bTokens[0].comptroller, 'enterMarkets', [bTokens.map(c => c._address)], { from });
}

async function fastForward(bToken, blocks = 5) {
  return await send(bToken, 'harnessFastForward', [blocks]);
}

async function setBalance(bToken, account, balance) {
  return await send(bToken, 'harnessSetBalance', [account, balance]);
}

async function setEtherBalance(bEther, balance) {
  const current = await etherBalance(bEther._address);
  const root = saddle.account;
  expect(await send(bEther, 'harnessDoTransferOut', [root, current])).toSucceed();
  expect(await send(bEther, 'harnessDoTransferIn', [root, balance], { value: balance })).toSucceed();
}

async function getBalances(bTokens, accounts) {
  const balances = {};
  for (let bToken of bTokens) {
    const cBalances = balances[bToken._address] = {};
    for (let account of accounts) {
      cBalances[account] = {
        eth: await etherBalance(account),
        cash: bToken.underlying && await balanceOf(bToken.underlying, account),
        tokens: await balanceOf(bToken, account),
        borrows: (await borrowSnapshot(bToken, account)).principal
      };
    }
    cBalances[bToken._address] = {
      eth: await etherBalance(bToken._address),
      cash: await cash(bToken),
      tokens: await totalSupply(bToken),
      borrows: await totalBorrows(bToken),
      reserves: await totalReserves(bToken)
    };
  }
  return balances;
}

async function adjustBalances(balances, deltas) {
  for (let delta of deltas) {
    let bToken, account, key, diff;
    if (delta.length == 4) {
      ([bToken, account, key, diff] = delta);
    } else {
      ([bToken, key, diff] = delta);
      account = bToken._address;
    }
    balances[bToken._address][account][key] = balances[bToken._address][account][key].plus(diff);
  }
  return balances;
}


async function preApprove(bToken, from, amount, opts = {}) {
  if (dfn(opts.faucet, true)) {
    expect(await send(bToken.underlying, 'harnessSetBalance', [from, amount], { from })).toSucceed();
  }

  return send(bToken.underlying, 'approve', [bToken._address, amount], { from });
}

async function quickMint(bToken, minter, mintAmount, opts = {}) {
  // make sure to accrue interest
  await fastForward(bToken, 1);

  if (dfn(opts.approve, true)) {
    expect(await preApprove(bToken, minter, mintAmount, opts)).toSucceed();
  }
  if (dfn(opts.exchangeRate)) {
    expect(await send(bToken, 'harnessSetExchangeRate', [etherMantissa(opts.exchangeRate)])).toSucceed();
  }
  return send(bToken, 'mint', [mintAmount], { from: minter });
}


async function preSupply(bToken, account, tokens, opts = {}) {
  if (dfn(opts.total, true)) {
    expect(await send(bToken, 'harnessSetTotalSupply', [tokens])).toSucceed();
  }
  if (dfn(opts.totalCollateralTokens)) {
    expect(await send(bToken, 'harnessSetTotalCollateralTokens', [tokens])).toSucceed();
  }
  return send(bToken, 'harnessSetBalance', [account, tokens]);
}

async function quickRedeem(bToken, redeemer, redeemTokens, opts = {}) {
  await fastForward(bToken, 1);

  if (dfn(opts.supply, true)) {
    expect(await preSupply(bToken, redeemer, redeemTokens, opts)).toSucceed();
  }
  if (dfn(opts.exchangeRate)) {
    expect(await send(bToken, 'harnessSetExchangeRate', [etherMantissa(opts.exchangeRate)])).toSucceed();
  }
  return send(bToken, 'redeem', [redeemTokens], { from: redeemer });
}

async function quickRedeemUnderlying(bToken, redeemer, redeemAmount, opts = {}) {
  await fastForward(bToken, 1);

  if (dfn(opts.exchangeRate)) {
    expect(await send(bToken, 'harnessSetExchangeRate', [etherMantissa(opts.exchangeRate)])).toSucceed();
  }
  return send(bToken, 'redeemUnderlying', [redeemAmount], { from: redeemer });
}

async function setOraclePrice(bToken, price) {
  return send(bToken.comptroller.priceOracle, 'setUnderlyingPrice', [bToken._address, etherMantissa(price)]);
}

async function setBorrowRate(bToken, rate) {
  return send(bToken.interestRateModel, 'setBorrowRate', [etherMantissa(rate)]);
}

async function getBorrowRate(interestRateModel, cash, borrows, reserves) {
  return call(interestRateModel, 'getBorrowRate', [cash, borrows, reserves].map(etherUnsigned));
}

async function getSupplyRate(interestRateModel, cash, borrows, reserves, reserveFactor) {
  return call(interestRateModel, 'getSupplyRate', [cash, borrows, reserves, reserveFactor].map(etherUnsigned));
}

async function pretendBorrow(bToken, borrower, accountIndex, marketIndex, principalRaw, blockNumber = 2e7) {
  await send(bToken, 'harnessSetTotalBorrows', [etherUnsigned(principalRaw)]);
  await send(bToken, 'harnessSetAccountBorrows', [borrower, etherUnsigned(principalRaw), etherMantissa(accountIndex)]);
  await send(bToken, 'harnessSetBorrowIndex', [etherMantissa(marketIndex)]);
  await send(bToken, 'harnessSetAccrualBlockNumber', [etherUnsigned(blockNumber)]);
  await send(bToken, 'harnessSetBlockNumber', [etherUnsigned(blockNumber)]);
}

module.exports = {
  makeComptroller,
  makeBToken,
  makeInterestRateModel,
  makePriceOracle,
  makeMockAggregator,
  makeMockReference,
  makeMockRegistry,
  makeFlashloanReceiver,
  makeToken,
  makeCurveSwap,
  makeLiquidityMining,
  makeEvilAccount,
  makeEvilAccount2,
  makeBTokenAdmin,

  balanceOf,
  collateralTokenBalance,
  totalSupply,
  totalCollateralTokens,
  borrowSnapshot,
  totalBorrows,
  totalReserves,
  enterMarkets,
  fastForward,
  setBalance,
  setEtherBalance,
  getBalances,
  adjustBalances,

  preApprove,
  quickMint,

  preSupply,
  quickRedeem,
  quickRedeemUnderlying,

  setOraclePrice,
  setBorrowRate,
  getBorrowRate,
  getSupplyRate,
  pretendBorrow
};
