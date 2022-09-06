const { dfn } = require("./js");
const {
  etherBalance,
  etherMantissa,
  etherUnsigned,
  mergeInterface,
} = require("./ethereum");
const { ethers } = require("hardhat");
const { CONTRACT_NAMES } = require("../../constants");
const { BigNumber } = require("ethers");

async function makeComptroller(opts = {}) {
  const { root = await ethers.getSigners()[0], kind = "unitroller" } =
    opts || {};

  if (kind == "bool") {
    const BoolComptroller = await ethers.getContractFactory(
      CONTRACT_NAMES.BOOL_COMPTROLLER
    );
    const boolComptroller = await BoolComptroller.deploy();
    await boolComptroller.deployed();
    return boolComptroller;
  }

  if (kind == "false-marker") {
    const FalseMarkerMethodComptroller = await ethers.getContractFactory(
      CONTRACT_NAMES.FALSE_MARKER_METHOD_COMPTROLLER
    );
    const falseMarkerMethodComptroller =
      await FalseMarkerMethodComptroller.deploy();
    await falseMarkerMethodComptroller.deployed();
    return falseMarkerMethodComptroller;
  }

  if (kind == "v1-no-proxy") {
    const ComptrollerHarnessV1 = await ethers.getContractFactory(
      CONTRACT_NAMES.COMPTROLLER_HARNESS
    );
    const comptroller = await ComptrollerHarnessV1.deploy();
    await comptroller.deployed();
    const priceOracle =
      opts.priceOracle || (await makePriceOracle(opts.priceOracleOpts));
    const closeFactor = etherMantissa(dfn(opts.closeFactor, 0.051));

    await comptroller._setCloseFactor(closeFactor);
    await comptroller._setPriceOracle(priceOracle.address);
    return Object.assign(comptroller, { priceOracle });
  }

  if (kind == "unitroller") {
    let unitroller = opts.unitroller;
    if (!unitroller) {
      const Unitroller = await ethers.getContractFactory(
        CONTRACT_NAMES.UNITROLLER
      );
      unitroller = await Unitroller.deploy();
      await unitroller.deployed();
    }
    const ComptrollerHarness = await ethers.getContractFactory(
      CONTRACT_NAMES.COMPTROLLER_HARNESS
    );
    const comptroller = await ComptrollerHarness.deploy();
    await comptroller.deployed();
    const priceOracle =
      opts.priceOracle || (await makePriceOracle(opts.priceOracleOpts));
    const closeFactor = etherMantissa(dfn(opts.closeFactor, 0.051));
    const liquidationIncentive = etherMantissa(1);

    await unitroller._setPendingImplementation(comptroller.address);
    await comptroller._become(unitroller.address);
    // // mergeInterface(unitroller, comptroller);
    await comptroller._setLiquidationIncentive(liquidationIncentive.toString());
    await comptroller._setCloseFactor(closeFactor.toString());
    await comptroller._setPriceOracle(priceOracle.address);

    return Object.assign(comptroller, { priceOracle });
  }
}

async function makeBToken(opts = {}) {
  const { root = (await ethers.getSigners())[0], kind = "berc20" } = opts || {};

  const comptroller =
    opts.comptroller || (await makeComptroller(opts.comptrollerOpts));
  const interestRateModel =
    opts.interestRateModel ||
    (await makeInterestRateModel(opts.interestRateModelOpts));
  const exchangeRate = etherMantissa(dfn(opts.exchangeRate, 1));
  const decimals = etherUnsigned(dfn(opts.decimals, 8));
  const symbol = opts.symbol || (kind === "bether" ? "crETH" : "bOMG");
  const name = opts.name || `BToken ${symbol}`;
  const admin = opts.admin || root;

  let bToken, underlying;
  let bDelegator, bDelegatee;
  let version = 0;

  switch (kind) {
    case "bether":
      const BEtherHarness = await ethers.getContractFactory(
        CONTRACT_NAMES.BETHER_HARNESS
      );
      bToken = await BEtherHarness.deploy(
        comptroller.address,
        interestRateModel.address,
        exchangeRate,
        name,
        symbol,
        decimals,
        admin
      );
      await bToken.deployed();
      break;
    case "bcapable":
      underlying = opts.underlying || (await makeToken(opts.underlyingOpts));
      const BCapableErc20Delegate = await ethers.getContractFactory(
        CONTRACT_NAMES.BCAPABLE_ERC20_DELEGATE
      );
      bDelegatee = await BCapableErc20Delegate.deploy();
      await bDelegatee.deployed();
      const BErc20DelegatorCap = await ethers.getContractFactory(
        CONTRACT_NAMES.BERC20_DELEGATOR
      );
      bDelegator = await BErc20DelegatorCap.deploy(
        underlying.address,
        comptroller.address,
        interestRateModel.address,
        exchangeRate,
        name,
        symbol,
        decimals,
        admin,
        bDelegatee.address,
        "0x0"
      );
      await bDelegator.deployed();
      bToken = await ethers.getContractAt(
        CONTRACT_NAMES.BCAPABLE_ERC20_DELEGATE,
        bDelegator.address
      );
      break;
    case "bcollateralcap":
      underlying = opts.underlying || (await makeToken(opts.underlyingOpts));
      const BCollateralCapErc20DelegateHarness =
        await ethers.getContractFactory(
          CONTRACT_NAMES.BCOLLATERAL_CAP_ERC20_DELEGATE_HARNESS
        );
      bDelegatee = await BCollateralCapErc20DelegateHarness.deploy();
      await bDelegatee.deployed();

      const BCollateralCapErc20DelegatorCap = await ethers.getContractFactory(
        CONTRACT_NAMES.BCOLLATERAL_CAP_ERC20_DELEGATOR
      );
      bDelegator = await BCollateralCapErc20DelegatorCap.deploy(
        underlying.address,
        comptroller.address,
        interestRateModel.address,
        exchangeRate,
        name,
        symbol,
        decimals,
        admin,
        bDelegatee.address,
        "0x0"
      );
      await bDelegator.deployed();
      bToken = await ethers.getContractAt(
        CONTRACT_NAMES.BCollateralCapErc20DelegateHarness,
        bDelegator.address
      );
      version = 1; // ccollateralcap's version is 1
      break;
    case "bcollateralcapnointerest":
      underlying = opts.underlying || (await makeToken(opts.underlyingOpts));
      const BCollateralCapErc20NoInterestDelegateHarness =
        await ethers.getContractFactory(
          CONTRACT_NAMES.BCOLLATERAL_CAP_ERC20_NO_INTEREST_DELEGATE_HARNESS
        );
      bDelegatee = await BCollateralCapErc20NoInterestDelegateHarness.deploy();
      await bDelegatee.deployed();

      const BCollateralCapErc20DelegatorNoInterest =
        await ethers.getContractFactory(
          CONTRACT_NAMES.BCOLLATERAL_CAP_ERC20_DELEGATOR
        );
      bDelegator = await BCollateralCapErc20DelegatorNoInterest.deploy(
        underlying.address,
        comptroller.address,
        interestRateModel.address,
        exchangeRate,
        name,
        symbol,
        decimals,
        admin,
        bDelegatee.address,
        "0x0"
      );
      await bDelegator.deployed();

      bToken = await ethers.getContractAt(
        CONTRACT_NAMES.BCOLLATERAL_CAP_ERC20_NO_INTEREST_DELEGATE_HARNESS,
        bDleegator.address
      );
      version = 1; // ccollateralcap's version is 1
      break;
    case "bwrapped":
      underlying = await makeToken({ kind: "wrapped" });
      const BWrappedNativeDelegateHarness = await ethers.getContractFactory(
        CONTRACT_NAMES.BWRAPPED_NATIVE_DELEGATE_HARNESS
      );
      bDelegatee = await BWrappedNativeDelegateHarness.deploy();
      await bDelegatee.deployed();

      const BWrappedNativeDelegator = await ethers.getContractFactory(
        CONTRACT_NAMES.BWRAPPED_NATIVE_DELEGATOR
      );
      bDelegator = await BWrappedNativeDelegator.deploy(
        underlying.address,
        comptroller.address,
        interestRateModel.address,
        exchangeRate,
        name,
        symbol,
        decimals,
        admin,
        bDelegatee.address,
        "0x0"
      );
      await bDelegator.deployed();

      bToken = await ethers.getContractAt(
        CONTRACT_NAMES.BWRAPPED_NATIVE_DELEGATE_HARNESS,
        bDelegator.address
      ); // XXXS at
      version = 2; // cwrappednative's version is 2
      break;
    case "bevil":
      underlying = await makeToken({ kind: "evil" });
      const BCollateralCapErc20CheckRepayDelegateHarness =
        await ethers.getContractFactory(
          CONTRACT_NAMES.BCOLLATERAL_CAP_ERC20_CHECK_REPAY_DELEGATE_HARNESS
        );
      bDelegatee = await BCollateralCapErc20CheckRepayDelegateHarness.deploy();
      await bDelegatee.deployed();

      const BCollateralCapErc20Delegator = await ethers.getContractFactory(
        CONTRACT_NAMES.BCOLLATERAL_CAP_ERC20_DELEGATOR
      );
      bDelegator = await BCollateralCapErc20Delegator.deploy(
        underlying.address,
        comptroller.address,
        interestRateModel.address,
        exchangeRate,
        name,
        symbol,
        decimals,
        admin,
        bDelegatee.address,
        "0x0"
      );
      await bDelegator.deployed();

      bToken = await ethers.getContractAt(
        CONTRACT_NAMES.BCOLLATERAL_CAP_ERC20_CHECK_REPAY_DELEGATE_HARNESS,
        bDelegator.address
      );
      version = 1; // ccollateralcap's version is 1
      break;
    case "berc20":
    default: // XXXS at
      underlying = opts.underlying || (await makeToken(opts.underlyingOpts));
      const BErc20DelegateHarness = await ethers.getContractFactory(
        CONTRACT_NAMES.BERC20_DELEGATE_HARNESS
      );
      bDelegatee = await BErc20DelegateHarness.deploy();
      await bDelegatee.deployed();

      const BErc20Delegator = await ethers.getContractFactory(
        CONTRACT_NAMES.BERC20_DELEGATOR
      );
      bDelegator = await BErc20Delegator.deploy(
        underlying.address,
        comptroller.address,
        interestRateModel.address,
        exchangeRate,
        name,
        symbol,
        decimals,
        admin.address,
        bDelegatee.address,
        "0x00"
      );
      await bDelegator.deployed();

      bToken = await ethers.getContractAt(
        CONTRACT_NAMES.BERC20_DELEGATE_HARNESS,
        bDelegator.address
      );
      break;
  }

  if (opts.supportMarket) {
    await comptroller._supportMarket(bToken.address, version);
  }

  if (opts.underlyingPrice) {
    const price = etherMantissa(opts.underlyingPrice);
    await comptroller.priceOracle.setUnderlyingPrice(bToken.address, price);
  }

  if (opts.collateralFactor) {
    const factor = etherMantissa(opts.collateralFactor);
    await comptroller._setCollateralFactor(bToken.address, factor);
  }

  return Object.assign(
    bToken
    //   {
    //   name,
    //   symbol,
    //   underlying,
    //   comptroller,
    //   interestRateModel,
    // }
  );
}

async function makeInterestRateModel(opts = {}) {
  const { kind = "harnessed" } = opts || {};

  if (kind == "harnessed") {
    const borrowRate = etherMantissa(dfn(opts.borrowRate, 0));
    const InterestRateModelHarness = await ethers.getContractFactory(
      CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS
    );
    const interestRateModelHarness = await InterestRateModelHarness.deploy(
      borrowRate
    );
    await interestRateModelHarness.deployed();
    return interestRateModelHarness;
  }

  if (kind == "false-marker") {
    const borrowRate = etherMantissa(dfn(opts.borrowRate, 0));
    const FalseMarkerMethodInterestRateModel = await ethers.getContractFactory(
      CONTRACT_NAMES.FALSE_MARKER_METHOD_INTEREST_RATE_MODEL
    );
    const falseMarkerMethodInterestRateModel =
      await FalseMarkerMethodInterestRateModel.deploy(borrowRate);
    await falseMarkerMethodInterestRateModel.deployed();
    return falseMarkerMethodInterestRateModel;
  }

  if (kind == "jump-rate") {
    const baseRate = etherMantissa(dfn(opts.baseRate, 0));
    const multiplier = etherMantissa(dfn(opts.multiplier, 1e-18));
    const jump = etherMantissa(dfn(opts.jump, 0));
    const kink = etherMantissa(dfn(opts.kink, 1));
    const roof = etherMantissa(dfn(opts.roof, 1));
    const JumpRateModelV2 = await ethers.getContractFactory(
      CONTRACT_NAMES.JUMP_RATE_MODELV2
    );
    const jumpRateModelV2 = await JumpRateModelV2.deploy(
      baseRate,
      multiplier,
      jump,
      kink,
      roof
    );
    await jumpRateModelV2.deployed();
    return jumpRateModelV2;
  }

  if (kind == "triple-slope") {
    const baseRate = etherMantissa(dfn(opts.baseRate, 0));
    const multiplier = etherMantissa(dfn(opts.multiplier, 0.1));
    const jump = etherMantissa(dfn(opts.jump, 0));
    const kink1 = etherMantissa(dfn(opts.kink1, 1));
    const kink2 = etherMantissa(dfn(opts.kink2, 1));
    const roof = etherMantissa(dfn(opts.roof, 1));
    const TripleSlopeRateModel = await ethers.getContractFactory(
      CONTRACT_NAMES.TRIPLE_SLOPE_RATE_MODEL
    );
    const tripleSlopeRateModel = await TripleSlopeRateModel.deploy(
      baseRate,
      multiplier,
      jump,
      kink1,
      kink2,
      roof
    );
    await tripleSlopeRateModel.deployed();
    return tripleSlopeRateModel;
  }
}

async function makePriceOracle(opts = {}) {
  const { root = await ethers.getSigners()[0], kind = "simple" } = opts || {};

  if (kind == "simple") {
    const SimplePriceOracle = await ethers.getContractFactory(
      CONTRACT_NAMES.SIMPLE_PRICE_ORACLE
    );
    const simplePriceOracle = await SimplePriceOracle.deploy();
    await simplePriceOracle.deployed();
    return simplePriceOracle;
  }
}

async function makeMockReference(opts = {}) {
  const MockReference = await ethers.getContractFactory(
    CONTRACT_NAMES.MOCK_REFERENCE
  );
  const mockReference = await MockReference.deploy();
  await mockReference.deployed();
  return mockReference;
}

async function makeBTokenAdmin(opts = {}) {
  const { root = await ethers.getSigners()[0] } = opts || {};

  const admin = opts.admin || root;
  const MockBToken = await ethers.getContractFactory(
    CONTRACT_NAMES.MOCK_BTOKEN_ADMIN
  );
  const mockBToken = await MockBToken.connect(admin).deploy();
  await mockBToken.deployed();
  return mockBToken;
}

async function makeToken(opts = {}) {
  const { root = await ethers.getSigners()[0], kind = "erc20" } = opts || {};

  if (kind == "erc20") {
    const quantity = etherUnsigned(
      dfn(opts.quantity, BigNumber.from(10).pow(25))
    );
    const decimals = etherUnsigned(dfn(opts.decimals, 18));
    const symbol = opts.symbol || "OMG";
    const name = opts.name || `Erc20 ${symbol}`;
    const ERC20Harness = await ethers.getContractFactory(
      CONTRACT_NAMES.ERC20_HARNESS
    );
    const erc20Harness = await ERC20Harness.deploy(
      quantity,
      name,
      decimals,
      symbol
    );
    await erc20Harness.deployed();
    return erc20Harness;
  } else if (kind == "curveToken") {
    const quantity = etherUnsigned(dfn(opts.quantity, 1e25));
    const decimals = etherUnsigned(dfn(opts.decimals, 18));
    const symbol = opts.symbol || "crvIB";
    const name = opts.name || `Curve ${symbol}`;
    const CurveTokenHarness = await ethers.getContractFactory(
      CONTRACT_NAMES.CURVE_TOKEN_HARNESS
    );
    const curveTokenHarness = await CurveTokenHarness.deploy(
      quantity,
      name,
      decimals,
      symbol,
      opts.crvOpts.minter
    );
    await curveTokenHarness.deployed();
    return curveTokenHarness;
  } else if (kind == "yvaultToken") {
    const quantity = etherUnsigned(dfn(opts.quantity, 1e25));
    const decimals = etherUnsigned(dfn(opts.decimals, 18));
    const symbol = opts.symbol || "yvIB";
    const version = (opts.yvOpts && opts.yvOpts.version) || "v1";
    const name = opts.name || `yVault ${version} ${symbol}`;

    const underlying =
      (opts.yvOpts && opts.yvOpts.underlying) || (await makeToken());
    const price = dfn(opts.yvOpts && opts.yvOpts.price, etherMantissa(1));
    if (version == "v1") {
      const YVaultV1TokenHarness = await ethers.getContractFactory(
        CONTRACT_NAMES.YVAULT_V1_TOKEN_HARNESS
      );
      const yVaultV1TokenHarness = await YVaultV1TokenHarness.deploy(
        quantity,
        name,
        decimals,
        symbol,
        underlying.address,
        price
      );
      await yVaultV1TokenHarness.deployed();
      return yVaultV1TokenHarness;
    } else {
      const YVaultV2TokenHarness = await ethers.getContractFactory(
        CONTRACT_NAMES.YVAULT_V2_TOKEN_HARNESS
      );
      const yVaultV2TokenHarness = await YVaultV2TokenHarness.deploy(
        quantity,
        name,
        decimals,
        symbol,
        underlying.address,
        price
      );
      await yVaultV2TokenHarness.deployed();
      return yVaultV2TokenHarness;
    }
  } else if (kind == "wrapped") {
    const Weth9 = await ethers.getContractFactory(CONTRACT_NAMES.WETH9);
    const weth9 = await Weth9.deploy();
    await weth9.deployed();
    return weth9;
  } else if (kind == "nonstandard") {
    const quantity = etherUnsigned(dfn(opts.quantity, 1e25));
    const decimals = etherUnsigned(dfn(opts.decimals, 18));
    const symbol = opts.symbol || "MITH";
    const name = opts.name || `Erc20 ${symbol}`;
    const FaucetNonStandardToken = await ethers.getContractFactory(
      CONTRACT_NAMES.FAUCET_NON_STANDARD_TOKEN
    );
    const faucetNonStandardToken = await FaucetNonStandardToken.deploy(
      quantity,
      name,
      decimals,
      symbol
    );
    await faucetNonStandardToken.deployed();
    return faucetNonStandardToken;
  } else if (kind == "lp") {
    const quantity = etherUnsigned(dfn(opts.quantity, 1e25));
    const decimals = etherUnsigned(dfn(opts.decimals, 18));
    const symbol = opts.symbol || "UNI-V2-LP";
    const name = opts.name || `Uniswap v2 LP`;
    const LPTokenHarness = await ethers.getContractFactory(
      CONTRACT_NAMES.LP_TOKEN_HARNESS
    );
    const lpTokenHarness = await LPTokenHarness.deploy(
      quantity,
      name,
      decimals,
      symbol
    );
    await lpTokenHarness.deployed();
    return lpTokenHarness;
  } else if (kind == "evil") {
    const quantity = etherUnsigned(dfn(opts.quantity, 1e25));
    const decimals = etherUnsigned(dfn(opts.decimals, 18));
    const symbol = opts.symbol || "Evil";
    const name = opts.name || `Evil Token`;
    const EvilTransferToken = await ethers.getContractFactory(
      CONTRACT_NAMES.EVIL_TRANSFER_TOKEN
    );
    const evilTransferToken = await EvilTransferToken.deploy(
      quantity,
      name,
      decimals,
      symbol
    );
    await evilTransferToken.deployed();
    return evilTransferToken;
  }
}

// async function makeCurveSwap(opts = {}) {
//   const price = dfn(opts.price, etherMantissa(1));
//   return await deploy("CurveSwapHarness", [price]);
// }

// async function makeMockAggregator(opts = {}) {
//   const answer = dfn(opts.answer, etherMantissa(1));
//   return await deploy("MockAggregator", [answer]);
// }

// async function makeMockRegistry(opts = {}) {
//   const answer = dfn(opts.answer, etherMantissa(1));
//   return await deploy("MockRegistry", [answer]);
// }

// async function makeLiquidityMining(opts = {}) {
//   const comptroller =
//     opts.comptroller || (await makeComptroller(opts.comptrollerOpts));
//   return await deploy("MockLiquidityMining", [comptroller._address]);
// }

// async function makeEvilAccount(opts = {}) {
//   const crEth = opts.crEth || (await makeCToken({ kind: "cether" }));
//   const crEvil = opts.crEvil || (await makeCToken({ kind: "cevil" }));
//   const borrowAmount = opts.borrowAmount || etherMantissa(1);
//   return await deploy("EvilAccount", [
//     crEth._address,
//     crEvil._address,
//     borrowAmount,
//   ]);
// }

// async function makeEvilAccount2(opts = {}) {
//   const crWeth = opts.crWeth || (await makeCToken({ kind: "cerc20" }));
//   const crEvil = opts.crEvil || (await makeCToken({ kind: "cevil" }));
//   const borrower = opts.borrower;
//   const repayAmount = opts.repayAmount || etherMantissa(1);
//   return await deploy("EvilAccount2", [
//     crWeth._address,
//     crEvil._address,
//     borrower,
//     repayAmount,
//   ]);
// }

// async function makeFlashloanReceiver(opts = {}) {
//   const { kind = "normal" } = opts || {};
//   if (kind === "normal") {
//     return await deploy("FlashloanReceiver", []);
//   }
//   if (kind === "flashloan-and-mint") {
//     return await deploy("FlashloanAndMint", []);
//   }
//   if (kind === "flashloan-and-repay-borrow") {
//     return await deploy("FlashloanAndRepayBorrow", []);
//   }
//   if (kind === "flashloan-twice") {
//     return await deploy("FlashloanTwice", []);
//   }
//   if (kind === "native") {
//     return await deploy("FlashloanReceiverNative");
//   }
//   if (kind === "flashloan-and-mint-native") {
//     return await deploy("FlashloanAndMintNative");
//   }
//   if (kind === "flashloan-and-repay-borrow-native") {
//     return await deploy("FlashloanAndRepayBorrowNative");
//   }
//   if (kind === "flashloan-twice-native") {
//     return await deploy("FlashloanTwiceNative");
//   }
// }

// async function balanceOf(token, account) {
//   return etherUnsigned(await call(token, "balanceOf", [account]));
// }

// async function collateralTokenBalance(token, account) {
//   return etherUnsigned(await call(token, "accountCollateralTokens", [account]));
// }

// async function cash(token) {
//   return etherUnsigned(await call(token, "getCash", []));
// }

// async function totalSupply(token) {
//   return etherUnsigned(await call(token, "totalSupply"));
// }

// async function totalCollateralTokens(token) {
//   return etherUnsigned(await call(token, "totalCollateralTokens"));
// }

// async function borrowSnapshot(cToken, account) {
//   const { principal, interestIndex } = await call(
//     cToken,
//     "harnessAccountBorrows",
//     [account]
//   );
//   return {
//     principal: etherUnsigned(principal),
//     interestIndex: etherUnsigned(interestIndex),
//   };
// }

// async function totalBorrows(cToken) {
//   return etherUnsigned(await call(cToken, "totalBorrows"));
// }

// async function totalReserves(cToken) {
//   return etherUnsigned(await call(cToken, "totalReserves"));
// }

async function enterMarkets(bTokens, from) {
  const comptrollerAddr = await bTokens[0].comptroller();
  const comptroller = await ethers.getContractAt(
    CONTRACT_NAMES.COMPTROLLER,
    comptrollerAddr
  );
  await comptroller.connect(from).enterMarkets(bTokens.map((b) => b.address));
}

async function fastForward(bToken, blocks = 5) {
  await bToken.harnessFastForward(blocks);
  // return await send(cToken, "harnessFastForward", [blocks]);
}

// async function setBalance(cToken, account, balance) {
//   return await send(cToken, "harnessSetBalance", [account, balance]);
// }

// async function setEtherBalance(cEther, balance) {
//   const current = await etherBalance(cEther._address);
//   const root = saddle.account;
//   expect(
//     await send(cEther, "harnessDoTransferOut", [root, current])
//   ).toSucceed();
//   expect(
//     await send(cEther, "harnessDoTransferIn", [root, balance], {
//       value: balance,
//     })
//   ).toSucceed();
// }

// async function getBalances(cTokens, accounts) {
//   const balances = {};
//   for (let cToken of cTokens) {
//     const cBalances = (balances[cToken._address] = {});
//     for (let account of accounts) {
//       cBalances[account] = {
//         eth: await etherBalance(account),
//         cash:
//           cToken.underlying && (await balanceOf(cToken.underlying, account)),
//         tokens: await balanceOf(cToken, account),
//         borrows: (await borrowSnapshot(cToken, account)).principal,
//       };
//     }
//     cBalances[cToken._address] = {
//       eth: await etherBalance(cToken._address),
//       cash: await cash(cToken),
//       tokens: await totalSupply(cToken),
//       borrows: await totalBorrows(cToken),
//       reserves: await totalReserves(cToken),
//     };
//   }
//   return balances;
// }

// async function adjustBalances(balances, deltas) {
//   for (let delta of deltas) {
//     let cToken, account, key, diff;
//     if (delta.length == 4) {
//       [cToken, account, key, diff] = delta;
//     } else {
//       [cToken, key, diff] = delta;
//       account = cToken._address;
//     }
//     balances[cToken._address][account][key] =
//       balances[cToken._address][account][key].plus(diff);
//   }
//   return balances;
// }

async function preApprove(bToken, from, amount, opts = {}) {
  const underlyingAddr = await bToken.underlying();
  const Underlying = await ethers.getContractAt(
    CONTRACT_NAMES.ERC20_HARNESS,
    underlyingAddr
  );
  if (dfn(opts.faucet, true)) {
    await Underlying.connect(from).harnessSetBalance(from.address, amount);
  }
  await Underlying.connect(from).approve(bToken.address, amount);
}

async function quickMint(bToken, minter, mintAmount, opts = {}) {
  // make sure to accrue interest
  await fastForward(bToken, 1);

  if (dfn(opts.approve, true)) {
    await preApprove(bToken, minter, mintAmount, opts);
  }
  if (dfn(opts.exchangeRate)) {
    await bToken.harnessSetExchangeRate(etherMantissa(opts.exchangeRate));
  }
  await bToken.connect(minter).mint(mintAmount);
}

// async function preSupply(cToken, account, tokens, opts = {}) {
//   if (dfn(opts.total, true)) {
//     expect(await send(cToken, "harnessSetTotalSupply", [tokens])).toSucceed();
//   }
//   if (dfn(opts.totalCollateralTokens)) {
//     expect(
//       await send(cToken, "harnessSetTotalCollateralTokens", [tokens])
//     ).toSucceed();
//   }
//   return send(cToken, "harnessSetBalance", [account, tokens]);
// }

// async function quickRedeem(cToken, redeemer, redeemTokens, opts = {}) {
//   await fastForward(cToken, 1);

//   if (dfn(opts.supply, true)) {
//     expect(await preSupply(cToken, redeemer, redeemTokens, opts)).toSucceed();
//   }
//   if (dfn(opts.exchangeRate)) {
//     expect(
//       await send(cToken, "harnessSetExchangeRate", [
//         etherMantissa(opts.exchangeRate),
//       ])
//     ).toSucceed();
//   }
//   return send(cToken, "redeem", [redeemTokens], { from: redeemer });
// }

// async function quickRedeemUnderlying(
//   cToken,
//   redeemer,
//   redeemAmount,
//   opts = {}
// ) {
//   await fastForward(cToken, 1);

//   if (dfn(opts.exchangeRate)) {
//     expect(
//       await send(cToken, "harnessSetExchangeRate", [
//         etherMantissa(opts.exchangeRate),
//       ])
//     ).toSucceed();
//   }
//   return send(cToken, "redeemUnderlying", [redeemAmount], { from: redeemer });
// }

// async function setOraclePrice(cToken, price) {
//   return send(cToken.comptroller.priceOracle, "setUnderlyingPrice", [
//     cToken._address,
//     etherMantissa(price),
//   ]);
// }

// async function setBorrowRate(cToken, rate) {
//   return send(cToken.interestRateModel, "setBorrowRate", [etherMantissa(rate)]);
// }

// async function getBorrowRate(interestRateModel, cash, borrows, reserves) {
//   return call(
//     interestRateModel,
//     "getBorrowRate",
//     [cash, borrows, reserves].map(etherUnsigned)
//   );
// }

// async function getSupplyRate(
//   interestRateModel,
//   cash,
//   borrows,
//   reserves,
//   reserveFactor
// ) {
//   return call(
//     interestRateModel,
//     "getSupplyRate",
//     [cash, borrows, reserves, reserveFactor].map(etherUnsigned)
//   );
// }

// async function pretendBorrow(
//   cToken,
//   borrower,
//   accountIndex,
//   marketIndex,
//   principalRaw,
//   blockNumber = 2e7
// ) {
//   await send(cToken, "harnessSetTotalBorrows", [etherUnsigned(principalRaw)]);
//   await send(cToken, "harnessSetAccountBorrows", [
//     borrower,
//     etherUnsigned(principalRaw),
//     etherMantissa(accountIndex),
//   ]);
//   await send(cToken, "harnessSetBorrowIndex", [etherMantissa(marketIndex)]);
//   await send(cToken, "harnessSetAccrualBlockNumber", [
//     etherUnsigned(blockNumber),
//   ]);
//   await send(cToken, "harnessSetBlockNumber", [etherUnsigned(blockNumber)]);
// }

module.exports = {
  makeComptroller,
  makeBToken,
  makeInterestRateModel,
  makePriceOracle,
  //   makeMockAggregator,
  //   makeMockReference,
  //   makeMockRegistry,
  //   makeFlashloanReceiver,
  //   makeToken,
  //   makeCurveSwap,
  //   makeLiquidityMining,
  //   makeEvilAccount,
  //   makeEvilAccount2,
  //   makeCTokenAdmin,

  //   balanceOf,
  //   collateralTokenBalance,
  //   totalSupply,
  //   totalCollateralTokens,
  //   borrowSnapshot,
  //   totalBorrows,
  //   totalReserves,
  enterMarkets,
  fastForward,
  //   setBalance,
  //   setEtherBalance,
  //   getBalances,
  //   adjustBalances,

  //   preApprove,
  quickMint,

  //   preSupply,
  //   quickRedeem,
  //   quickRedeemUnderlying,

  //   setOraclePrice,
  //   setBorrowRate,
  //   getBorrowRate,
  //   getSupplyRate,
  //   pretendBorrow,
};
