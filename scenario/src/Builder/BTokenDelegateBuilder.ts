import { Event } from '../Event';
import { World } from '../World';
import { BErc20Delegate, BErc20DelegateScenario } from '../Contract/BErc20Delegate';
import { Invokation } from '../Invokation';
import { getStringV } from '../CoreValue';
import { StringV } from '../Value';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import { storeAndSaveContract } from '../Networks';
import { getContract, getTestContract } from '../Contract';

const BErc20DelegateContract = getContract('BErc20Delegate');
const BErc20DelegateScenarioContract = getTestContract('BErc20DelegateScenario');
const BCapableErc20DelegateContract = getContract('BCapableErc20Delegate');
const BCollateralCapErc20DelegateScenarioContract = getContract('BCollateralCapErc20DelegateScenario');
const BWrappedNativeDelegateScenarioContract = getContract('BWrappedNativeDelegateScenario');

export interface BTokenDelegateData {
  invokation: Invokation<BErc20Delegate>;
  name: string;
  contract: string;
  description?: string;
}

export async function buildBTokenDelegate(
  world: World,
  from: string,
  params: Event
): Promise<{ world: World; bTokenDelegate: BErc20Delegate; delegateData: BTokenDelegateData }> {
  const fetchers = [
    new Fetcher<{ name: StringV; }, BTokenDelegateData>(
      `
        #### BErc20Delegate

        * "BErc20Delegate name:<String>"
          * E.g. "BTokenDelegate Deploy BErc20Delegate bDAIDelegate"
      `,
      'BErc20Delegate',
      [
        new Arg('name', getStringV)
      ],
      async (
        world,
        { name }
      ) => {
        return {
          invokation: await BErc20DelegateContract.deploy<BErc20Delegate>(world, from, []),
          name: name.val,
          contract: 'BErc20Delegate',
          description: 'Standard BErc20 Delegate'
        };
      }
    ),

    new Fetcher<{ name: StringV; }, BTokenDelegateData>(
      `
        #### BErc20DelegateScenario

        * "BErc20DelegateScenario name:<String>" - A BErc20Delegate Scenario for local testing
          * E.g. "BTokenDelegate Deploy BErc20DelegateScenario bDAIDelegate"
      `,
      'BErc20DelegateScenario',
      [
        new Arg('name', getStringV),
      ],
      async (
        world,
        { name }
      ) => {
        return {
          invokation: await BErc20DelegateScenarioContract.deploy<BErc20DelegateScenario>(world, from, []),
          name: name.val,
          contract: 'BErc20DelegateScenario',
          description: 'Scenario BErc20 Delegate'
        };
      }
    ),

    new Fetcher<{ name: StringV; }, BTokenDelegateData>(
      `
        #### BCapableErc20Delegate
        * "BCapableErc20Delegate name:<String>"
          * E.g. "BTokenDelegate Deploy BCapableErc20Delegate bLinkDelegate"
      `,
      'BCapableErc20Delegate',
      [
        new Arg('name', getStringV),
      ],
      async (
        world,
        { name }
      ) => {
        return {
          invokation: await BCapableErc20DelegateContract.deploy<BErc20Delegate>(world, from, []),
          name: name.val,
          contract: 'BCapableErc20Delegate',
          description: 'Capable BErc20 Delegate'
        };
      }
    ),

    new Fetcher<{ name: StringV; }, BTokenDelegateData>(
      `
        #### BCollateralCapErc20DelegateScenario
        * "BCollateralCapErc20DelegateScenario name:<String>"
          * E.g. "BTokenDelegate Deploy BCollateralCapErc20DelegateScenario cLinkDelegate"
      `,
      'BCollateralCapErc20DelegateScenario',
      [
        new Arg('name', getStringV),
      ],
      async (
        world,
        { name }
      ) => {
        return {
          invokation: await BCollateralCapErc20DelegateScenarioContract.deploy<BErc20Delegate>(world, from, []),
          name: name.val,
          contract: 'BCollateralCapErc20DelegateScenario',
          description: 'Collateral Cap BErc20 Delegate'
        };
      }
    ),

    new Fetcher<{ name: StringV; }, BTokenDelegateData>(
      `
        #### BWrappedNativeDelegateScenario
        * "BWrappedNativeDelegateScenario name:<String>"
          * E.g. "BTokenDelegate Deploy BWrappedNativeDelegateScenario bLinkDelegate"
      `,
      'BWrappedNativeDelegateScenario',
      [
        new Arg('name', getStringV),
      ],
      async (
        world,
        { name }
      ) => {
        return {
          invokation: await BWrappedNativeDelegateScenarioContract.deploy<BErc20Delegate>(world, from, []),
          name: name.val,
          contract: 'BWrappedNativeDelegateScenario',
          description: 'Wrapped Native BErc20 Delegate'
        };
      }
    )
  ];

  let delegateData = await getFetcherValue<any, BTokenDelegateData>("DeployBToken", fetchers, world, params);
  let invokation = delegateData.invokation;
  delete delegateData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }

  const bTokenDelegate = invokation.value!;

  world = await storeAndSaveContract(
    world,
    bTokenDelegate,
    delegateData.name,
    invokation,
    [
      {
        index: ['BTokenDelegate', delegateData.name],
        data: {
          address: bTokenDelegate._address,
          contract: delegateData.contract,
          description: delegateData.description
        }
      }
    ]
  );

  return { world, bTokenDelegate, delegateData };
}
