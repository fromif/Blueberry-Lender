const { parseEther, parseUnits } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

async function deployUnitroller() {
  const Unitroller = await ethers.getContractFactory("Unitroller");
  const unitroller = await Unitroller.deploy();

  await unitroller.deployed();

  return unitroller;
}

async function deployComptroller() {
  const Comptroller = await ethers.getContractFactory("Comptroller");
  const comptroller = await Comptroller.deploy();

  await comptroller.deployed();

  return comptroller;
}

async function deployPriceOracle(poster) {
  const PriceOracle = await ethers.getContractFactory(
    "contracts/PriceOracle/v1PriceOracle.sol:PriceOracle"
  );
  const priceOracle = await PriceOracle.deploy(poster);

  await priceOracle.deployed();

  return priceOracle;
}

async function deployPriceOracleProxyUSD(admin, v1PriceOracle, aggregator) {
  const PriceOracleProxyUSD = await ethers.getContractFactory(
    "PriceOracleProxyUSD"
  );
  const priceOracleProxyUSD = await PriceOracleProxyUSD.deploy(
    admin,
    v1PriceOracle,
    aggregator
  );

  await priceOracleProxyUSD.deployed();

  return priceOracleProxyUSD;
}

async function deployBTokenAdmin(admin) {
  const BTokenAdmin = await ethers.getContractFactory("BTokenAdmin");
  const bTokenAdmin = await BTokenAdmin.deploy(admin);
  await bTokenAdmin.deployed();
  return bTokenAdmin;
}

async function deployCompoundLens() {
  const CompoundLens = await ethers.getContractFactory("CompoundLens");
  const compoundLens = await CompoundLens.deploy();
  await compoundLens.deployed();
  return compoundLens;
}

async function deployInterestRateModel() {
  let baseRate = 0;
  let multiplier = parseEther("0.15");
  let jump = parseEther("5");
  let kink1 = parseEther("0.8");
  let kink2 = parseEther("0.9");
  let roof = parseEther("1.5");

  const TripleSlopeRateModel = await ethers.getContractFactory(
    "TripleSlopeRateModel"
  );

  const majorInterestRateModel = await TripleSlopeRateModel.deploy(
    baseRate,
    multiplier.mul(kink1).div(parseEther("1")),
    jump,
    kink1,
    kink2,
    roof
  );
  await majorInterestRateModel.deployed();

  multiplier = parseEther("0.18");
  jump = parseEther("8");

  const stableInterestRateModel = await TripleSlopeRateModel.deploy(
    baseRate,
    multiplier.mul(kink1).div(parseEther("1")),
    jump,
    kink1,
    kink2,
    roof
  );
  await stableInterestRateModel.deployed();

  multiplier = parseEther("0.2");
  jump = parseEther("5");
  kink1 = parseEther("0.7");
  kink2 = parseEther("0.8");

  const govInterestRateModel = await TripleSlopeRateModel.deploy(
    baseRate,
    multiplier.mul(kink1).div(parseEther("1")),
    jump,
    kink1,
    kink2,
    roof
  );
  await govInterestRateModel.deployed();

  return {
    major: majorInterestRateModel,
    stable: stableInterestRateModel,
    gov: govInterestRateModel,
  };
}

async function deployBToken(
  underlying,
  comptroller,
  interestRateModel,
  bName,
  bSymbol,
  bDecimal,
  bTokenAdmin
) {
  const underlyingToken = await ethers.getContractAt(
    "EIP20Interfface",
    underlying
  );
  const underlyingTokenDecimal = await underlyingToken.decimals();

  const initialExchangeRate = parseUnits(
    "0.01",
    18 + underlyingTokenDecimal - bDecimal
  );

  const BCollateralCapErc20Delegate = await ethers.getContractFactory(
    "BCollateralCapErc20Delegate"
  );
  const bCollateralCapErc20Delegate =
    await BCollateralCapErc20Delegate.deploy();
  await bCollateralCapErc20Delegate.deployed();

  const BErc20Delegator = await ethers.getContractFactory("BErc20Delegator");
  const bErc20Delegator = await BErc20Delegator.deploy(
    underlying,
    comptroller,
    interestRateModel,
    initialExchangeRate,
    bName,
    bSymbol,
    bDecimal,
    bTokenAdmin,
    bCollateralCapErc20Delegate.address,
    "0x00"
  );
  await bErc20Delegator.deployed();

  return bErc20Delegator;
}

async function deployWrapped(
  underlying,
  comptroller,
  interestRateModel,
  bName,
  bSymbol,
  bDecimal,
  bTokenAdmin
) {
  const underlyingToken = await ethers.getContractAt(
    "EIP20Interfface",
    underlying
  );
  const underlyingTokenDecimal = await underlyingToken.decimals();

  const initialExchangeRate = parseUnits(
    "0.01",
    18 + underlyingTokenDecimal - bDecimal
  );

  const BWrappedNativeDelegate = await ethers.getContractFactory(
    "BWrappedNativeDelegate"
  );
  const bWrappedNativeDelegate = await BWrappedNativeDelegate.deploy();
  await bWrappedNativeDelegate.deployed();

  const BWrappedNativeDelegator = await ethers.getContractFactory(
    "BWrappedNativeDelegator"
  );
  const bWrappedNativeDelegator = await BWrappedNativeDelegator.deploy(
    underlying,
    comptroller,
    interestRateModel,
    initialExchangeRate,
    bName,
    bSymbol,
    bDecimal,
    bTokenAdmin,
    bWrappedNativeDelegate.address,
    "0x00"
  );
  await bWrappedNativeDelegator.deployed();
  return bWrappedNativeDelegator;
}

async function main() {
  const admin = "0xd830A7413CB25FEe57f8115CD64E565B0Be466c3";
  const guardian = "0x0501Be0dA35990FbF5c434c29186A7966846c0D5";
  const poster = "0xd830A7413CB25FEe57f8115CD64E565B0Be466c3";
  const ethAggregator = "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e";
  const usdc = "0x2f3A40A3db8a7e3D09B0adfEfbCe4f6F81927557";
  const weth = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6";

  const unitroller = await deployUnitroller();
  const comptroller = await deployComptroller();
  const priceOracle = await deployPriceOracle(poster);
  const priceOracleProxyUSD = await deployPriceOracleProxyUSD(
    admin,
    priceOracle.address,
    ethAggregator
  );
  const bTokenAdmin = await deployBTokenAdmin(admin);
  await deployCompoundLens();

  // Set comptroller
  await unitroller._setPendingImplementation(comptroller.address);
  await comptroller._become(unitroller.address);

  const closeFactor = parseEther("0.5");
  const liquidiationIncentive = parseEther("1.08");

  await comptroller._setCloseFactor(closeFactor);
  await comptroller._setLiquidationIncentive(liquidiationIncentive);
  await comptroller._setPriceOracle(priceOracleProxyUSD.address);
  await comptroller._setGuardian(guardian);

  const IRMs = await deployInterestRateModel();

  // Deploy USDC
  const bUSDC = await deployBToken(
    usdc,
    comptroller.address,
    IRMs.stable.address,
    "Blueberry USDC",
    "bUSDC",
    6,
    bTokenAdmin.address
  );

  // Deploy WETH
  const bWETH = await deployWrapped(
    weth,
    comptroller.address,
    IRMs.major.address,
    "Blueberry Wrapped Ether",
    "bWETH",
    18,
    bTokenAdmin.address
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
