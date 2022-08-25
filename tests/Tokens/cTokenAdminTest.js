const {
  address,
  etherMantissa,
  etherUnsigned,
  etherGasCost
} = require('../Utils/Ethereum');
const {
  makeCToken,
  makeCTokenAdmin,
  makeComptroller,
  makeInterestRateModel,
  makeToken,
  setEtherBalance,
  getBalances,
  adjustBalances
} = require('../Utils/Compound');

describe('CTokenAdmin', () => {
  let cTokenAdmin, cToken, root, accounts, admin, reserveManager;

  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
    admin = accounts[1];
    reserveManager = accounts[2];
    others = accounts[3];
    cTokenAdmin = await makeCTokenAdmin({admin: admin});
  });

  describe('getCTokenAdmin', () => {
    it('it is normal admin', async () => {
      cToken = await makeCToken();
      expect(await call(cTokenAdmin, 'getCTokenAdmin', [cToken._address])).toEqual(root);
    });

    it('it is cToken admin contract', async () => {
      cToken = await makeCToken({admin: cTokenAdmin._address});
      expect(await call(cTokenAdmin, 'getCTokenAdmin', [cToken._address])).toEqual(cTokenAdmin._address);
    });
  });

  describe('_queuePendingAdmin()', () => {
    beforeEach(async () => {
      cToken = await makeCToken({admin: cTokenAdmin._address});
    });

    it('should only be callable by admin', async () => {
      await expect(send(cTokenAdmin, '_queuePendingAdmin', [cToken._address, others], {from: others})).rejects.toRevert('revert only the admin may call this function');

      // Check admin stays the same
      expect(await call(cToken, 'admin')).toEqual(cTokenAdmin._address);
      expect(await call(cToken, 'pendingAdmin')).toBeAddressZero();
    });

    it('should properly queue pending admin', async () => {
      await send(cTokenAdmin, 'setBlockTimestamp', [100]);

      expect(await send(cTokenAdmin, '_queuePendingAdmin', [cToken._address, others], {from: admin})).toSucceed();

      expect(await call(cTokenAdmin, 'adminQueue', [cToken._address, others])).toEqual('172900'); // 100 + 86400

      await expect(send(cTokenAdmin, '_queuePendingAdmin', [cToken._address, others], {from: admin})).rejects.toRevert('revert already in queue');

      // Check admin and pending admin stay the same
      expect(await call(cToken, 'admin')).toEqual(cTokenAdmin._address);
      expect(await call(cToken, 'pendingAdmin')).toBeAddressZero();
    });
  });

  describe('_clearPendingAdmin()', () => {
    beforeEach(async () => {
      cToken = await makeCToken({admin: cTokenAdmin._address});
    });

    it('should only be callable by admin', async () => {
      await expect(send(cTokenAdmin, '_clearPendingAdmin', [cToken._address, others], {from: others})).rejects.toRevert('revert only the admin may call this function');

      // Check admin stays the same
      expect(await call(cToken, 'admin')).toEqual(cTokenAdmin._address);
      expect(await call(cToken, 'pendingAdmin')).toBeAddressZero();
    });

    it('should properly clear pending admin', async () => {
      await send(cTokenAdmin, 'setBlockTimestamp', [100]);

      expect(await send(cTokenAdmin, '_clearPendingAdmin', [cToken._address, others], {from: admin})).toSucceed();

      expect(await call(cTokenAdmin, 'adminQueue', [cToken._address, others])).toEqual('0');

      // Check admin and pending admin stay the same
      expect(await call(cToken, 'admin')).toEqual(cTokenAdmin._address);
      expect(await call(cToken, 'pendingAdmin')).toBeAddressZero();
    });
  });

  describe('_togglePendingAdmin()', () => {
    beforeEach(async () => {
      cToken = await makeCToken({admin: cTokenAdmin._address});
    });

    it('should only be callable by admin', async () => {
      await expect(send(cTokenAdmin, '_togglePendingAdmin', [cToken._address, others], {from: others})).rejects.toRevert('revert only the admin may call this function');

      // Check admin stays the same
      expect(await call(cToken, 'admin')).toEqual(cTokenAdmin._address);
      expect(await call(cToken, 'pendingAdmin')).toBeAddressZero();
    });

    it('cannot be toggled if not in queue', async () => {
      await expect(send(cTokenAdmin, '_togglePendingAdmin', [cToken._address, others], {from: admin})).rejects.toRevert('revert not in queue');

      // Check admin stays the same
      expect(await call(cToken, 'admin')).toEqual(cTokenAdmin._address);
      expect(await call(cToken, 'pendingAdmin')).toBeAddressZero();
    });

    it('cannot be toggled if queue not expired', async () => {
      await send(cTokenAdmin, 'setBlockTimestamp', [100]);

      expect(await send(cTokenAdmin, '_queuePendingAdmin', [cToken._address, others], {from: admin})).toSucceed();

      expect(await call(cTokenAdmin, 'adminQueue', [cToken._address, others])).toEqual('172900'); // 100 + 86400

      await send(cTokenAdmin, 'setBlockTimestamp', [86499]);

      await expect(send(cTokenAdmin, '_togglePendingAdmin', [cToken._address, others], {from: admin})).rejects.toRevert('revert queue not expired');

      // Check admin stays the same
      expect(await call(cToken, 'admin')).toEqual(cTokenAdmin._address);
      expect(await call(cToken, 'pendingAdmin')).toBeAddressZero();
    });

    it('should properly set pending admin', async () => {
      await send(cTokenAdmin, 'setBlockTimestamp', [100]);

      expect(await send(cTokenAdmin, '_queuePendingAdmin', [cToken._address, others], {from: admin})).toSucceed();

      expect(await call(cTokenAdmin, 'adminQueue', [cToken._address, others])).toEqual('172900'); // 100 + 86400

      await send(cTokenAdmin, 'setBlockTimestamp', [172900]);

      expect(await send(cTokenAdmin, '_togglePendingAdmin', [cToken._address, others], {from: admin})).toSucceed();

      expect(await call(cTokenAdmin, 'adminQueue', [cToken._address, others])).toEqual('0');

      // Check admin stays the same
      expect(await call(cToken, 'admin')).toEqual(cTokenAdmin._address);
      expect(await call(cToken, 'pendingAdmin')).toEqual(others);
    });
  });

  describe('_acceptAdmin()', () => {
    beforeEach(async () => {
      cToken = await makeCToken();
      expect(await send(cToken, '_setPendingAdmin', [cTokenAdmin._address])).toSucceed();
    });

    it('should only be callable by admin', async () => {
      await expect(send(cTokenAdmin, '_acceptAdmin', [cToken._address], {from: others})).rejects.toRevert('revert only the admin may call this function');

      // Check admin stays the same
      expect(await call(cToken, 'admin')).toEqual(root);
      expect(await call(cToken, 'pendingAdmin') [others]).toEqual();
    });

    it('should succeed and set admin and clear pending admin', async () => {
      expect(await send(cTokenAdmin, '_acceptAdmin', [cToken._address], {from: admin})).toSucceed();

      expect(await call(cToken, 'admin')).toEqual(cTokenAdmin._address);
      expect(await call(cToken, 'pendingAdmin')).toBeAddressZero();
    });
  });

  describe('_setComptroller()', () => {
    let oldComptroller, newComptroller;

    beforeEach(async () => {
      cToken = await makeCToken({admin: cTokenAdmin._address});
      oldComptroller = cToken.comptroller;
      newComptroller = await makeComptroller();
    });

    it('should only be callable by admin', async () => {
      await expect(send(cTokenAdmin, '_setComptroller', [cToken._address, newComptroller._address], {from: others})).rejects.toRevert('revert only the admin may call this function');

      expect(await call(cToken, 'comptroller')).toEqual(oldComptroller._address);
    });

    it('should succeed and set new comptroller', async () => {
      expect(await send(cTokenAdmin, '_setComptroller', [cToken._address, newComptroller._address], {from: admin})).toSucceed();

      expect(await call(cToken, 'comptroller')).toEqual(newComptroller._address);
    });
  });

  describe('_setReserveFactor()', () => {
    const factor = etherMantissa(.02);

    beforeEach(async () => {
      cToken = await makeCToken({admin: cTokenAdmin._address});
    });

    it('should only be callable by admin', async () => {
      await expect(send(cTokenAdmin, '_setReserveFactor', [cToken._address, factor], {from: others})).rejects.toRevert('revert only the admin may call this function');

      expect(await call(cToken, 'reserveFactorMantissa')).toEqualNumber(0);
    });

    it('should succeed and set new reserve factor', async () => {
      expect(await send(cTokenAdmin, '_setReserveFactor', [cToken._address, factor], {from: admin})).toSucceed();

      expect(await call(cToken, 'reserveFactorMantissa')).toEqualNumber(factor);
    });
  });

  describe('_reduceReserves()', () => {
    const reserves = etherUnsigned(3e12);
    const cash = etherUnsigned(reserves.multipliedBy(2));
    const reduction = etherUnsigned(2e12);

    beforeEach(async () => {
      cToken = await makeCToken({admin: cTokenAdmin._address});
      await send(cToken.interestRateModel, 'setFailBorrowRate', [false]);
      expect(await send(cToken, 'harnessSetTotalReserves', [reserves])).toSucceed();
      expect(
        await send(cToken.underlying, 'harnessSetBalance', [cToken._address, cash])
      ).toSucceed();
    });

    it('should only be callable by admin', async () => {
      await expect(send(cTokenAdmin, '_reduceReserves', [cToken._address, reduction], {from: others})).rejects.toRevert('revert only the admin may call this function');

      expect(await call(cToken.underlying, 'balanceOf', [cTokenAdmin._address])).toEqualNumber(0);
    });

    it('should succeed and reduce reserves', async () => {
      expect(await send(cTokenAdmin, '_reduceReserves', [cToken._address, reduction], {from: admin})).toSucceed();

      expect(await call(cToken.underlying, 'balanceOf', [cTokenAdmin._address])).toEqualNumber(reduction);
    });
  });

  describe('_setInterestRateModel()', () => {
    let oldModel, newModel;

    beforeEach(async () => {
      cToken = await makeCToken({admin: cTokenAdmin._address});
      oldModel = cToken.interestRateModel;
      newModel = await makeInterestRateModel();
    });

    it('should only be callable by admin', async () => {
      await expect(send(cTokenAdmin, '_setInterestRateModel', [cToken._address, newModel._address], {from: others})).rejects.toRevert('revert only the admin may call this function');

      expect(await call(cToken, 'interestRateModel')).toEqual(oldModel._address);
    });

    it('should succeed and set new interest rate model', async () => {
      expect(await send(cTokenAdmin, '_setInterestRateModel', [cToken._address, newModel._address], {from: admin})).toSucceed();

      expect(await call(cToken, 'interestRateModel')).toEqual(newModel._address);
    });
  });

  describe('_setCollateralCap()', () => {
    const cap = etherMantissa(100);

    let cCollateralCapErc20;

    beforeEach(async () => {
      cCollateralCapErc20 = await makeCToken({kind: 'ccollateralcap', admin: cTokenAdmin._address});
      cToken = await makeCToken({admin: cTokenAdmin._address});
    });

    it('should only be callable by admin', async () => {
      await expect(send(cTokenAdmin, '_setCollateralCap', [cCollateralCapErc20._address, cap], {from: others})).rejects.toRevert('revert only the admin may call this function');

      expect(await call(cCollateralCapErc20, 'collateralCap')).toEqualNumber(0);
    });

    it('should fail for not CCollateralCapErc20 token', async () => {
      await expect(send(cTokenAdmin, '_setCollateralCap', [cToken._address, cap], {from: admin})).rejects.toRevert('revert');
    });

    it('should succeed and set new collateral cap', async () => {
      expect(await send(cTokenAdmin, '_setCollateralCap', [cCollateralCapErc20._address, cap], {from: admin})).toSucceed();

      expect(await call(cCollateralCapErc20, 'collateralCap')).toEqualNumber(cap);
    });
  });

  describe('_queuePendingImplementation()', () => {
    let oldImplementation;
    let cCapableDelegate;

    beforeEach(async () => {
      cToken = await makeCToken({admin: cTokenAdmin._address});
      oldImplementation = await call(cToken, 'implementation');
      cCapableDelegate = await deploy('CCapableErc20Delegate');
    });

    it('should only be callable by admin', async () => {
      await expect(send(cTokenAdmin, '_queuePendingImplementation', [cToken._address, cCapableDelegate._address], {from: others})).rejects.toRevert('revert only the admin may call this function');
    });

    it('should succeed and queue new implementation', async () => {
      await send(cTokenAdmin, 'setBlockTimestamp', [100]);

      expect(await send(cTokenAdmin, '_queuePendingImplementation', [cToken._address, cCapableDelegate._address], {from: admin})).toSucceed();

      expect(await call(cTokenAdmin, 'implementationQueue', [cToken._address, cCapableDelegate._address])).toEqual('172900'); // 100 + 86400

      await expect(send(cTokenAdmin, '_queuePendingImplementation', [cToken._address, cCapableDelegate._address], {from: admin})).rejects.toRevert('revert already in queue');

      expect(await call(cToken, 'implementation')).toEqual(oldImplementation);
    });
  });

  describe('_clearPendingImplementation()', () => {
    let oldImplementation;
    let cCapableDelegate;

    beforeEach(async () => {
      cToken = await makeCToken({admin: cTokenAdmin._address});
      oldImplementation = await call(cToken, 'implementation');
      cCapableDelegate = await deploy('CCapableErc20Delegate');
    });

    it('should only be callable by admin', async () => {
      await expect(send(cTokenAdmin, '_clearPendingImplementation', [cToken._address, cCapableDelegate._address], {from: others})).rejects.toRevert('revert only the admin may call this function');
    });

    it('should succeed and clear new implementation', async () => {
      await send(cTokenAdmin, 'setBlockTimestamp', [100]);

      expect(await send(cTokenAdmin, '_clearPendingImplementation', [cToken._address, cCapableDelegate._address], {from: admin})).toSucceed();

      expect(await call(cTokenAdmin, 'implementationQueue', [cToken._address, cCapableDelegate._address])).toEqual('0');

      expect(await call(cToken, 'implementation')).toEqual(oldImplementation);
    });
  });

  describe('_togglePendingImplementation()', () => {
    let oldImplementation;
    let cCapableDelegate;

    beforeEach(async () => {
      cToken = await makeCToken({admin: cTokenAdmin._address});
      oldImplementation = await call(cToken, 'implementation');
      cCapableDelegate = await deploy('CCapableErc20Delegate');
    });

    it('should only be callable by admin', async () => {
      await expect(send(cTokenAdmin, '_togglePendingImplementation', [cToken._address, cCapableDelegate._address, true, '0x0'], {from: others})).rejects.toRevert('revert only the admin may call this function');

      expect(await call(cToken, 'implementation')).toEqual(oldImplementation);
    });

    it('cannot be toggled if not in queue', async () => {
      await expect(send(cTokenAdmin, '_togglePendingImplementation', [cToken._address, cCapableDelegate._address, true, '0x0'], {from: admin})).rejects.toRevert('revert not in queue');

      expect(await call(cToken, 'implementation')).toEqual(oldImplementation);
    });

    it('cannot be toggled if queue not expired', async () => {
      await send(cTokenAdmin, 'setBlockTimestamp', [100]);

      expect(await send(cTokenAdmin, '_queuePendingImplementation', [cToken._address, cCapableDelegate._address], {from: admin})).toSucceed();

      expect(await call(cTokenAdmin, 'implementationQueue', [cToken._address, cCapableDelegate._address])).toEqual('172900'); // 100 + 86400

      await send(cTokenAdmin, 'setBlockTimestamp', [86499]);

      await expect(send(cTokenAdmin, '_togglePendingImplementation', [cToken._address, cCapableDelegate._address, true, '0x0'], {from: admin})).rejects.toRevert('revert queue not expired');

      expect(await call(cToken, 'implementation')).toEqual(oldImplementation);
    });

    it('should succeed and set new implementation', async () => {
      await send(cTokenAdmin, 'setBlockTimestamp', [100]);

      expect(await send(cTokenAdmin, '_queuePendingImplementation', [cToken._address, cCapableDelegate._address], {from: admin})).toSucceed();

      expect(await call(cTokenAdmin, 'implementationQueue', [cToken._address, cCapableDelegate._address])).toEqual('172900'); // 100 + 86400

      await send(cTokenAdmin, 'setBlockTimestamp', [172900]);

      expect(await send(cTokenAdmin, '_togglePendingImplementation', [cToken._address, cCapableDelegate._address, true, '0x0'], {from: admin})).toSucceed();

      expect(await call(cTokenAdmin, 'implementationQueue', [cToken._address, cCapableDelegate._address])).toEqual('0');

      expect(await call(cToken, 'implementation')).toEqual(cCapableDelegate._address);
    });
  });

  describe('extractReserves()', () => {
    const reserves = etherUnsigned(3e12);
    const cash = etherUnsigned(reserves.multipliedBy(2));
    const reduction = etherUnsigned(2e12);

    beforeEach(async () => {
      cToken = await makeCToken({admin: cTokenAdmin._address});
      await send(cToken.interestRateModel, 'setFailBorrowRate', [false]);
      expect(await send(cToken, 'harnessSetTotalReserves', [reserves])).toSucceed();
      expect(
        await send(cToken.underlying, 'harnessSetBalance', [cToken._address, cash])
      ).toSucceed();
      await send(cTokenAdmin, 'setReserveManager', [reserveManager], {from: admin});
    });

    it('should only be callable by reserve manager', async () => {
      await expect(send(cTokenAdmin, 'extractReserves', [cToken._address, reduction])).rejects.toRevert('revert only the reserve manager may call this function');

      expect(await call(cToken.underlying, 'balanceOf', [reserveManager])).toEqualNumber(0);
    });

    it('should succeed and extract reserves', async () => {
      expect(await send(cTokenAdmin, 'extractReserves', [cToken._address, reduction], {from: reserveManager})).toSucceed();

      expect(await call(cToken.underlying, 'balanceOf', [reserveManager])).toEqualNumber(reduction);
    });
  });

  describe('seize()', () => {
    const amount = 1000;

    let erc20, nonStandardErc20;

    beforeEach(async () => {
      erc20 = await makeToken();
      nonStandardErc20 = await makeToken({kind: 'nonstandard'});
      await send(erc20, 'transfer', [cTokenAdmin._address, amount]);
      await send(nonStandardErc20, 'transfer', [cTokenAdmin._address, amount]);
    });

    it('should only be callable by admin', async () => {
      await expect(send(cTokenAdmin, 'seize', [erc20._address], {from: others})).rejects.toRevert('revert only the admin may call this function');

      expect(await call(erc20, 'balanceOf', [cTokenAdmin._address])).toEqualNumber(amount);
      expect(await call(erc20, 'balanceOf', [admin])).toEqualNumber(0);
    });

    it('should succeed and seize tokens', async () => {
      expect(await send(cTokenAdmin, 'seize', [erc20._address], {from: admin})).toSucceed();

      expect(await call(erc20, 'balanceOf', [cTokenAdmin._address])).toEqualNumber(0);
      expect(await call(erc20, 'balanceOf', [admin])).toEqualNumber(amount);
    });

    it('should succeed and seize non-standard tokens', async () => {
      expect(await send(cTokenAdmin, 'seize', [nonStandardErc20._address], {from: admin})).toSucceed();

      expect(await call(nonStandardErc20, 'balanceOf', [cTokenAdmin._address])).toEqualNumber(0);
      expect(await call(nonStandardErc20, 'balanceOf', [admin])).toEqualNumber(amount);
    });
  });

  describe('setAdmin()', () => {
    it('should only be callable by admin', async () => {
      await expect(send(cTokenAdmin, 'setAdmin', [others], {from: others})).rejects.toRevert('revert only the admin may call this function');

      expect(await call(cTokenAdmin, 'admin')).toEqual(admin);
    });

    it('cannot set admin to zero address', async () => {
      await expect(send(cTokenAdmin, 'setAdmin', [address(0)], {from: admin})).rejects.toRevert('revert new admin cannot be zero address');

      expect(await call(cTokenAdmin, 'admin')).toEqual(admin);
    });

    it('should succeed and set new admin', async () => {
      expect(await send(cTokenAdmin, 'setAdmin', [others], {from: admin})).toSucceed();

      expect(await call(cTokenAdmin, 'admin')).toEqual(others);
    });
  });

  describe('setReserveManager()', () => {
    it('should only be callable by admin', async () => {
      await expect(send(cTokenAdmin, 'setReserveManager', [reserveManager], {from: others})).rejects.toRevert('revert only the admin may call this function');

      expect(await call(cTokenAdmin, 'reserveManager')).toEqual(address(0));
    });

    it('should succeed and set new reserve manager', async () => {
      expect(await send(cTokenAdmin, 'setReserveManager', [reserveManager], {from: admin})).toSucceed();

      expect(await call(cTokenAdmin, 'reserveManager')).toEqual(reserveManager);
    });
  });
});
