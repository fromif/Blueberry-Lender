/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../../common";
import type {
  ComptrollerBorked,
  ComptrollerBorkedInterface,
} from "../../../Test/ComptrollerHarness.sol/ComptrollerBorked";

const _abi = [
  {
    constant: false,
    inputs: [
      {
        internalType: "contract Unitroller",
        name: "unitroller",
        type: "address",
      },
      {
        internalType: "contract PriceOracle",
        name: "_oracle",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_closeFactorMantissa",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_maxAssets",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "_reinitializing",
        type: "bool",
      },
    ],
    name: "_become",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
];

const _bytecode =
  "0x608060405234801561001057600080fd5b50610295806100206000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c806332000e0014610030575b600080fd5b6100b2600480360360a081101561004657600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803573ffffffffffffffffffffffffffffffffffffffff16906020019092919080359060200190929190803590602001909291908035151590602001909291905050506100b4565b005b8473ffffffffffffffffffffffffffffffffffffffff1663f851a4406040518163ffffffff1660e01b815260040160206040518083038186803b1580156100fa57600080fd5b505afa15801561010e573d6000803e3d6000fd5b505050506040513d602081101561012457600080fd5b810190808051906020019092919050505073ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146101d5576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260158152602001807f756e6974726f6c6c65722061646d696e206f6e6c79000000000000000000000081525060200191505060405180910390fd5b8473ffffffffffffffffffffffffffffffffffffffff1663c1e803346040518163ffffffff1660e01b8152600401602060405180830381600087803b15801561021d57600080fd5b505af1158015610231573d6000803e3d6000fd5b505050506040513d602081101561024757600080fd5b810190808051906020019092919050505050505050505056fea265627a7a723158209c8fd9630979bcf4bf36af8bd91de29046a36fcb642e5e1aadf687a4aecf625264736f6c63430005100032";

type ComptrollerBorkedConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: ComptrollerBorkedConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class ComptrollerBorked__factory extends ContractFactory {
  constructor(...args: ComptrollerBorkedConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ComptrollerBorked> {
    return super.deploy(overrides || {}) as Promise<ComptrollerBorked>;
  }
  override getDeployTransaction(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  override attach(address: string): ComptrollerBorked {
    return super.attach(address) as ComptrollerBorked;
  }
  override connect(signer: Signer): ComptrollerBorked__factory {
    return super.connect(signer) as ComptrollerBorked__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): ComptrollerBorkedInterface {
    return new utils.Interface(_abi) as ComptrollerBorkedInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): ComptrollerBorked {
    return new Contract(address, _abi, signerOrProvider) as ComptrollerBorked;
  }
}
