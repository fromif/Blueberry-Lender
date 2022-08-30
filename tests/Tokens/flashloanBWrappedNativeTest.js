const {
  etherUnsigned,
  etherMantissa,
  mergeInterface
} = require('../Utils/Ethereum');

const {
  makeBToken,
  makeFlashloanReceiver,
  balanceOf,
} = require('../Utils/Compound');

describe('Flashloan test', function () {
  let bToken;
  let flashloanReceiver;
  let cash = 1000_000;
  let receiverBalance = 100;
  let reservesFactor = 0.5;

  beforeEach(async () => {
    bToken = await makeBToken({kind: 'bwrapped', supportMarket: true});
    flashloanReceiver = await makeFlashloanReceiver({kind: 'native'});

    // so that we can format bToken event logs
    mergeInterface(flashloanReceiver, bToken);

    await send(bToken.underlying, 'harnessSetBalance', [bToken._address, cash]);
    await send(bToken, 'harnessSetBlockNumber', [etherUnsigned(1e6)]);
    await send(bToken, 'harnessSetAccrualBlockNumber', [etherUnsigned(1e6)]);
    await send(bToken, 'harnessSetReserveFactorFresh', [etherMantissa(reservesFactor)]);

    await send(bToken.underlying, 'harnessSetBalance', [flashloanReceiver._address, receiverBalance]);
  });

  describe('internal cash equal underlying balance', () => {
    it("repay correctly", async () => {
      const borrowAmount = 10_000;
      const totalFee = 3;
      const reservesFee = 1;
      const result = await send(flashloanReceiver, 'doFlashloan', [bToken._address, borrowAmount, borrowAmount + totalFee]);

      expect(result).toHaveLog('Flashloan', {
        receiver: flashloanReceiver._address,
        amount: borrowAmount,
        totalFee: totalFee,
        reservesFee: reservesFee,
      });

      expect(await balanceOf(bToken.underlying, bToken._address)).toEqualNumber(cash + totalFee);
      expect(await call(bToken, 'getCash', [])).toEqualNumber(cash + totalFee);
      expect(await call(bToken, 'totalReserves', [])).toEqualNumber(reservesFee);
      expect(await balanceOf(bToken.underlying, flashloanReceiver._address)).toEqualNumber(receiverBalance - totalFee);
    });

    it("repay correctly, total fee is truncated", async () => {
      const borrowAmount = 1000;
      const totalFee = 0;
      const reservesFee = 0;
      const result = await send(flashloanReceiver, 'doFlashloan', [bToken._address, borrowAmount, borrowAmount + totalFee]);

      expect(result).toHaveLog('Flashloan', {
        receiver: flashloanReceiver._address,
        amount: borrowAmount,
        totalFee: totalFee,
        reservesFee: reservesFee,
      });

      expect(await balanceOf(bToken.underlying, bToken._address)).toEqualNumber(cash + totalFee);
      expect(await call(bToken, 'getCash', [])).toEqualNumber(cash + totalFee);
      expect(await call(bToken, 'totalReserves', [])).toEqualNumber(reservesFee);
      expect(await balanceOf(bToken.underlying, flashloanReceiver._address)).toEqualNumber(receiverBalance - totalFee);
    });

    it("repay correctly, reserve fee is truncated", async () => {
      const borrowAmount = 3334;
      const totalFee = 1;
      const reservesFee = 0;
      const result = await send(flashloanReceiver, 'doFlashloan', [bToken._address, borrowAmount, borrowAmount + totalFee]);

      expect(result).toHaveLog('Flashloan', {
        receiver: flashloanReceiver._address,
        amount: borrowAmount,
        totalFee: totalFee,
        reservesFee: reservesFee,
      });

      expect(await balanceOf(bToken.underlying, bToken._address)).toEqualNumber(cash + totalFee);
      expect(await call(bToken, 'getCash', [])).toEqualNumber(cash + totalFee);
      expect(await call(bToken, 'totalReserves', [])).toEqualNumber(reservesFee);
      expect(await balanceOf(bToken.underlying, flashloanReceiver._address)).toEqualNumber(receiverBalance - totalFee);
    });


    it("borrow exceed cash", async () => {
      const borrowAmount = cash + 1;
      const totalFee = 3;
      const result = send(flashloanReceiver, 'doFlashloan', [bToken._address, borrowAmount, borrowAmount + totalFee]);
      await expect(result).rejects.toRevert('revert insufficient cash');
    })
  });

  it('reject by comptroller', async () => {
    const borrowAmount = 10_000;
    const totalFee = 3
    expect(await send(flashloanReceiver, 'doFlashloan', [bToken._address, borrowAmount, borrowAmount + totalFee])).toSucceed();

    await send(bToken.comptroller, '_setFlashloanPaused', [bToken._address, true]);

    await expect(send(flashloanReceiver, 'doFlashloan', [bToken._address, borrowAmount, borrowAmount + totalFee])).rejects.toRevert('revert flashloan is paused');

    await send(bToken.comptroller, '_setFlashloanPaused', [bToken._address, false]);

    expect(await send(flashloanReceiver, 'doFlashloan', [bToken._address, borrowAmount, borrowAmount + totalFee])).toSucceed();
  })
});

describe('Flashloan re-entry test', () => {
  let bToken;
  let cash = 1000_000;

  beforeEach(async () => {
    bToken = await makeBToken({kind: 'bwrapped', supportMarket: true});
    await send(bToken.underlying, 'harnessSetBalance', [bToken._address, cash]);
    await send(bToken, 'harnessSetBlockNumber', [etherUnsigned(1e6)]);
    await send(bToken, 'harnessSetAccrualBlockNumber', [etherUnsigned(1e6)]);
  });

  it('flashloan and mint', async () => {
    const flashloanAndMint = await makeFlashloanReceiver({kind: 'flashloan-and-mint-native'});
    const borrowAmount = 100;
    const result = send(flashloanAndMint, 'doFlashloan', [bToken._address, borrowAmount]);
    await expect(result).rejects.toRevert('revert re-entered');
  });

  it('flashloan and repay borrow', async () => {
    const flashloanAndRepayBorrow = await makeFlashloanReceiver({kind: 'flashloan-and-repay-borrow-native'});
    const borrowAmount = 100;
    const result = send(flashloanAndRepayBorrow, 'doFlashloan', [bToken._address, borrowAmount]);
    await expect(result).rejects.toRevert('revert re-entered');
  });

  it('flashloan twice', async () => {
    const flashloanTwice = await makeFlashloanReceiver({kind: 'flashloan-twice-native'});
    const borrowAmount = 100;
    const result = send(flashloanTwice, 'doFlashloan', [bToken._address, borrowAmount]);
    await expect(result).rejects.toRevert('revert re-entered');
  });
})
