const {
  makeBToken
} = require('../Utils/Compound');

const exchangeRate = 50e3;

describe('BToken', function () {
  let root, admin, accounts;
  let bToken;

  beforeEach(async () => {
    [root, admin, ...accounts] = saddle.accounts;
    bToken = await makeBToken({kind: 'bcollateralcap', comptrollerOpts: {kind: 'bool'}, exchangeRate});
  });

  it("fails to register collateral for non comptroller", async () => {
    await expect(send(bToken, 'registerCollateral', [root])).rejects.toRevert("revert comptroller only");
  });

  it("fails to unregister collateral for non comptroller", async () => {
    await expect(send(bToken, 'unregisterCollateral', [root])).rejects.toRevert("revert comptroller only");
  });
});
