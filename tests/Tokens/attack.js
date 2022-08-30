const {
  etherMantissa
} = require('../Utils/Ethereum');

const {
  makeBToken,
  makeComptroller,
  makeEvilAccount,
  makeEvilAccount2
} = require('../Utils/Compound');

const collateralFactor = 0.5, underlyingPrice = 1, mintAmount = 2, borrowAmount = 1;

describe('Attack', function () {
  let root, accounts;
  let comptroller;
  let bEth, bWeth, bEvil;
  let evilAccount;

  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
    comptroller = await makeComptroller({closeFactor: 0.5});
    bEth = await makeBToken({comptroller, kind: 'bether', supportMarket: true, collateralFactor});
    bWeth = await makeBToken({comptroller, kind: 'berc20', supportMarket: true, collateralFactor, underlyingPrice});
    bEvil = await makeBToken({comptroller, kind: 'bevil', supportMarket: true, collateralFactor, underlyingPrice});
    evilAccount = await makeEvilAccount({crEth: bEth, crEvil: bEvil, borrowAmount: etherMantissa(borrowAmount)});

    // Align the block number.
    const blockNumber = await call(bEth, 'blockNumber');
    await send(bWeth, 'harnessSetBlockNumber', [blockNumber]);
    await send(bEvil, 'harnessSetBlockNumber', [blockNumber]);
  });

  it('reentry borrow attack', async () => {
    await send(bEvil.underlying, 'allocateTo', [accounts[0], etherMantissa(100)]);
    await send(bEvil.underlying, 'approve', [bEvil._address, etherMantissa(100)], {from: accounts[0]});
    await send(bEvil, 'mint', [etherMantissa(100)], {from: accounts[0]});

    // Actually, this attack will emit a Failure event with value (3: COMPTROLLER_REJECTION, 6: BORROW_COMPTROLLER_REJECTION, 4: INSUFFICIENT_LIQUIDITY).
    // However, somehow it failed to parse the event.
    await send(bEvil.underlying, 'turnSwitchOn');
    await send(evilAccount, 'attackBorrow', [], {value: etherMantissa(mintAmount)});

    // The attack should have no effect.
    ({1: liquidity, 2: shortfall} = await call(comptroller, 'getAccountLiquidity', [evilAccount._address]));
    expect(liquidity).toEqualNumber(0);
    expect(shortfall).toEqualNumber(0);
  });

  it('reentry liquidate attack', async () => {
    /**
     * In this test, a victim supplied 20 WETH (collateral = 10) and borrowed 5 Evil and 5 WETH, which used all of his collateral.
     * Next, we changed the price of Evil (1 to 1.1) to make the victim liquidatable. If a successful attack happened, an attacker
     * could liquidate 2.5 Evil and 2.5 WETH. It's similiar to bypass the close factor since the victim only have 0.5 shortfall.
     *
     * In our new BCollateralCapErc20CheckRepay, it could prevent such an attack. If a re-entry liquidation attacked happened,
     * it should revert with 'borrower has no shortfall' during the second liquidation.
     *
     * After that, we could use an EOA to liquidate the victim for 2.5 Evil (or 2.5 WETH).
     */
    const victim = accounts[0];
    const liquidator = accounts[1];
    const repayAmount = etherMantissa(2.5);
    const evilAccount2 = await makeEvilAccount2({crWeth: bWeth, crEvil: bEvil, borrower: victim, repayAmount: repayAmount});

    // Supply 20 WETH.
    await send(bWeth.underlying, 'harnessSetBalance', [victim, etherMantissa(20)]);
    await send(bWeth.underlying, 'approve', [bWeth._address, etherMantissa(20)], {from: victim});
    await send(bWeth, 'mint', [etherMantissa(20)], {from: victim});
    await send(comptroller, 'enterMarkets', [[bWeth._address]], {from: victim});

    // Borrow 5 WETH and 5 Evil.
    await send(bWeth, 'borrow', [etherMantissa(5)], {from: victim});
    await send(bEvil.underlying, 'allocateTo', [bEvil._address, etherMantissa(5)]);
    await send(bEvil, 'gulp');
    await send(bEvil, 'borrow', [etherMantissa(5)], {from: victim});

    // Check account liquidity: no more liquidity and no shortfall at this moment.
    ({1: liquidity, 2: shortfall} = await call(comptroller, 'getAccountLiquidity', [victim]));
    expect(liquidity).toEqualNumber(0);
    expect(shortfall).toEqualNumber(0);

    // Change the Evil price to make the victim could be liqudated.
    const newUnderlyingPrice = 1.1;
    await send(comptroller.priceOracle, 'setUnderlyingPrice', [bEvil._address, etherMantissa(newUnderlyingPrice)]);

    // Confirm the victim has shortfall.
    ({1: liquidity, 2: shortfall} = await call(comptroller, 'getAccountLiquidity', [victim]));
    expect(liquidity).toEqualNumber(0);
    expect(shortfall).toEqualNumber(etherMantissa(0.5));

    // Attack the victim through liquidation.
    await send(bWeth.underlying, 'harnessSetBalance', [evilAccount2._address, etherMantissa(10)]);
    await send(bEvil.underlying, 'allocateTo', [evilAccount2._address, etherMantissa(10)]);
    await send(bEvil.underlying, 'turnSwitchOn');
    await expect(send(evilAccount2, 'attackLiquidate')).rejects.toRevert('revert borrower has no shortfall');

    // The re-entry liquidation attack failed. The victim still has shortfall.
    ({1: liquidity, 2: shortfall} = await call(comptroller, 'getAccountLiquidity', [victim]));
    expect(liquidity).toEqualNumber(0);
    expect(shortfall).toEqualNumber(etherMantissa(0.5));

    // We use an EOA to liquidate the victim.
    await send(bEvil.underlying, 'allocateTo', [liquidator, repayAmount]);
    await send(bEvil.underlying, 'approve', [bEvil._address, repayAmount], {from: liquidator});
    await send(bEvil.underlying, 'turnSwitchOff');
    await send(bEvil, 'liquidateBorrow', [victim, repayAmount, bWeth._address], {from: liquidator});

    // The normal liquidation succeeded. The victim should have no shortfall now.
    ({1: liquidity, 2: shortfall} = await call(comptroller, 'getAccountLiquidity', [victim]));
    expect(liquidity).toEqualNumber(etherMantissa(0.875));
    expect(shortfall).toEqualNumber(0);
  });
});
