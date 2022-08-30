const {
  etherUnsigned
} = require('../Utils/Ethereum');

const {
  makeBToken,
  preCSLP
} = require('../Utils/Compound');

const amount = etherUnsigned(10e4);

describe('BToken', function () {
  let bToken, root, admin, accounts;
  beforeEach(async () => {
    [root, admin, ...accounts] = saddle.accounts;
    bToken = await makeBToken({comptrollerOpts: {kind: 'bool'}});
  });

  describe('_setImplementation', () => {
    describe('bcapable', () => {
      let bCapableDelegate;
      beforeEach(async () => {
        bCapableDelegate = await deploy('BCapableErc20Delegate');
      });

      it("fails due to non admin", async () => {
        bToken = await saddle.getContractAt('BErc20Delegator', bToken._address);
        await expect(send(bToken, '_setImplementation', [bCapableDelegate._address, true, '0x0'], { from: accounts[0] })).rejects.toRevert("revert BErc20Delegator::_setImplementation: Caller must be admin");
      });

      it("succeeds to have internal cash", async () => {
        await send(bToken.underlying, 'harnessSetBalance', [bToken._address, amount]);

        bToken = await saddle.getContractAt('BErc20Delegator', bToken._address);
        expect(await send(bToken, '_setImplementation', [bCapableDelegate._address, true, '0x0'])).toSucceed();

        bToken = await saddle.getContractAt('BCapableErc20Delegate', bToken._address);
        const result = await call(bToken, 'getCash');
        expect(result).toEqualNumber(amount);
      });
    });

    describe('bCollateralCap', () => {
      let bCollateralCapDelegate;
      beforeEach(async () => {
        bCollateralCapDelegate = await deploy('BCollateralCapErc20Delegate');
      });

      it("fails due to non admin", async () => {
        bToken = await saddle.getContractAt('BErc20Delegator', bToken._address);
        await expect(send(bToken, '_setImplementation', [bCollateralCapDelegate._address, true, '0x0'], { from: accounts[0] })).rejects.toRevert("revert BErc20Delegator::_setImplementation: Caller must be admin");
      });

      it("succeeds to have internal cash", async () => {
        await send(bToken.underlying, 'harnessSetBalance', [bToken._address, amount]);

        bToken = await saddle.getContractAt('BErc20Delegator', bToken._address);
        expect(await send(bToken, '_setImplementation', [bCollateralCapDelegate._address, true, '0x0'])).toSucceed();

        bToken = await saddle.getContractAt('BCollateralCapErc20Delegate', bToken._address);
        const result = await call(bToken, 'getCash');
        expect(result).toEqualNumber(amount);
      });
    });
  });
});
