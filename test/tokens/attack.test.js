const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");
const { CONTRACT_NAMES } = require("../../constants");
const {
  makeComptroller,
  makeBToken,
  makeEvilAccount,
  makeEvilAccount2,
} = require("../utils/compound");
const { etherMantissa } = require("../utils/ethereum");

const collateralFactor = 0.5,
  underlyingPrice = 1,
  mintAmount = 2,
  borrowAmount = 1;

describe("Attack", function () {
  let root, accounts;
  let comptroller;
  let bEth, bWeth, bEvil;
  let evilAccount;

  beforeEach(async () => {
    [root, ...accounts] = await ethers.getSigners();
    comptroller = await makeComptroller({ closeFactor: 0.5 });
    bEth = await makeBToken({
      comptroller,
      kind: "bether",
      supportMarket: true,
      collateralFactor,
    });
    bWeth = await makeBToken({
      comptroller,
      kind: "berc20",
      supportMarket: true,
      collateralFactor,
      underlyingPrice,
    });
    bEvil = await makeBToken({
      comptroller,
      kind: "bevil",
      supportMarket: true,
      collateralFactor,
      underlyingPrice,
    });
    evilAccount = await makeEvilAccount({
      crEth: bEth,
      crEvil: bEvil,
      borrowAmount: etherMantissa(borrowAmount),
    });

    // // Align the block number.
    const blockNumber = await bEth.blockNumber();
    await bWeth.harnessSetBlockNumber(blockNumber);
    await bEvil.harnessSetBlockNumber(blockNumber);
  });

  it("reentry borrow attack", async () => {
    const underlyingAddr = await bEvil.underlying();
    const underlying = await ethers.getContractAt(
      CONTRACT_NAMES.EVIL_TRANSFER_TOKEN,
      underlyingAddr
    );
    await underlying.allocateTo(accounts[0].address, etherMantissa(100));
    await underlying
      .connect(accounts[0])
      .approve(bEvil.address, etherMantissa(100));
    await bEvil.connect(accounts[0]).mint(etherMantissa(100));
    // Actually, this attack will emit a Failure event with value (3: COMPTROLLER_REJECTION, 6: BORROW_COMPTROLLER_REJECTION, 4: INSUFFICIENT_LIQUIDITY).
    // However, somehow it failed to parse the event.
    await underlying.turnSwitchOn();
    await expect(
      evilAccount.attackBorrow({ value: etherMantissa(mintAmount) })
    ).to.be.revertedWith("price error");
    // The attack should have no effect.
    [, liquidity, shortfall] = await comptroller.getAccountLiquidity(
      evilAccount.address
    );
    expect(liquidity).to.be.equal(0);
    expect(shortfall).to.be.equal(0);
  });

  it("reentry liquidate attack", async () => {
    /**
     * In this test, a victim supplied 20 WETH (collateral = 10) and borrowed 5 Evil and 5 WETH, which used all of his collateral.
     * Next, we changed the price of Evil (1 to 1.1) to make the victim liquidatable. If a successful attack happened, an attacker
     * could liquidate 2.5 Evil and 2.5 WETH. It's similiar to bypass the close factor since the victim only have 0.5 shortfall.
     *
     * In our new CCollateralCapErc20CheckRepay, it could prevent such an attack. If a re-entry liquidation attacked happened,
     * it should revert with 'borrower has no shortfall' during the second liquidation.
     *
     * After that, we could use an EOA to liquidate the victim for 2.5 Evil (or 2.5 WETH).
     */
    const victim = accounts[0];
    const liquidator = accounts[1];
    const repayAmount = etherMantissa(2.5);
    const evilAccount2 = await makeEvilAccount2({
      crWeth: bWeth,
      crEvil: bEvil,
      borrower: victim.address,
      repayAmount: repayAmount,
    });

    // Supply 20 WETH.
    const bWethUnderlyingAddr = await bWeth.underlying();
    const bWethUnderlying = await ethers.getContractAt(
      CONTRACT_NAMES.WETH9,
      bWethUnderlyingAddr
    );
    await bWethUnderlying.harnessSetBalance(victim.address, etherMantissa(20));
    await bWethUnderlying
      .connect(victim)
      .approve(bWeth.address, etherMantissa(20));
    await bWeth.connect(victim).mint(etherMantissa(20));
    await comptroller.connect(victim).enterMarkets([bWeth.address]);

    // Borrow 5 WETH and 5 Evil.
    await bWeth.connect(victim).borrow(etherMantissa(5));
    const bEvilUnderlyingAddr = await bEvil.underlying();
    const bEvilUnderlying = await ethers.getContractAt(
      CONTRACT_NAMES.EVIL_TRANSFER_TOKEN,
      bEvilUnderlyingAddr
    );
    await bEvilUnderlying.allocateTo(bEvil.address, etherMantissa(5));
    await bEvil.gulp();
    await bEvil.connect(victim).borrow(etherMantissa(5));

    // Check account liquidity: no more liquidity and no shortfall at this moment.
    [, liquidity, shortfall] = await comptroller.getAccountLiquidity(
      victim.address
    );
    expect(liquidity).to.be.equal(0);
    expect(shortfall).to.be.equal(0);

    // Change the Evil price to make the victim could be liqudated.
    const newUnderlyingPrice = 1.1;
    const priceOracleAddr = await comptroller.oracle();
    const priceOracle = await ethers.getContractAt(
      CONTRACT_NAMES.SIMPLE_PRICE_ORACLE,
      priceOracleAddr
    );
    await priceOracle.setUnderlyingPrice(
      bEvil.address,
      etherMantissa(newUnderlyingPrice)
    );

    // Confirm the victim has shortfall.
    [, liquidity, shortfall] = await comptroller.getAccountLiquidity(
      victim.address
    );
    expect(liquidity).to.be.equal(0);
    expect(shortfall.sub(etherMantissa(0.5))).to.be.lessThan(1e6);

    // Attack the victim through liquidation.
    await bWethUnderlying.harnessSetBalance(
      evilAccount2.address,
      etherMantissa(10)
    );
    await bEvilUnderlying.allocateTo(evilAccount2.address, etherMantissa(10));
    await bEvilUnderlying.turnSwitchOn();
    await expect(evilAccount2.attackLiquidate()).to.be.revertedWith(
      "borrower has no shortfall"
    );

    // The re-entry liquidation attack failed. The victim still has shortfall.
    [, liquidity, shortfall] = await comptroller.getAccountLiquidity(
      victim.address
    );
    expect(liquidity).to.be.equal(0);
    expect(shortfall.sub(etherMantissa(0.5))).to.be.lessThan(1e6);

    // We use an EOA to liquidate the victim.
    await bEvilUnderlying.allocateTo(liquidator.address, repayAmount);
    await bEvilUnderlying
      .connect(liquidator)
      .approve(bEvil.address, repayAmount);
    await bEvilUnderlying.turnSwitchOff();
    await bEvil
      .connect(liquidator)
      .liquidateBorrow(victim.address, repayAmount, bWeth.address);

    // The normal liquidation succeeded. The victim should have no shortfall now.
    [, liquidity, shortfall] = await comptroller.getAccountLiquidity(
      victim.address
    );
    const diff = liquidity.sub(etherMantissa(0.875));
    if (BigNumber.from(0).gte(diff)) {
      expect(diff).to.be.above(-1e6);
    } else {
      expect(diff).to.be.lessThan(1e6);
    }
    expect(shortfall).to.be.equal(0);
  });
});
