const {
  address,
  etherMantissa,
  etherUnsigned,
  etherGasCost
} = require('../Utils/Ethereum');
const {
  makeBToken,
  makeBTokenAdmin,
  makeComptroller,
  makeInterestRateModel,
  makeToken,
  setEtherBalance,
  getBalances,
  adjustBalances
} = require('../Utils/Compound');

describe('BTokenAdmin', () => {
  let bTokenAdmin, bToken, root, accounts, admin, reserveManager;

  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
    admin = accounts[1];
    reserveManager = accounts[2];
    others = accounts[3];
    bTokenAdmin = await makeBTokenAdmin({admin: admin});
  });

  describe('getBTokenAdmin', () => {
    it('it is normal admin', async () => {
      bToken = await makeBToken();
      expect(await call(bTokenAdmin, 'getBTokenAdmin', [bToken._address])).toEqual(root);
    });

    it('it is bToken admin contract', async () => {
      bToken = await makeBToken({admin: bTokenAdmin._address});
      expect(await call(bTokenAdmin, 'getBTokenAdmin', [bToken._address])).toEqual(bTokenAdmin._address);
    });
  });

  describe('_queuePendingAdmin()', () => {
    beforeEach(async () => {
      bToken = await makeBToken({admin: bTokenAdmin._address});
    });

    it('should only be callable by admin', async () => {
      await expect(send(bTokenAdmin, '_queuePendingAdmin', [bToken._address, others], {from: others})).rejects.toRevert('revert only the admin may call this function');

      // Check admin stays the same
      expect(await call(bToken, 'admin')).toEqual(bTokenAdmin._address);
      expect(await call(bToken, 'pendingAdmin')).toBeAddressZero();
    });

    it('should properly queue pending admin', async () => {
      await send(bTokenAdmin, 'setBlockTimestamp', [100]);

      expect(await send(bTokenAdmin, '_queuePendingAdmin', [bToken._address, others], {from: admin})).toSucceed();

      expect(await call(bTokenAdmin, 'adminQueue', [bToken._address, others])).toEqual('172900'); // 100 + 86400

      await expect(send(bTokenAdmin, '_queuePendingAdmin', [bToken._address, others], {from: admin})).rejects.toRevert('revert already in queue');

      // Check admin and pending admin stay the same
      expect(await call(bToken, 'admin')).toEqual(bTokenAdmin._address);
      expect(await call(bToken, 'pendingAdmin')).toBeAddressZero();
    });
  });

  describe('_clearPendingAdmin()', () => {
    beforeEach(async () => {
      bToken = await makeBToken({admin: bTokenAdmin._address});
    });

    it('should only be callable by admin', async () => {
      await expect(send(bTokenAdmin, '_clearPendingAdmin', [bToken._address, others], {from: others})).rejects.toRevert('revert only the admin may call this function');

      // Check admin stays the same
      expect(await call(bToken, 'admin')).toEqual(bTokenAdmin._address);
      expect(await call(bToken, 'pendingAdmin')).toBeAddressZero();
    });

    it('should properly clear pending admin', async () => {
      await send(bTokenAdmin, 'setBlockTimestamp', [100]);

      expect(await send(bTokenAdmin, '_clearPendingAdmin', [bToken._address, others], {from: admin})).toSucceed();

      expect(await call(bTokenAdmin, 'adminQueue', [bToken._address, others])).toEqual('0');

      // Check admin and pending admin stay the same
      expect(await call(bToken, 'admin')).toEqual(bTokenAdmin._address);
      expect(await call(bToken, 'pendingAdmin')).toBeAddressZero();
    });
  });

  describe('_togglePendingAdmin()', () => {
    beforeEach(async () => {
      bToken = await makeBToken({admin: bTokenAdmin._address});
    });

    it('should only be callable by admin', async () => {
      await expect(send(bTokenAdmin, '_togglePendingAdmin', [bToken._address, others], {from: others})).rejects.toRevert('revert only the admin may call this function');

      // Check admin stays the same
      expect(await call(bToken, 'admin')).toEqual(bTokenAdmin._address);
      expect(await call(bToken, 'pendingAdmin')).toBeAddressZero();
    });

    it('cannot be toggled if not in queue', async () => {
      await expect(send(bTokenAdmin, '_togglePendingAdmin', [bToken._address, others], {from: admin})).rejects.toRevert('revert not in queue');

      // Check admin stays the same
      expect(await call(bToken, 'admin')).toEqual(bTokenAdmin._address);
      expect(await call(bToken, 'pendingAdmin')).toBeAddressZero();
    });

    it('cannot be toggled if queue not expired', async () => {
      await send(bTokenAdmin, 'setBlockTimestamp', [100]);

      expect(await send(bTokenAdmin, '_queuePendingAdmin', [bToken._address, others], {from: admin})).toSucceed();

      expect(await call(bTokenAdmin, 'adminQueue', [bToken._address, others])).toEqual('172900'); // 100 + 86400

      await send(bTokenAdmin, 'setBlockTimestamp', [86499]);

      await expect(send(bTokenAdmin, '_togglePendingAdmin', [bToken._address, others], {from: admin})).rejects.toRevert('revert queue not expired');

      // Check admin stays the same
      expect(await call(bToken, 'admin')).toEqual(bTokenAdmin._address);
      expect(await call(bToken, 'pendingAdmin')).toBeAddressZero();
    });

    it('should properly set pending admin', async () => {
      await send(bTokenAdmin, 'setBlockTimestamp', [100]);

      expect(await send(bTokenAdmin, '_queuePendingAdmin', [bToken._address, others], {from: admin})).toSucceed();

      expect(await call(bTokenAdmin, 'adminQueue', [bToken._address, others])).toEqual('172900'); // 100 + 86400

      await send(bTokenAdmin, 'setBlockTimestamp', [172900]);

      expect(await send(bTokenAdmin, '_togglePendingAdmin', [bToken._address, others], {from: admin})).toSucceed();

      expect(await call(bTokenAdmin, 'adminQueue', [bToken._address, others])).toEqual('0');

      // Check admin stays the same
      expect(await call(bToken, 'admin')).toEqual(bTokenAdmin._address);
      expect(await call(bToken, 'pendingAdmin')).toEqual(others);
    });
  });

  describe('_acceptAdmin()', () => {
    beforeEach(async () => {
      bToken = await makeBToken();
      expect(await send(bToken, '_setPendingAdmin', [bTokenAdmin._address])).toSucceed();
    });

    it('should only be callable by admin', async () => {
      await expect(send(bTokenAdmin, '_acceptAdmin', [bToken._address], {from: others})).rejects.toRevert('revert only the admin may call this function');

      // Check admin stays the same
      expect(await call(bToken, 'admin')).toEqual(root);
      expect(await call(bToken, 'pendingAdmin') [others]).toEqual();
    });

    it('should succeed and set admin and clear pending admin', async () => {
      expect(await send(bTokenAdmin, '_acceptAdmin', [bToken._address], {from: admin})).toSucceed();

      expect(await call(bToken, 'admin')).toEqual(bTokenAdmin._address);
      expect(await call(bToken, 'pendingAdmin')).toBeAddressZero();
    });
  });

  describe('_setComptroller()', () => {
    let oldComptroller, newComptroller;

    beforeEach(async () => {
      bToken = await makeBToken({admin: bTokenAdmin._address});
      oldComptroller = bToken.comptroller;
      newComptroller = await makeComptroller();
    });

    it('should only be callable by admin', async () => {
      await expect(send(bTokenAdmin, '_setComptroller', [bToken._address, newComptroller._address], {from: others})).rejects.toRevert('revert only the admin may call this function');

      expect(await call(bToken, 'comptroller')).toEqual(oldComptroller._address);
    });

    it('should succeed and set new comptroller', async () => {
      expect(await send(bTokenAdmin, '_setComptroller', [bToken._address, newComptroller._address], {from: admin})).toSucceed();

      expect(await call(bToken, 'comptroller')).toEqual(newComptroller._address);
    });
  });

  describe('_setReserveFactor()', () => {
    const factor = etherMantissa(.02);

    beforeEach(async () => {
      bToken = await makeBToken({admin: bTokenAdmin._address});
    });

    it('should only be callable by admin', async () => {
      await expect(send(bTokenAdmin, '_setReserveFactor', [bToken._address, factor], {from: others})).rejects.toRevert('revert only the admin may call this function');

      expect(await call(bToken, 'reserveFactorMantissa')).toEqualNumber(0);
    });

    it('should succeed and set new reserve factor', async () => {
      expect(await send(bTokenAdmin, '_setReserveFactor', [bToken._address, factor], {from: admin})).toSucceed();

      expect(await call(bToken, 'reserveFactorMantissa')).toEqualNumber(factor);
    });
  });

  describe('_reduceReserves()', () => {
    const reserves = etherUnsigned(3e12);
    const cash = etherUnsigned(reserves.multipliedBy(2));
    const reduction = etherUnsigned(2e12);

    beforeEach(async () => {
      bToken = await makeBToken({admin: bTokenAdmin._address});
      await send(bToken.interestRateModel, 'setFailBorrowRate', [false]);
      expect(await send(bToken, 'harnessSetTotalReserves', [reserves])).toSucceed();
      expect(
        await send(bToken.underlying, 'harnessSetBalance', [bToken._address, cash])
      ).toSucceed();
    });

    it('should only be callable by admin', async () => {
      await expect(send(bTokenAdmin, '_reduceReserves', [bToken._address, reduction], {from: others})).rejects.toRevert('revert only the admin may call this function');

      expect(await call(bToken.underlying, 'balanceOf', [bTokenAdmin._address])).toEqualNumber(0);
    });

    it('should succeed and reduce reserves', async () => {
      expect(await send(bTokenAdmin, '_reduceReserves', [bToken._address, reduction], {from: admin})).toSucceed();

      expect(await call(bToken.underlying, 'balanceOf', [bTokenAdmin._address])).toEqualNumber(reduction);
    });
  });

  describe('_setInterestRateModel()', () => {
    let oldModel, newModel;

    beforeEach(async () => {
      bToken = await makeBToken({admin: bTokenAdmin._address});
      oldModel = bToken.interestRateModel;
      newModel = await makeInterestRateModel();
    });

    it('should only be callable by admin', async () => {
      await expect(send(bTokenAdmin, '_setInterestRateModel', [bToken._address, newModel._address], {from: others})).rejects.toRevert('revert only the admin may call this function');

      expect(await call(bToken, 'interestRateModel')).toEqual(oldModel._address);
    });

    it('should succeed and set new interest rate model', async () => {
      expect(await send(bTokenAdmin, '_setInterestRateModel', [bToken._address, newModel._address], {from: admin})).toSucceed();

      expect(await call(bToken, 'interestRateModel')).toEqual(newModel._address);
    });
  });

  describe('_setCollateralCap()', () => {
    const cap = etherMantissa(100);

    let bCollateralCapErc20;

    beforeEach(async () => {
      bCollateralCapErc20 = await makeBToken({kind: 'bcollateralcap', admin: bTokenAdmin._address});
      bToken = await makeBToken({admin: bTokenAdmin._address});
    });

    it('should only be callable by admin', async () => {
      await expect(send(bTokenAdmin, '_setCollateralCap', [bCollateralCapErc20._address, cap], {from: others})).rejects.toRevert('revert only the admin may call this function');

      expect(await call(bCollateralCapErc20, 'collateralCap')).toEqualNumber(0);
    });

    it('should fail for not BCollateralCapErc20 token', async () => {
      await expect(send(bTokenAdmin, '_setCollateralCap', [bToken._address, cap], {from: admin})).rejects.toRevert('revert');
    });

    it('should succeed and set new collateral cap', async () => {
      expect(await send(bTokenAdmin, '_setCollateralCap', [bCollateralCapErc20._address, cap], {from: admin})).toSucceed();

      expect(await call(bCollateralCapErc20, 'collateralCap')).toEqualNumber(cap);
    });
  });

  describe('_queuePendingImplementation()', () => {
    let oldImplementation;
    let bCapableDelegate;

    beforeEach(async () => {
      bToken = await makeBToken({admin: bTokenAdmin._address});
      oldImplementation = await call(bToken, 'implementation');
      bCapableDelegate = await deploy('BCapableErc20Delegate');
    });

    it('should only be callable by admin', async () => {
      await expect(send(bTokenAdmin, '_queuePendingImplementation', [bToken._address, bCapableDelegate._address], {from: others})).rejects.toRevert('revert only the admin may call this function');
    });

    it('should succeed and queue new implementation', async () => {
      await send(bTokenAdmin, 'setBlockTimestamp', [100]);

      expect(await send(bTokenAdmin, '_queuePendingImplementation', [bToken._address, bCapableDelegate._address], {from: admin})).toSucceed();

      expect(await call(bTokenAdmin, 'implementationQueue', [bToken._address, bCapableDelegate._address])).toEqual('172900'); // 100 + 86400

      await expect(send(bTokenAdmin, '_queuePendingImplementation', [bToken._address, bCapableDelegate._address], {from: admin})).rejects.toRevert('revert already in queue');

      expect(await call(bToken, 'implementation')).toEqual(oldImplementation);
    });
  });

  describe('_clearPendingImplementation()', () => {
    let oldImplementation;
    let bCapableDelegate;

    beforeEach(async () => {
      bToken = await makeBToken({admin: bTokenAdmin._address});
      oldImplementation = await call(bToken, 'implementation');
      bCapableDelegate = await deploy('BCapableErc20Delegate');
    });

    it('should only be callable by admin', async () => {
      await expect(send(bTokenAdmin, '_clearPendingImplementation', [bToken._address, bCapableDelegate._address], {from: others})).rejects.toRevert('revert only the admin may call this function');
    });

    it('should succeed and clear new implementation', async () => {
      await send(bTokenAdmin, 'setBlockTimestamp', [100]);

      expect(await send(bTokenAdmin, '_clearPendingImplementation', [bToken._address, bCapableDelegate._address], {from: admin})).toSucceed();

      expect(await call(bTokenAdmin, 'implementationQueue', [bToken._address, bCapableDelegate._address])).toEqual('0');

      expect(await call(bToken, 'implementation')).toEqual(oldImplementation);
    });
  });

  describe('_togglePendingImplementation()', () => {
    let oldImplementation;
    let bCapableDelegate;

    beforeEach(async () => {
      bToken = await makeBToken({admin: bTokenAdmin._address});
      oldImplementation = await call(bToken, 'implementation');
      bCapableDelegate = await deploy('BCapableErc20Delegate');
    });

    it('should only be callable by admin', async () => {
      await expect(send(bTokenAdmin, '_togglePendingImplementation', [bToken._address, bCapableDelegate._address, true, '0x0'], {from: others})).rejects.toRevert('revert only the admin may call this function');

      expect(await call(bToken, 'implementation')).toEqual(oldImplementation);
    });

    it('cannot be toggled if not in queue', async () => {
      await expect(send(bTokenAdmin, '_togglePendingImplementation', [bToken._address, bCapableDelegate._address, true, '0x0'], {from: admin})).rejects.toRevert('revert not in queue');

      expect(await call(bToken, 'implementation')).toEqual(oldImplementation);
    });

    it('cannot be toggled if queue not expired', async () => {
      await send(bTokenAdmin, 'setBlockTimestamp', [100]);

      expect(await send(bTokenAdmin, '_queuePendingImplementation', [bToken._address, bCapableDelegate._address], {from: admin})).toSucceed();

      expect(await call(bTokenAdmin, 'implementationQueue', [bToken._address, bCapableDelegate._address])).toEqual('172900'); // 100 + 86400

      await send(bTokenAdmin, 'setBlockTimestamp', [86499]);

      await expect(send(bTokenAdmin, '_togglePendingImplementation', [bToken._address, bCapableDelegate._address, true, '0x0'], {from: admin})).rejects.toRevert('revert queue not expired');

      expect(await call(bToken, 'implementation')).toEqual(oldImplementation);
    });

    it('should succeed and set new implementation', async () => {
      await send(bTokenAdmin, 'setBlockTimestamp', [100]);

      expect(await send(bTokenAdmin, '_queuePendingImplementation', [bToken._address, bCapableDelegate._address], {from: admin})).toSucceed();

      expect(await call(bTokenAdmin, 'implementationQueue', [bToken._address, bCapableDelegate._address])).toEqual('172900'); // 100 + 86400

      await send(bTokenAdmin, 'setBlockTimestamp', [172900]);

      expect(await send(bTokenAdmin, '_togglePendingImplementation', [bToken._address, bCapableDelegate._address, true, '0x0'], {from: admin})).toSucceed();

      expect(await call(bTokenAdmin, 'implementationQueue', [bToken._address, bCapableDelegate._address])).toEqual('0');

      expect(await call(bToken, 'implementation')).toEqual(bCapableDelegate._address);
    });
  });

  describe('extractReserves()', () => {
    const reserves = etherUnsigned(3e12);
    const cash = etherUnsigned(reserves.multipliedBy(2));
    const reduction = etherUnsigned(2e12);

    beforeEach(async () => {
      bToken = await makeBToken({admin: bTokenAdmin._address});
      await send(bToken.interestRateModel, 'setFailBorrowRate', [false]);
      expect(await send(bToken, 'harnessSetTotalReserves', [reserves])).toSucceed();
      expect(
        await send(bToken.underlying, 'harnessSetBalance', [bToken._address, cash])
      ).toSucceed();
      await send(bTokenAdmin, 'setReserveManager', [reserveManager], {from: admin});
    });

    it('should only be callable by reserve manager', async () => {
      await expect(send(bTokenAdmin, 'extractReserves', [bToken._address, reduction])).rejects.toRevert('revert only the reserve manager may call this function');

      expect(await call(bToken.underlying, 'balanceOf', [reserveManager])).toEqualNumber(0);
    });

    it('should succeed and extract reserves', async () => {
      expect(await send(bTokenAdmin, 'extractReserves', [bToken._address, reduction], {from: reserveManager})).toSucceed();

      expect(await call(bToken.underlying, 'balanceOf', [reserveManager])).toEqualNumber(reduction);
    });
  });

  describe('seize()', () => {
    const amount = 1000;

    let erc20, nonStandardErc20;

    beforeEach(async () => {
      erc20 = await makeToken();
      nonStandardErc20 = await makeToken({kind: 'nonstandard'});
      await send(erc20, 'transfer', [bTokenAdmin._address, amount]);
      await send(nonStandardErc20, 'transfer', [bTokenAdmin._address, amount]);
    });

    it('should only be callable by admin', async () => {
      await expect(send(bTokenAdmin, 'seize', [erc20._address], {from: others})).rejects.toRevert('revert only the admin may call this function');

      expect(await call(erc20, 'balanceOf', [bTokenAdmin._address])).toEqualNumber(amount);
      expect(await call(erc20, 'balanceOf', [admin])).toEqualNumber(0);
    });

    it('should succeed and seize tokens', async () => {
      expect(await send(bTokenAdmin, 'seize', [erc20._address], {from: admin})).toSucceed();

      expect(await call(erc20, 'balanceOf', [bTokenAdmin._address])).toEqualNumber(0);
      expect(await call(erc20, 'balanceOf', [admin])).toEqualNumber(amount);
    });

    it('should succeed and seize non-standard tokens', async () => {
      expect(await send(bTokenAdmin, 'seize', [nonStandardErc20._address], {from: admin})).toSucceed();

      expect(await call(nonStandardErc20, 'balanceOf', [bTokenAdmin._address])).toEqualNumber(0);
      expect(await call(nonStandardErc20, 'balanceOf', [admin])).toEqualNumber(amount);
    });
  });

  describe('setAdmin()', () => {
    it('should only be callable by admin', async () => {
      await expect(send(bTokenAdmin, 'setAdmin', [others], {from: others})).rejects.toRevert('revert only the admin may call this function');

      expect(await call(bTokenAdmin, 'admin')).toEqual(admin);
    });

    it('cannot set admin to zero address', async () => {
      await expect(send(bTokenAdmin, 'setAdmin', [address(0)], {from: admin})).rejects.toRevert('revert new admin cannot be zero address');

      expect(await call(bTokenAdmin, 'admin')).toEqual(admin);
    });

    it('should succeed and set new admin', async () => {
      expect(await send(bTokenAdmin, 'setAdmin', [others], {from: admin})).toSucceed();

      expect(await call(bTokenAdmin, 'admin')).toEqual(others);
    });
  });

  describe('setReserveManager()', () => {
    it('should only be callable by admin', async () => {
      await expect(send(bTokenAdmin, 'setReserveManager', [reserveManager], {from: others})).rejects.toRevert('revert only the admin may call this function');

      expect(await call(bTokenAdmin, 'reserveManager')).toEqual(address(0));
    });

    it('should succeed and set new reserve manager', async () => {
      expect(await send(bTokenAdmin, 'setReserveManager', [reserveManager], {from: admin})).toSucceed();

      expect(await call(bTokenAdmin, 'reserveManager')).toEqual(reserveManager);
    });
  });
});
