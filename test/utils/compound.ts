import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import { CONTRACT_NAMES } from "../../constants";
import {
  BCapableErc20Delegate,
  BErc20Delegator,
  BEtherHarness,
  BoolComptroller,
  BToken,
  Comptroller,
  ComptrollerHarness,
  CurveTokenHarness,
  ERC20Harness,
  EvilTransferToken,
  FalseMarkerMethodComptroller,
  FalseMarkerMethodInterestRateModel,
  FaucetNonStandardToken,
  InterestRateModelHarness,
  JumpRateModelV2,
  LPTokenHarness,
  SimplePriceOracle,
  TripleSlopeRateModel,
  Unitroller,
  WETH9,
  YVaultV1TokenHarness,
  YVaultV2TokenHarness,
} from "../../typechain-types";

interface ComptrollerOpts {
  root: SignerWithAddress;
  kind: string;
  priceOracle: SimplePriceOracle;
  closeFactor: number;
  unitroller: Unitroller;
}

interface BTokenOpts {
  root: SignerWithAddress;
  kind: string;
  comptroller: Comptroller;
  comptrollerOpts: ComptrollerOpts | undefined;
  interestRateModel:
    | InterestRateModelHarness
    | FalseMarkerMethodInterestRateModel
    | JumpRateModelV2
    | TripleSlopeRateModel;
  interestRateModelOpts: InterestRateModel | undefined;
  exchangeRate: number;
  decimals: number;
  symbol: string;
  name: string;
  admin: SignerWithAddress;
  underlying:
    | ERC20Harness
    | CurveTokenHarness
    | YVaultV1TokenHarness
    | YVaultV2TokenHarness
    | WETH9
    | FaucetNonStandardToken
    | LPTokenHarness
    | EvilTransferToken;
  underlyingOpts: TokenOpts;
}

interface TokenOpts {
  root: SignerWithAddress;
  kind: string;
  quantity: number;
  decimals: number;
  symbol: string;
  name: string;
  crvOpts: CurveOpts;
  yvOpts: YvaultOpts;
}

interface CurveOpts {
  minter: string;
}

interface YvaultOpts {
  version: string;
  underlying: ERC20Harness | CurveTokenHarness;
  price: number;
}

interface InterestRateModel {
  root: SignerWithAddress;
  kind: string;
  borrowRate: number | undefined;
  baseRate: number | undefined;
  multiplier: number | undefined;
  jump: number | undefined;
  kink: number | undefined;
  kink1: number | undefined;
  kink2: number | undefined;
  roof: number | undefined;
}

export const makeComptroller = async (opts?: ComptrollerOpts) => {
  let [admin] = await ethers.getSigners();
  let kind = "unitroller";
  if (opts?.root) {
    admin = opts.root;
  }
  if (opts?.kind) {
    kind = opts.kind;
  }

  if (kind == "bool") {
    const BoolComptroller = await ethers.getContractFactory(
      CONTRACT_NAMES.BOOL_COMPTROLLER
    );
    const boolComptroller = <BoolComptroller>(
      await BoolComptroller.connect(admin).deploy()
    );
    await boolComptroller.deployed();
    return boolComptroller;
  }

  if (kind == "false-marker") {
    const FalseMarkerMethodComptroller = await ethers.getContractFactory(
      CONTRACT_NAMES.FALSE_MARKER_METHOD_COMPTROLLER
    );
    const falseMarkerMethodComptroller = <FalseMarkerMethodComptroller>(
      await FalseMarkerMethodComptroller.connect(admin).deploy()
    );
    await falseMarkerMethodComptroller.deployed();
    return falseMarkerMethodComptroller;
  }

  if (kind == "v1-no-proxy") {
    const Comptroller = await ethers.getContractFactory(
      CONTRACT_NAMES.COMPTROLLER_HARNESS
    );
    const comptroller = <ComptrollerHarness>(
      await Comptroller.connect(admin).deploy()
    );
    await comptroller.deployed();
    const priceOracle = opts?.priceOracle || (await makePriceOracle());
    const closeFactor = etherMantissa(dfn(opts?.closeFactor, 0.051));
    await comptroller.connect(admin)._setCloseFactor(closeFactor);
    await comptroller.connect(admin)._setPriceOracle(priceOracle.address);

    return Object.assign(comptroller, { priceOracle });
  }

  // kind == "unitroller"
  let unitroller =
    opts?.unitroller ||
    (await (async () => {
      const Unitroller = await ethers.getContractFactory(
        CONTRACT_NAMES.UNITROLLER
      );
      const unitroller = <Unitroller>await Unitroller.connect(admin).deploy();
      await unitroller.deployed();
      return unitroller;
    })());
  const Comptroller = await ethers.getContractFactory(
    CONTRACT_NAMES.COMPTROLLER_HARNESS
  );
  let comptroller = <Comptroller>await Comptroller.connect(admin).deploy();
  await comptroller.deployed();
  const priceOracle = opts?.priceOracle || (await makePriceOracle());
  const closeFactor = etherMantissa(dfn(opts?.closeFactor, 0.051));
  const liquidationIncentive = etherMantissa(1);

  await unitroller
    .connect(admin)
    ._setPendingImplementation(comptroller.address);
  await comptroller.connect(admin)._become(unitroller.address);
  await comptroller
    .connect(admin)
    ._setLiquidationIncentive(liquidationIncentive);
  await comptroller.connect(admin)._setCloseFactor(closeFactor);
  await comptroller.connect(admin)._setPriceOracle(priceOracle.address);

  return Object.assign(comptroller, unitroller, { priceOracle });
};

export const makeBToken = async (opts?: BTokenOpts) => {
  let [admin] = await ethers.getSigners();
  let kind = "berc20";
  if (opts?.root) {
    admin = opts.root;
  }
  if (opts?.kind) {
    kind = opts.kind;
  }

  const comptroller =
    opts?.comptroller == undefined
      ? await makeComptroller(opts?.comptrollerOpts)
      : opts.comptroller;

  const interestRateModel =
    opts?.interestRateModel ||
    (await makeInterestRateModel(opts?.interestRateModelOpts));

  const exchangeRate = etherMantissa(dfn(opts?.exchangeRate, 1));
  const decimals = etherUnsigned(dfn(opts?.decimals, 8));
  const symbol = opts?.symbol || (kind === "bether" ? "bETH" : "bOMG");
  const name = opts?.name || `BToken ${symbol}`;
  admin = opts?.admin == undefined ? admin : opts?.admin;

  let bToken, underlying;
  let bDelegator, bDelegatee;
  let version = 0;

  switch (kind) {
    case "bether":
      const BToken = await ethers.getContractFactory(
        CONTRACT_NAMES.BETHER_HARNESS
      );
      bToken = <BEtherHarness>(
        await BToken.deploy(
          comptroller?.address,
          interestRateModel?.address,
          exchangeRate,
          name,
          symbol,
          decimals,
          admin.address
        )
      );
      break;

    case "bcapable":
      underlying = opts?.underlying || (await makeToken(opts?.underlyingOpts));
      const BCapableErc20Delegate = await ethers.getContractFactory(
        CONTRACT_NAMES.BCAPABLE_ERC20_DELEGATE
      );
      const bCapableErc20Delegate = <BCapableErc20Delegate>(
        await BCapableErc20Delegate.deploy()
      );
      await bCapableErc20Delegate.deployed();

      const BErc20Delegator = await ethers.getContractFactory(
        CONTRACT_NAMES.BERC20_DELEGATOR
      );
      const bErc20Delegator = <BErc20Delegator>(
        await BErc20Delegator.deploy(
          underlying.address,
          comptroller.address,
          interestRateModel.address,
          exchangeRate,
          name,
          symbol,
          decimals,
          admin.address,
          bCapableErc20Delegate.address,
          "0x0"
        )
      );
      await bErc20Delegator.deployed();
      // bToken update
      break;

    case "bcollateralcap":
      break;
  }
};

export const makePriceOracle = async () => {
  const SimpePriceOracle = await ethers.getContractFactory(
    CONTRACT_NAMES.SIMPLE_PRICE_ORACLE
  );
  const simplePriceOracle = <SimplePriceOracle>await SimpePriceOracle.deploy();
  return simplePriceOracle;
};

export const makeInterestRateModel = async (
  opts: InterestRateModel | undefined
) => {
  let [admin] = await ethers.getSigners();
  let kind = "harnessed";
  if (opts?.root) {
    admin = opts.root;
  }
  if (opts?.kind) {
    kind = opts.kind;
  }
  if (kind == "harnessed") {
    const borrowRate = etherMantissa(dfn(opts?.borrowRate, 0));
    const InterestRateModelHarness = await ethers.getContractFactory(
      CONTRACT_NAMES.INTEREST_RATE_MODEL_HARNESS
    );
    const interestRateModelHarness = <InterestRateModelHarness>(
      await InterestRateModelHarness.connect(admin).deploy(borrowRate)
    );
    await interestRateModelHarness.deployed();
    return interestRateModelHarness;
  }
  if (kind == "false-marker") {
    const FalseMarkerMethodInterestRateModel = await ethers.getContractFactory(
      CONTRACT_NAMES.FALSE_MARKER_METHOD_INTEREST_RATE_MODEL
    );
    const falseMarkerMethodInterestRateModel = <
      FalseMarkerMethodInterestRateModel
    >await FalseMarkerMethodInterestRateModel.connect(admin).deploy();
    await falseMarkerMethodInterestRateModel.deployed();
    return falseMarkerMethodInterestRateModel;
  }
  if (kind == "jump-rate") {
    const baseRate = etherMantissa(dfn(opts?.baseRate, 0));
    const multiplier = etherMantissa(dfn(opts?.multiplier, 1e-18));
    const jump = etherMantissa(dfn(opts?.jump, 0));
    const kink = etherMantissa(dfn(opts?.kink, 1));
    const roof = etherMantissa(dfn(opts?.roof, 1));
    const JumpRateModelV2 = await ethers.getContractFactory(
      CONTRACT_NAMES.JUMP_RATE_MODELV2
    );
    const jumpRateModelV2 = <JumpRateModelV2>(
      await JumpRateModelV2.connect(admin).deploy(
        baseRate,
        multiplier,
        jump,
        kink,
        roof
      )
    );
    await jumpRateModelV2.deployed();
    return jumpRateModelV2;
  }
  // kind == "triple-slope"
  const baseRate = etherMantissa(dfn(opts?.baseRate, 0));
  const multiplier = etherMantissa(dfn(opts?.multiplier, 0.1));
  const jump = etherMantissa(dfn(opts?.jump, 0));
  const kink1 = etherMantissa(dfn(opts?.kink1, 1));
  const kink2 = etherMantissa(dfn(opts?.kink2, 1));
  const roof = etherMantissa(dfn(opts?.roof, 1));
  const TripleSlopeRateModel = await ethers.getContractFactory(
    CONTRACT_NAMES.TRIPLE_SLOPE_RATE_MODEL
  );
  const tripleSlopeRateModel = <TripleSlopeRateModel>(
    await TripleSlopeRateModel.connect(admin).deploy(
      baseRate,
      multiplier,
      jump,
      kink1,
      kink2,
      roof
    )
  );
  await tripleSlopeRateModel.deployed();
  return tripleSlopeRateModel;
};

export const makeToken = async (opts?: TokenOpts) => {
  let [admin] = await ethers.getSigners();
  let kind = "berc20";
  if (opts?.root) {
    admin = opts.root;
  }
  if (opts?.kind) {
    kind = opts.kind;
  }

  if (kind == "erc20") {
    const quantity = etherUnsigned(dfn(opts?.quantity, 1e25));
    const decimals = etherUnsigned(dfn(opts?.decimals, 18));
    const symbol = opts?.symbol || "OMG";
    const name = opts?.name || `Erc20 ${symbol}`;
    const ERC20Harness = await ethers.getContractFactory(
      CONTRACT_NAMES.ERC20_HARNESS
    );
    const erc20Harness = <ERC20Harness>(
      await ERC20Harness.connect(admin).deploy(quantity, name, decimals, symbol)
    );
    await erc20Harness.deployed();
    return erc20Harness;
  } else if (kind == "curveToken") {
    const quantity = etherUnsigned(dfn(opts?.quantity, 1e25));
    const decimals = etherUnsigned(dfn(opts?.decimals, 18));
    const symbol = opts?.symbol || "crvIB";
    const name = opts?.name || `Curve ${symbol}`;
    const CurveTokenHarness = await ethers.getContractFactory(
      CONTRACT_NAMES.CURVE_TOKEN_HARNESS
    );
    const curveTokenHarness = <CurveTokenHarness>(
      await CurveTokenHarness.connect(admin).deploy(
        quantity,
        name,
        decimals,
        symbol,
        opts?.crvOpts == undefined ? admin.address : opts.crvOpts.minter
      )
    );
    await curveTokenHarness.deployed();
    return curveTokenHarness;
  } else if (kind == "yvaultToken") {
    const quantity = etherUnsigned(dfn(opts?.quantity, 1e25));
    const decimals = etherUnsigned(dfn(opts?.decimals, 18));
    const symbol = opts?.symbol || "yvIB";
    const version = (opts?.yvOpts && opts.yvOpts.version) || "v1";
    const name = opts?.name || `yVaul ${version} ${symbol}`;

    const underlying =
      (opts?.yvOpts && opts.yvOpts.underlying) || (await makeToken());
    const price = dfn(opts?.yvOpts && opts.yvOpts.price, 1e18);
    if (version == "v1") {
      const YVaultV1TokenHarness = await ethers.getContractFactory(
        CONTRACT_NAMES.YVAULT_V1_TOKEN_HARNESS
      );
      const yvaultV1TokenHarness = <YVaultV1TokenHarness>(
        await YVaultV1TokenHarness.connect(admin).deploy(
          quantity,
          name,
          decimals,
          symbol,
          underlying?.address,
          price
        )
      );
      await yvaultV1TokenHarness.deployed();
      return yvaultV1TokenHarness;
    } else {
      const YVaultV2TokenHarness = await ethers.getContractFactory(
        CONTRACT_NAMES.YVAULT_V2_TOKEN_HARNESS
      );
      const yvaultv2TokenHarness = <YVaultV2TokenHarness>(
        await YVaultV2TokenHarness.connect(admin).deploy(
          quantity,
          name,
          decimals,
          symbol,
          underlying?.address,
          price
        )
      );
      await yvaultv2TokenHarness.deployed();
      return yvaultv2TokenHarness;
    }
  } else if (kind == "wrapped") {
    const Weth9 = await ethers.getContractFactory(CONTRACT_NAMES.WETH9);
    const weth9 = <WETH9>await Weth9.connect(admin).deploy();
    await weth9.deployed();
    return weth9;
  } else if (kind == "nonstandard") {
    const quantity = etherUnsigned(dfn(opts?.quantity, 1e25));
    const decimals = etherUnsigned(dfn(opts?.decimals, 18));
    const symbol = opts?.symbol || "MITH";
    const name = opts?.name || `Erc20 ${symbol}`;
    const FaucetNonStandardToken = await ethers.getContractFactory(
      CONTRACT_NAMES.FAUCET_NON_STANDARD_TOKEN
    );
    const faucetNonStandardToken = <FaucetNonStandardToken>(
      await FaucetNonStandardToken.connect(admin).deploy(
        quantity,
        name,
        decimals,
        symbol
      )
    );
    await faucetNonStandardToken.deployed();
    return faucetNonStandardToken;
  } else if (kind == "lp") {
    const quantity = etherUnsigned(dfn(opts?.quantity, 1e25));
    const decimals = etherUnsigned(dfn(opts?.decimals, 18));
    const symbol = opts?.symbol || "UNI-V2-LP";
    const name = opts?.name || "Uniswap v2 LP";
    const LPTokenHarness = await ethers.getContractFactory(
      CONTRACT_NAMES.LP_TOKEN_HARNESS
    );
    const lpTokenHarness = <LPTokenHarness>(
      await LPTokenHarness.connect(admin).deploy(
        quantity,
        name,
        decimals,
        symbol
      )
    );
    await lpTokenHarness.deployed();
    return lpTokenHarness;
  }

  // kind == "evil"
  const quantity = etherUnsigned(dfn(opts?.quantity, 1e25));
  const decimals = etherUnsigned(dfn(opts?.decimals, 18));
  const symbol = opts?.symbol || "Evil";
  const name = opts?.name || "Evil Token";
  const EvilTransferToken = await ethers.getContractFactory(
    CONTRACT_NAMES.EVIL_TRANSFER_TOKEN
  );
  const evilTransferToken = <EvilTransferToken>(
    await EvilTransferToken.connect(admin).deploy(
      quantity,
      name,
      decimals,
      symbol
    )
  );
  await evilTransferToken.deployed();
  return evilTransferToken;
};

function etherMantissa(num: number, scale = 1e18) {
  if (num < 0) return BigNumber.from(2).pow(256).add(num);
  return BigNumber.from(num).mul(scale);
}

function etherUnsigned(num: number) {
  return BigNumber.from(num);
}

function dfn(val: number | undefined, def: number) {
  val = val || 0;
  return isFinite(val) ? val : def;
}
