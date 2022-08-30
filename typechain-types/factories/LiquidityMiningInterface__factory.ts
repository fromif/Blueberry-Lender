/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type {
  LiquidityMiningInterface,
  LiquidityMiningInterfaceInterface,
} from "../LiquidityMiningInterface";

const _abi = [
  {
    constant: true,
    inputs: [],
    name: "comptroller",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "bToken",
        type: "address",
      },
      {
        internalType: "address[]",
        name: "accounts",
        type: "address[]",
      },
    ],
    name: "updateBorrowIndex",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "bToken",
        type: "address",
      },
      {
        internalType: "address[]",
        name: "accounts",
        type: "address[]",
      },
    ],
    name: "updateSupplyIndex",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
];

export class LiquidityMiningInterface__factory {
  static readonly abi = _abi;
  static createInterface(): LiquidityMiningInterfaceInterface {
    return new utils.Interface(_abi) as LiquidityMiningInterfaceInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): LiquidityMiningInterface {
    return new Contract(
      address,
      _abi,
      signerOrProvider
    ) as LiquidityMiningInterface;
  }
}
