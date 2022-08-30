const {
  etherUnsigned,
  etherMantissa,
  mergeInterface,
} = require('../Utils/Ethereum');

const {
  makeBToken,
  makeFlashloanReceiver,
  balanceOf,
} = require('../Utils/Compound');

describe('Flashloan test', function () {
  let admin;
  let nonAdmin;
  let bToken;
  let flashloanReceiver;
  let cash = 1000_000;
  let cashOnChain = 1000_000;
  let receiverBalance = 100;
  let reservesFactor = 0.5;

  beforeEach(async () => {
    admin = saddle.accounts[0];
    nonAdmin = saddle.accounts[1];
    other = saddle.accounts[2];
    bToken = await makeBToken({kind: 'bcollateralcap', supportMarket: true});
    flashloanReceiver = await makeFlashloanReceiver()

    // so that we can format bToken event logs
    mergeInterface(flashloanReceiver, bToken)

    await send(bToken.underlying, 'harnessSetBalance', [bToken._address, cashOnChain]);
    await send(bToken, 'harnessSetInternalCash', [cash]);
    await send(bToken, 'harnessSetBlockNumber', [etherUnsigned(1e6)]);
    await send(bToken, 'harnessSetAccrualBlockNumber', [etherUnsigned(1e6)]);
    await send(bToken, 'harnessSetReserveFactorFresh', [etherMantissa(reservesFactor)]);

    await send(bToken.underlying, 'harnessSetBalance', [flashloanReceiver._address, receiverBalance]);
  });

  describe('test FlashLoanLender interface', ()=>{
    let unsupportedBToken;
    beforeEach(async () => {
      unsupportedBToken = await makeBToken({kind: 'bcollateralcap', supportMarket: true});
    })
    it("test maxFlashLoan return 0 for unsupported token", async () => {
      expect(await call(bToken, 'maxFlashLoan', [unsupportedBToken.underlying._address])).toEqualNumber(0);
      expect(await call(bToken, 'maxFlashLoan', [bToken.underlying._address])).toEqualNumber(cashOnChain);
    });
    it("test flashFee revert for unsupported token", async () => {
      const borrowAmount = 10_000;
      const totalFee = 3
      await expect(call(bToken, 'flashFee', [unsupportedBToken.underlying._address, borrowAmount])).rejects.toRevert('revert unsupported currency');
      expect(await call(bToken, 'flashFee', [bToken.underlying._address, borrowAmount])).toEqualNumber(totalFee);
    });
  })

  describe('internal cash equal underlying balance', () => {
    it("repay correctly", async () => {
      const borrowAmount = 10_000;
      const totalFee = 3
      const reservesFee = 1
      const result = await send(flashloanReceiver, 'doFlashloan', [bToken._address, borrowAmount, borrowAmount + totalFee])

      expect(result).toHaveLog('Flashloan', {
        receiver: flashloanReceiver._address,
        amount: borrowAmount,
        totalFee: totalFee,
        reservesFee: reservesFee,
      })

      expect(await balanceOf(bToken.underlying, bToken._address)).toEqualNumber(cashOnChain + totalFee)
      expect(await call(bToken, 'getCash', [])).toEqualNumber(cash + totalFee)
      expect(await call(bToken, 'totalReserves', [])).toEqualNumber(reservesFee)
      expect(await balanceOf(bToken.underlying, flashloanReceiver._address)).toEqualNumber(receiverBalance - totalFee)
    });


    it("repay correctly, total fee is truncated", async () => {
      const borrowAmount = 1000;
      const totalFee = 0;
      const reservesFee = 0;
      const result = await send(flashloanReceiver, 'doFlashloan', [bToken._address, borrowAmount, borrowAmount + totalFee])

      expect(result).toHaveLog('Flashloan', {
        receiver: flashloanReceiver._address,
        amount: borrowAmount,
        totalFee: totalFee,
        reservesFee: reservesFee,
      })

      expect(await balanceOf(bToken.underlying, bToken._address)).toEqualNumber(cashOnChain + totalFee)
      expect(await call(bToken, 'getCash', [])).toEqualNumber(cash + totalFee)
      expect(await call(bToken, 'totalReserves', [])).toEqualNumber(reservesFee)
      expect(await balanceOf(bToken.underlying, flashloanReceiver._address)).toEqualNumber(receiverBalance - totalFee)
    });

    it("repay correctly, reserve fee is truncated", async () => {
      const borrowAmount = 3334;
      const totalFee = 1;
      const reservesFee = 0;
      const result = await send(flashloanReceiver, 'doFlashloan', [bToken._address, borrowAmount, borrowAmount + totalFee])

      expect(result).toHaveLog('Flashloan', {
        receiver: flashloanReceiver._address,
        amount: borrowAmount,
        totalFee: totalFee,
        reservesFee: reservesFee,
      })

      expect(await balanceOf(bToken.underlying, bToken._address)).toEqualNumber(cashOnChain + totalFee)
      expect(await call(bToken, 'getCash', [])).toEqualNumber(cash + totalFee)
      expect(await call(bToken, 'totalReserves', [])).toEqualNumber(reservesFee)
      expect(await balanceOf(bToken.underlying, flashloanReceiver._address)).toEqualNumber(receiverBalance - totalFee)
    });


    it("borrow exceed cash", async () => {
      const borrowAmount = cash + 1;
      const totalFee = 3
      const result = send(flashloanReceiver, 'doFlashloan', [bToken._address, borrowAmount, borrowAmount + totalFee])
      await expect(result).rejects.toRevert('revert insufficient cash')
    })


  });

  describe('internal cash less than underlying balance', () => {

    beforeEach(async () => {
      // increase underlying balance without setting internal cash
      cashOnChain = cash + 100
      await send(bToken.underlying, 'harnessSetBalance', [bToken._address, cashOnChain])
    })

    afterEach(async () => {
      cashOnChain = cash
    })

    it("repay correctly", async () => {
      const borrowAmount = 10_000;
      const totalFee = 3
      const reservesFee = 1
      const result = await send(flashloanReceiver, 'doFlashloan', [bToken._address, borrowAmount, borrowAmount + totalFee])

      expect(result).toHaveLog('Flashloan', {
        receiver: flashloanReceiver._address,
        amount: borrowAmount,
        totalFee: totalFee,
        reservesFee: reservesFee,
      })

      expect(await balanceOf(bToken.underlying, bToken._address)).toEqualNumber(cashOnChain + totalFee)
      expect(await call(bToken, 'getCash', [])).toEqualNumber(cash + totalFee)
      expect(await call(bToken, 'totalReserves', [])).toEqualNumber(reservesFee)
      expect(await balanceOf(bToken.underlying, flashloanReceiver._address)).toEqualNumber(receiverBalance - totalFee)
    });

    it("repay correctly, total fee is truncated", async () => {
      const borrowAmount = 1000;
      const totalFee = 0;
      const reservesFee = 0;
      const result = await send(flashloanReceiver, 'doFlashloan', [bToken._address, borrowAmount, borrowAmount + totalFee])

      expect(result).toHaveLog('Flashloan', {
        receiver: flashloanReceiver._address,
        amount: borrowAmount,
        totalFee: totalFee,
        reservesFee: reservesFee,
      })

      expect(await balanceOf(bToken.underlying, bToken._address)).toEqualNumber(cashOnChain + totalFee)
      expect(await call(bToken, 'getCash', [])).toEqualNumber(cash + totalFee)
      expect(await call(bToken, 'totalReserves', [])).toEqualNumber(reservesFee)
      expect(await balanceOf(bToken.underlying, flashloanReceiver._address)).toEqualNumber(receiverBalance - totalFee)
    });

    it("repay correctly, reserve fee is truncated", async () => {
      const borrowAmount = 3334;
      const totalFee = 1;
      const reservesFee = 0;
      const result = await send(flashloanReceiver, 'doFlashloan', [bToken._address, borrowAmount, borrowAmount + totalFee])

      expect(result).toHaveLog('Flashloan', {
        receiver: flashloanReceiver._address,
        amount: borrowAmount,
        totalFee: totalFee,
        reservesFee: reservesFee,
      })

      expect(await balanceOf(bToken.underlying, bToken._address)).toEqualNumber(cashOnChain + totalFee)
      expect(await call(bToken, 'getCash', [])).toEqualNumber(cash + totalFee)
      expect(await call(bToken, 'totalReserves', [])).toEqualNumber(reservesFee)
      expect(await balanceOf(bToken.underlying, flashloanReceiver._address)).toEqualNumber(receiverBalance - totalFee)
    });


    it("borrow exceed cash", async () => {
      const borrowAmount = cash + 1;
      const totalFee = 3
      const result = send(flashloanReceiver, 'doFlashloan', [bToken._address, borrowAmount, borrowAmount + totalFee])
      await expect(result).rejects.toRevert('revert insufficient cash')
    })
  })

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
  let admin;

  beforeEach(async () => {
    admin = saddle.accounts[0];
    bToken = await makeBToken({kind: 'bcollateralcap', supportMarket: true});
    await send(bToken.underlying, 'harnessSetBalance', [bToken._address, cash]);
    await send(bToken, 'harnessSetInternalCash', [cash]);
    await send(bToken, 'harnessSetBlockNumber', [etherUnsigned(1e6)]);
    await send(bToken, 'harnessSetAccrualBlockNumber', [etherUnsigned(1e6)]);
  });

  it('flashloan and mint', async () => {
    const flashloanAndMint = await makeFlashloanReceiver({ kind: 'flashloan-and-mint'})
    const borrowAmount = 100;
    const result = send(flashloanAndMint, 'doFlashloan', [bToken._address, borrowAmount])
    await expect(result).rejects.toRevert('revert re-entered')
  })

  it('flashloan and repay borrow', async () => {
    const flashloanAndRepayBorrow = await makeFlashloanReceiver({ kind: 'flashloan-and-repay-borrow'})
    const borrowAmount = 100;
    const result = send(flashloanAndRepayBorrow, 'doFlashloan', [bToken._address, borrowAmount])
    await expect(result).rejects.toRevert('revert re-entered')
  })


  it('flashloan twice', async () => {
    const flashloanTwice = await makeFlashloanReceiver({ kind: 'flashloan-twice' })
    const borrowAmount = 100;
    const result = send(flashloanTwice, 'doFlashloan', [bToken._address, borrowAmount])
    await expect(result).rejects.toRevert('revert re-entered')
  })

})
