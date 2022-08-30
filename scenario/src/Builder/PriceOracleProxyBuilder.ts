import {Event} from '../Event';
import {World} from '../World';
import {PriceOracleProxy} from '../Contract/PriceOracleProxy';
import {Invokation} from '../Invokation';
import {Arg, Fetcher, getFetcherValue} from '../Command';
import {storeAndSaveContract} from '../Networks';
import {getContract} from '../Contract';
import {getAddressV} from '../CoreValue';
import {AddressV} from '../Value';

const PriceOracleProxyContract = getContract("PriceOracleProxy");

export interface PriceOracleProxyData {
  invokation?: Invokation<PriceOracleProxy>,
  contract?: PriceOracleProxy,
  description: string,
  address?: string
}

export async function buildPriceOracleProxy(world: World, from: string, event: Event): Promise<{world: World, priceOracleProxy: PriceOracleProxy, invokation: Invokation<PriceOracleProxy>}> {
  const fetchers = [
    new Fetcher<{guardian: AddressV, priceOracle: AddressV, bETH: AddressV, bXSUSHI: AddressV}, PriceOracleProxyData>(`
        #### Price Oracle Proxy

        * "Deploy <Guardian:Address> <PriceOracle:Address> <bETH:Address> <cXSUSHI:Address>" - The Price Oracle which proxies to a backing oracle
        * E.g. "PriceOracleProxy Deploy Admin (PriceOracle Address) bETH cXSUSHI"
      `,
      "PriceOracleProxy",
      [
        new Arg("guardian", getAddressV),
        new Arg("priceOracle", getAddressV),
        new Arg("bETH", getAddressV),
        new Arg("cXSUSHI", getAddressV)
      ],
      async (world, {guardian, priceOracle, bETH, bXSUSHI}) => {
        return {
          invokation: await PriceOracleProxyContract.deploy<PriceOracleProxy>(world, from, [guardian.val, priceOracle.val, bETH.val, bXSUSHI.val]),
          description: "Price Oracle Proxy",
          bETH: bETH.val,
          bXSUSHI: bXSUSHI.val,
        };
      },
      {catchall: true}
    )
  ];

  let priceOracleProxyData = await getFetcherValue<any, PriceOracleProxyData>("DeployPriceOracleProxy", fetchers, world, event);
  let invokation = priceOracleProxyData.invokation!;
  delete priceOracleProxyData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }
  const priceOracleProxy = invokation.value!;
  priceOracleProxyData.address = priceOracleProxy._address;

  world = await storeAndSaveContract(
    world,
    priceOracleProxy,
    'PriceOracleProxy',
    invokation,
    [
      { index: ['PriceOracleProxy'], data: priceOracleProxyData }
    ]
  );

  return {world, priceOracleProxy, invokation};
}
