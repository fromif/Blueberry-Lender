import { Event } from '../Event';
import { World } from '../World';
import { BErc20Delegator, BErc20DelegatorScenario, BCollateralCapErc20DelegatorScenario, BWrappedNativeDelegatorScenario } from '../Contract/BErc20Delegator';
import { BToken } from '../Contract/BToken';
import { Invokation, invoke } from '../Invokation';
import { getAddressV, getExpNumberV, getNumberV, getStringV } from '../CoreValue';
import { AddressV, NumberV, StringV } from '../Value';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import { storeAndSaveContract } from '../Networks';
import { getContract, getTestContract } from '../Contract';

const BErc20Contract = getContract('BErc20Immutable');
const BErc20Delegator = getContract('BErc20Delegator');
const BErc20DelegatorScenario = getTestContract('BErc20DelegatorScenario');
const BCollateralCapErc20DelegatorScenario = getContract('BCollateralCapErc20DelegatorScenario');
const BWrappedNativeDelegatorScenario = getContract('BWrappedNativeDelegatorScenario');
const BEtherContract = getContract('BEther');
const BErc20ScenarioContract = getTestContract('BErc20Scenario');
const BEtherScenarioContract = getTestContract('BEtherScenario');
const BEvilContract = getTestContract('BEvil');

export interface TokenData {
  invokation: Invokation<BToken>;
  name: string;
  symbol: string;
  decimals?: number;
  underlying?: string;
  address?: string;
  contract: string;
  initial_exchange_rate_mantissa?: string;
  admin?: string;
}

export async function buildBToken(
  world: World,
  from: string,
  params: Event
): Promise<{ world: World; bToken: BToken; tokenData: TokenData }> {
  const fetchers = [
    new Fetcher<
      {
        symbol: StringV;
        name: StringV;
        decimals: NumberV;
        underlying: AddressV;
        comptroller: AddressV;
        interestRateModel: AddressV;
        initialExchangeRate: NumberV;
        admin: AddressV;
        implementation: AddressV;
        becomeImplementationData: StringV;
      },
      TokenData
    >(
    `
      #### BErc20Delegator

      * "BErc20Delegator symbol:<String> name:<String> underlying:<Address> comptroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address> implementation:<Address> becomeImplementationData:<String>" - The real deal BToken
        * E.g. "BToken Deploy BErc20Delegator bDAI \"Blueberry DAI\" (Erc20 DAI Address) (Comptroller Address) (InterestRateModel Address) 1.0 8 Geoff (BToken BDaiDelegate Address) "0x0123434anyByTes314535q" "
    `,
      'BErc20Delegator',
      [
        new Arg('symbol', getStringV),
        new Arg('name', getStringV),
        new Arg('underlying', getAddressV),
        new Arg('comptroller', getAddressV),
        new Arg('interestRateModel', getAddressV),
        new Arg('initialExchangeRate', getExpNumberV),
        new Arg('decimals', getNumberV),
        new Arg('admin', getAddressV),
        new Arg('implementation', getAddressV),
        new Arg('becomeImplementationData', getStringV)
      ],
      async (
        world,
        {
          symbol,
          name,
          underlying,
          comptroller,
          interestRateModel,
          initialExchangeRate,
          decimals,
          admin,
          implementation,
          becomeImplementationData
        }
      ) => {
        return {
          invokation: await BErc20Delegator.deploy<BErc20Delegator>(world, from, [
            underlying.val,
            comptroller.val,
            interestRateModel.val,
            initialExchangeRate.val,
            name.val,
            symbol.val,
            decimals.val,
            admin.val,
            implementation.val,
            becomeImplementationData.val
          ]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: underlying.val,
          contract: 'BErc20Delegator',
          initial_exchange_rate_mantissa: initialExchangeRate.encode().toString(),
          admin: admin.val
        };
      }
    ),

    new Fetcher<
      {
        symbol: StringV;
        name: StringV;
        decimals: NumberV;
        underlying: AddressV;
        comptroller: AddressV;
        interestRateModel: AddressV;
        initialExchangeRate: NumberV;
        admin: AddressV;
        implementation: AddressV;
        becomeImplementationData: StringV;
      },
      TokenData
    >(
    `
      #### BErc20DelegatorScenario

      * "BErc20DelegatorScenario symbol:<String> name:<String> underlying:<Address> comptroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address> implementation:<Address> becomeImplementationData:<String>" - A BToken Scenario for local testing
        * E.g. "BToken Deploy BErc20DelegatorScenario bDAI \"Compound DAI\" (Erc20 DAI Address) (Comptroller Address) (InterestRateModel Address) 1.0 8 Geoff (BToken BDaiDelegate Address) "0x0123434anyByTes314535q" "
    `,
      'BErc20DelegatorScenario',
      [
        new Arg('symbol', getStringV),
        new Arg('name', getStringV),
        new Arg('underlying', getAddressV),
        new Arg('comptroller', getAddressV),
        new Arg('interestRateModel', getAddressV),
        new Arg('initialExchangeRate', getExpNumberV),
        new Arg('decimals', getNumberV),
        new Arg('admin', getAddressV),
        new Arg('implementation', getAddressV),
        new Arg('becomeImplementationData', getStringV)
      ],
      async (
        world,
        {
          symbol,
          name,
          underlying,
          comptroller,
          interestRateModel,
          initialExchangeRate,
          decimals,
          admin,
          implementation,
          becomeImplementationData
        }
      ) => {
        return {
          invokation: await BErc20DelegatorScenario.deploy<BErc20DelegatorScenario>(world, from, [
            underlying.val,
            comptroller.val,
            interestRateModel.val,
            initialExchangeRate.val,
            name.val,
            symbol.val,
            decimals.val,
            admin.val,
            implementation.val,
            becomeImplementationData.val
          ]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: underlying.val,
          contract: 'BErc20DelegatorScenario',
          initial_exchange_rate_mantissa: initialExchangeRate.encode().toString(),
          admin: admin.val
        };
      }
    ),

    new Fetcher<
      {
        symbol: StringV;
        name: StringV;
        decimals: NumberV;
        underlying: AddressV;
        comptroller: AddressV;
        interestRateModel: AddressV;
        initialExchangeRate: NumberV;
        admin: AddressV;
        implementation: AddressV;
        becomeImplementationData: StringV;
      },
      TokenData
    >(
    `
      #### BCollateralCapErc20DelegatorScenario

      * "BCollateralCapErc20DelegatorScenario symbol:<String> name:<String> underlying:<Address> comptroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address> implementation:<Address> becomeImplementationData:<String>" - A BToken Scenario for local testing
        * E.g. "BToken Deploy BCollateralCapErc20DelegatorScenario bDAI \"Blueberry DAI\" (Erc20 DAI Address) (Comptroller Address) (InterestRateModel Address) 1.0 8 Geoff (BToken BDaiDelegate Address) "0x0123434anyByTes314535q" "
    `,
      'BCollateralCapErc20DelegatorScenario',
      [
        new Arg('symbol', getStringV),
        new Arg('name', getStringV),
        new Arg('underlying', getAddressV),
        new Arg('comptroller', getAddressV),
        new Arg('interestRateModel', getAddressV),
        new Arg('initialExchangeRate', getExpNumberV),
        new Arg('decimals', getNumberV),
        new Arg('admin', getAddressV),
        new Arg('implementation', getAddressV),
        new Arg('becomeImplementationData', getStringV)
      ],
      async (
        world,
        {
          symbol,
          name,
          underlying,
          comptroller,
          interestRateModel,
          initialExchangeRate,
          decimals,
          admin,
          implementation,
          becomeImplementationData
        }
      ) => {
        return {
          invokation: await BCollateralCapErc20DelegatorScenario.deploy<BCollateralCapErc20DelegatorScenario>(world, from, [
            underlying.val,
            comptroller.val,
            interestRateModel.val,
            initialExchangeRate.val,
            name.val,
            symbol.val,
            decimals.val,
            admin.val,
            implementation.val,
            becomeImplementationData.val
          ]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: underlying.val,
          contract: 'BCollateralCapErc20DelegatorScenario',
          initial_exchange_rate_mantissa: initialExchangeRate.encode().toString(),
          admin: admin.val
        };
      }
    ),

    new Fetcher<
      {
        symbol: StringV;
        name: StringV;
        decimals: NumberV;
        underlying: AddressV;
        comptroller: AddressV;
        interestRateModel: AddressV;
        initialExchangeRate: NumberV;
        admin: AddressV;
        implementation: AddressV;
        becomeImplementationData: StringV;
      },
      TokenData
    >(
    `
      #### BWrappedNativeDelegatorScenario

      * "BWrappedNativeDelegatorScenario symbol:<String> name:<String> underlying:<Address> comptroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address> implementation:<Address> becomeImplementationData:<String>" - A BToken Scenario for local testing
        * E.g. "BToken Deploy BWrappedNativeDelegatorScenario bDAI \"Compound DAI\" (Erc20 DAI Address) (Comptroller Address) (InterestRateModel Address) 1.0 8 Geoff (BToken BDaiDelegate Address) "0x0123434anyByTes314535q" "
    `,
      'BWrappedNativeDelegatorScenario',
      [
        new Arg('symbol', getStringV),
        new Arg('name', getStringV),
        new Arg('underlying', getAddressV),
        new Arg('comptroller', getAddressV),
        new Arg('interestRateModel', getAddressV),
        new Arg('initialExchangeRate', getExpNumberV),
        new Arg('decimals', getNumberV),
        new Arg('admin', getAddressV),
        new Arg('implementation', getAddressV),
        new Arg('becomeImplementationData', getStringV)
      ],
      async (
        world,
        {
          symbol,
          name,
          underlying,
          comptroller,
          interestRateModel,
          initialExchangeRate,
          decimals,
          admin,
          implementation,
          becomeImplementationData
        }
      ) => {
        return {
          invokation: await BWrappedNativeDelegatorScenario.deploy<BWrappedNativeDelegatorScenario>(world, from, [
            underlying.val,
            comptroller.val,
            interestRateModel.val,
            initialExchangeRate.val,
            name.val,
            symbol.val,
            decimals.val,
            admin.val,
            implementation.val,
            becomeImplementationData.val
          ]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: underlying.val,
          contract: 'BWrappedNativeDelegatorScenario',
          initial_exchange_rate_mantissa: initialExchangeRate.encode().toString(),
          admin: admin.val
        };
      }
    ),

    new Fetcher<{symbol: StringV, name: StringV, decimals: NumberV, underlying: AddressV, comptroller: AddressV, interestRateModel: AddressV, initialExchangeRate: NumberV, admin: AddressV}, TokenData>(`
        #### Scenario

        * "Scenario symbol:<String> name:<String> underlying:<Address> comptroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address>" - A BToken Scenario for local testing
          * E.g. "BToken Deploy Scenario bZRX \"Compound ZRX\" (Erc20 ZRX Address) (Comptroller Address) (InterestRateModel Address) 1.0 8"
      `,
      "Scenario",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("underlying", getAddressV),
        new Arg("comptroller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV)
      ],
      async (world, {symbol, name, underlying, comptroller, interestRateModel, initialExchangeRate, decimals, admin}) => {
        return {
          invokation: await BErc20ScenarioContract.deploy<BToken>(world, from, [underlying.val, comptroller.val, interestRateModel.val, initialExchangeRate.val, name.val, symbol.val, decimals.val, admin.val]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: underlying.val,
          contract: 'BErc20Scenario',
          initial_exchange_rate_mantissa: initialExchangeRate.encode().toString(),
          admin: admin.val
        };
      }
    ),

    new Fetcher<{symbol: StringV, name: StringV, decimals: NumberV, admin: AddressV, comptroller: AddressV, interestRateModel: AddressV, initialExchangeRate: NumberV}, TokenData>(`
        #### BEtherScenario

        * "BEtherScenario symbol:<String> name:<String> comptroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address>" - A BToken Scenario for local testing
          * E.g. "BToken Deploy BEtherScenario bETH \"Compound Ether\" (Comptroller Address) (InterestRateModel Address) 1.0 8"
      `,
      "BEtherScenario",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("comptroller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV)
      ],
      async (world, {symbol, name, comptroller, interestRateModel, initialExchangeRate, decimals, admin}) => {
        return {
          invokation: await BEtherScenarioContract.deploy<BToken>(world, from, [name.val, symbol.val, decimals.val, admin.val, comptroller.val, interestRateModel.val, initialExchangeRate.val]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: "",
          contract: 'BEtherScenario',
          initial_exchange_rate_mantissa: initialExchangeRate.encode().toString(),
          admin: admin.val
        };
      }
    ),

    new Fetcher<{symbol: StringV, name: StringV, decimals: NumberV, admin: AddressV, comptroller: AddressV, interestRateModel: AddressV, initialExchangeRate: NumberV}, TokenData>(`
        #### BEther

        * "BEther symbol:<String> name:<String> comptroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address>" - A BToken Scenario for local testing
          * E.g. "BToken Deploy BEther bETH \"Compound Ether\" (Comptroller Address) (InterestRateModel Address) 1.0 8"
      `,
      "BEther",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("comptroller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV)
      ],
      async (world, {symbol, name, comptroller, interestRateModel, initialExchangeRate, decimals, admin}) => {
        return {
          invokation: await BEtherContract.deploy<BToken>(world, from, [comptroller.val, interestRateModel.val, initialExchangeRate.val, name.val, symbol.val, decimals.val, admin.val]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: "",
          contract: 'BEther',
          initial_exchange_rate_mantissa: initialExchangeRate.encode().toString(),
          admin: admin.val
        };
      }
    ),

    new Fetcher<{symbol: StringV, name: StringV, decimals: NumberV, admin: AddressV, underlying: AddressV, comptroller: AddressV, interestRateModel: AddressV, initialExchangeRate: NumberV}, TokenData>(`
        #### BErc20

        * "BErc20 symbol:<String> name:<String> underlying:<Address> comptroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address>" - A official BToken contract
          * E.g. "BToken Deploy BErc20 bZRX \"Blueberry ZRX\" (Erc20 ZRX Address) (Comptroller Address) (InterestRateModel Address) 1.0 8"
      `,
      "BErc20",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("underlying", getAddressV),
        new Arg("comptroller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV)
      ],
      async (world, {symbol, name, underlying, comptroller, interestRateModel, initialExchangeRate, decimals, admin}) => {

        return {
          invokation: await BErc20Contract.deploy<BToken>(world, from, [underlying.val, comptroller.val, interestRateModel.val, initialExchangeRate.val, name.val, symbol.val, decimals.val, admin.val]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: underlying.val,
          contract: 'BErc20',
          initial_exchange_rate_mantissa: initialExchangeRate.encode().toString(),
          admin: admin.val
        };
      }
    ),

    new Fetcher<{symbol: StringV, name: StringV, decimals: NumberV, admin: AddressV, underlying: AddressV, comptroller: AddressV, interestRateModel: AddressV, initialExchangeRate: NumberV}, TokenData>(`
        #### BEvil

        * "BEvil symbol:<String> name:<String> underlying:<Address> comptroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address>" - A malicious BToken contract
          * E.g. "BToken Deploy BEvil bEVL \"Compound EVL\" (Erc20 ZRX Address) (Comptroller Address) (InterestRateModel Address) 1.0 8"
      `,
      "BEvil",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("underlying", getAddressV),
        new Arg("comptroller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV)
      ],
      async (world, {symbol, name, underlying, comptroller, interestRateModel, initialExchangeRate, decimals, admin}) => {
        return {
          invokation: await BEvilContract.deploy<BToken>(world, from, [underlying.val, comptroller.val, interestRateModel.val, initialExchangeRate.val, name.val, symbol.val, decimals.val, admin.val]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: underlying.val,
          contract: 'BEvil',
          initial_exchange_rate_mantissa: initialExchangeRate.encode().toString(),
          admin: admin.val
        };
      }
    ),

    new Fetcher<{symbol: StringV, name: StringV, decimals: NumberV, admin: AddressV, underlying: AddressV, comptroller: AddressV, interestRateModel: AddressV, initialExchangeRate: NumberV}, TokenData>(`
        #### Standard

        * "symbol:<String> name:<String> underlying:<Address> comptroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address>" - A official BToken contract
          * E.g. "BToken Deploy Standard bZRX \"Compound ZRX\" (Erc20 ZRX Address) (Comptroller Address) (InterestRateModel Address) 1.0 8"
      `,
      "Standard",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("underlying", getAddressV),
        new Arg("comptroller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV)
      ],
      async (world, {symbol, name, underlying, comptroller, interestRateModel, initialExchangeRate, decimals, admin}) => {
        // Note: we're going to use the scenario contract as the standard deployment on local networks
        if (world.isLocalNetwork()) {
          return {
            invokation: await BErc20ScenarioContract.deploy<BToken>(world, from, [underlying.val, comptroller.val, interestRateModel.val, initialExchangeRate.val, name.val, symbol.val, decimals.val, admin.val]),
            name: name.val,
            symbol: symbol.val,
            decimals: decimals.toNumber(),
            underlying: underlying.val,
            contract: 'BErc20Scenario',
            initial_exchange_rate_mantissa: initialExchangeRate.encode().toString(),
            admin: admin.val
          };
        } else {
          return {
            invokation: await BErc20Contract.deploy<BToken>(world, from, [underlying.val, comptroller.val, interestRateModel.val, initialExchangeRate.val, name.val, symbol.val, decimals.val, admin.val]),
            name: name.val,
            symbol: symbol.val,
            decimals: decimals.toNumber(),
            underlying: underlying.val,
            contract: 'BErc20Immutable',
            initial_exchange_rate_mantissa: initialExchangeRate.encode().toString(),
            admin: admin.val
          };
        }
      },
      {catchall: true}
    )
  ];

  let tokenData = await getFetcherValue<any, TokenData>("DeployBToken", fetchers, world, params);
  let invokation = tokenData.invokation;
  delete tokenData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }

  const bToken = invokation.value!;
  tokenData.address = bToken._address;

  world = await storeAndSaveContract(
    world,
    bToken,
    tokenData.symbol,
    invokation,
    [
      { index: ['bTokens', tokenData.symbol], data: tokenData },
      { index: ['Tokens', tokenData.symbol], data: tokenData }
    ]
  );

  return {world, bToken, tokenData};
}
