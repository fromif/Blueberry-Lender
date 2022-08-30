/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type {
  ERC3156FlashBorrowerInterface,
  ERC3156FlashBorrowerInterfaceInterface,
} from "../ERC3156FlashBorrowerInterface";

const _abi = [
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "initiator",
        type: "address",
      },
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "fee",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
    ],
    name: "onFlashLoan",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
];

export class ERC3156FlashBorrowerInterface__factory {
  static readonly abi = _abi;
  static createInterface(): ERC3156FlashBorrowerInterfaceInterface {
    return new utils.Interface(_abi) as ERC3156FlashBorrowerInterfaceInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): ERC3156FlashBorrowerInterface {
    return new Contract(
      address,
      _abi,
      signerOrProvider
    ) as ERC3156FlashBorrowerInterface;
  }
}
