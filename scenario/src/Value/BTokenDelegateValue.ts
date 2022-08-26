import { Event } from "../Event";
import { World } from "../World";
import { BErc20Delegate } from "../Contract/BErc20Delegate";
import { getCoreValue, mapValue } from "../CoreValue";
import { Arg, Fetcher, getFetcherValue } from "../Command";
import { AddressV, Value } from "../Value";
import {
  getWorldContractByAddress,
  getBTokenDelegateAddress,
} from "../ContractLookup";

export async function getBTokenDelegateV(
  world: World,
  event: Event
): Promise<BErc20Delegate> {
  const address = await mapValue<AddressV>(
    world,
    event,
    (str) => new AddressV(getBTokenDelegateAddress(world, str)),
    getCoreValue,
    AddressV
  );

  return getWorldContractByAddress<BErc20Delegate>(world, address.val);
}

async function bTokenDelegateAddress(
  world: World,
  bTokenDelegate: BErc20Delegate
): Promise<AddressV> {
  return new AddressV(bTokenDelegate._address);
}

export function bTokenDelegateFetchers() {
  return [
    new Fetcher<{ bTokenDelegate: BErc20Delegate }, AddressV>(
      `
        #### Address

        * "CTokenDelegate <BTokenDelegate> Address" - Returns address of BTokenDelegate contract
          * E.g. "BTokenDelegate bDaiDelegate Address" - Returns bDaiDelegate's address
      `,
      "Address",
      [new Arg("bTokenDelegate", getBTokenDelegateV)],
      (world, { bTokenDelegate }) =>
        bTokenDelegateAddress(world, bTokenDelegate),
      { namePos: 1 }
    ),
  ];
}

export async function getBTokenDelegateValue(
  world: World,
  event: Event
): Promise<Value> {
  return await getFetcherValue<any, any>(
    "BTokenDelegate",
    bTokenDelegateFetchers(),
    world,
    event
  );
}
