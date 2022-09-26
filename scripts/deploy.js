const { parseEther, parseUnits } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

async function deployUnitroller() {
  const Unitroller = await ethers.getContractFactory("Unitroller");
  const unitroller = await Unitroller.deploy();

  await unitroller.deployed();
  console.log("Unitroller deployed at: ", unitroller.address);

  return unitroller;
}

async function deployComptroller() {
  const Comptroller = await ethers.getContractFactory("Comptroller");
  const comptroller = await Comptroller.deploy();

  await comptroller.deployed();
  console.log("Comptroller deployed at: ", comptroller.address);

  return comptroller;
}

async function deployPriceOracle(poster) {
  const PriceOracle = await ethers.getContractFactory(
    "contracts/PriceOracle/v1PriceOracle.sol:PriceOracle"
  );
  const priceOracle = await PriceOracle.deploy(poster);

  await priceOracle.deployed();
  console.log("PriceOracle deployed at: ", priceOracle.address);

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
  console.log("PriceOracleProxyUSD deployed at: ", priceOracleProxyUSD.address);

  return priceOracleProxyUSD;
}

async function deployBTokenAdmin(admin) {
  const BTokenAdmin = await ethers.getContractFactory("BTokenAdmin");
  const bTokenAdmin = await BTokenAdmin.deploy(admin);
  await bTokenAdmin.deployed();
  console.log("BTokenAdmin deployed at: ", bTokenAdmin.address);
  return bTokenAdmin;
}

async function deployCompoundLens() {
  const CompoundLens = await ethers.getContractFactory("CompoundLens");
  const compoundLens = await CompoundLens.deploy();
  await compoundLens.deployed();
  console.log("CompoundLens deployed at: ", compoundLens.address);
  return compoundLens;
}

async function deployInterestRateModel(
  baseRate,
  multiplier,
  jump,
  kink1,
  kink2,
  roof
) {
  const TripleSlopeRateModel = await ethers.getContractFactory(
    "TripleSlopeRateModel"
  );
  const interestRateModel = await TripleSlopeRateModel.deploy(
    baseRate,
    multiplier.mul(kink1).div(parseEther("1")),
    jump,
    kink1,
    kink2,
    roof
  );
  await interestRateModel.deployed();

  return interestRateModel;
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
  // const underlyingToken = await ethers.getContractAt(
  //   "EIP20Interface",
  //   underlying
  // );
  // const underlyingTokenDecimal = await underlyingToken.decimals();

  const initialExchangeRate = parseUnits(
    "0.01",
    18
  );

  // const BCollateralCapErc20Delegate = await ethers.getContractFactory(
  //   "BCollateralCapErc20Delegate"
  // );
  // const bCollateralCapErc20Delegate =
  //   await BCollateralCapErc20Delegate.deploy();
  // await bCollateralCapErc20Delegate.deployed();
  console.log(
    underlying,
    comptroller,
    interestRateModel,
    initialExchangeRate.toString(),
    bName,
    bSymbol,
    bDecimal,
    bTokenAdmin,
    "0xC8fC98Ef2C5C231A822E2882AC51A0900E1FA68A",
    "0x00"
  );
  // const BErc20Delegator = await ethers.getContractFactory("BErc20Delegator");
  // const bErc20Delegator = await BErc20Delegator.deploy(
  //   underlying,
  //   comptroller,
  //   interestRateModel,
  //   initialExchangeRate,
  //   bName,
  //   bSymbol,
  //   bDecimal,
  //   bTokenAdmin,
  //   bCollateralCapErc20Delegate.address,
  //   "0x00"
  // );
  // await bErc20Delegator.deployed();

  // return bErc20Delegator;
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
  // const admin = "0x99C59175EDefd208e38f988B15680Ba9B1Ecde67";
  // const guardian = "0xb0D0CEeaFdDa75825AdC8c310FFB2AE33217aDCB";
  // const poster = "0xA897ff9F840d5F9EdFEA208C9304A4f6e6Cf5123";
  // const ethAggregator = "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e";
  // const weth = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6";

  // const unitroller = await deployUnitroller();
  // const comptroller = await deployComptroller();
  // const priceOracle = await deployPriceOracle(poster);
  // const priceOracleProxyUSD = await deployPriceOracleProxyUSD(
  //   admin,
  //   priceOracle.address,
  //   ethAggregator
  // );
  // const bTokenAdmin = await deployBTokenAdmin(admin);
  // await deployCompoundLens();

  // // Set comptroller
  // await unitroller._setPendingImplementation(comptroller.address);
  // await comptroller._become(unitroller.address);

  // const closeFactor = parseEther("0.8");
  // const liquidiationIncentive = parseEther("1.08");

  // await comptroller._setCloseFactor(closeFactor);
  // await comptroller._setLiquidationIncentive(liquidiationIncentive);
  // await comptroller._setPriceOracle(priceOracleProxyUSD.address);
  // await comptroller._setGuardian(guardian);

  // Deploy USDC
  // let baseRate = 0;
  // let multiplier = parseEther("0.13");
  // let jump = parseEther("8");
  // let kink1 = parseEther("0.8");
  // let kink2 = parseEther("0.9");
  // let roof = parseEther("2");
  // const IRM = await deployInterestRateModel(
  //   baseRate,
  //   multiplier,
  //   jump,
  //   kink1,
  //   kink2,
  //   roof
  // );
  const usdc = "0x07865c6E87B9F70255377e024ace6630C1Eaa37F";
  const bUSDC = await deployBToken(
    usdc,
    "0x71Bba48b7DcEbC3E612DBC781FA5cEE5D3E3E566", // comptroller.address,
    "0xb734Bd2Ab32941c1B39c445aAB9738585e05fb6E", // IRM.address,
    "Blueberry USDC",
    "bUSDC",
    6,
    "0xa4C4D2E013281E3De5378AAa8edeC51CC4a59E5A" // bTokenAdmin.address
  );

  // console.log("bUSDC deployed at: ", bUSDC.address);

  // // Deploy WETH
  // const bWETH = await deployWrapped(
  //   weth,
  //   comptroller.address,
  //   IRMs.major.address,
  //   "Blueberry Wrapped Ether",
  //   "bWETH",
  //   18,
  //   bTokenAdmin.address
  // );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
