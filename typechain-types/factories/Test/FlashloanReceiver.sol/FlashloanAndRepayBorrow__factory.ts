/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../../common";
import type {
  FlashloanAndRepayBorrow,
  FlashloanAndRepayBorrowInterface,
} from "../../../Test/FlashloanReceiver.sol/FlashloanAndRepayBorrow";

const _abi = [
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "bToken",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "borrowAmount",
        type: "uint256",
      },
    ],
    name: "doFlashloan",
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

const _bytecode =
  "0x608060405234801561001057600080fd5b5061078f806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c806323e30c8b1461003b57806348473f331461011c575b600080fd5b610106600480360360a081101561005157600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803573ffffffffffffffffffffffffffffffffffffffff1690602001909291908035906020019092919080359060200190929190803590602001906401000000008111156100c257600080fd5b8201836020820111156100d457600080fd5b803590602001918460018302840111640100000000831117156100f657600080fd5b909192939192939050505061016a565b6040518082815260200191505060405180910390f35b6101686004803603604081101561013257600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803590602001909291905050506103e8565b005b60003073ffffffffffffffffffffffffffffffffffffffff168773ffffffffffffffffffffffffffffffffffffffff16146101f0576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260278152602001806107346027913960400191505060405180910390fd5b6000809054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663095ea7b333610241878961068290919063ffffffff16565b6040518363ffffffff1660e01b8152600401808373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200182815260200192505050602060405180830381600087803b1580156102aa57600080fd5b505af11580156102be573d6000803e3d6000fd5b505050506040513d60208110156102d457600080fd5b8101908080519060200190929190505050506000838360208110156102f857600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff16906020019092919050505090508073ffffffffffffffffffffffffffffffffffffffff16630e752702610350878961068290919063ffffffff16565b6040518263ffffffff1660e01b815260040180828152602001915050602060405180830381600087803b15801561038657600080fd5b505af115801561039a573d6000803e3d6000fd5b505050506040513d60208110156103b057600080fd5b810190808051906020019092919050505050604051808061070b60299139602901905060405180910390209150509695505050505050565b8173ffffffffffffffffffffffffffffffffffffffff16636f307dc36040518163ffffffff1660e01b815260040160206040518083038186803b15801561042e57600080fd5b505afa158015610442573d6000803e3d6000fd5b505050506040513d602081101561045857600080fd5b81019080805190602001909291905050506000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550606082604051602001808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060405160208183030381529060405290508273ffffffffffffffffffffffffffffffffffffffff16635cffe9de306000809054906101000a900473ffffffffffffffffffffffffffffffffffffffff1685856040518563ffffffff1660e01b8152600401808573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020018473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200183815260200180602001828103825283818151815260200191508051906020019080838360005b838110156105f25780820151818401526020810190506105d7565b50505050905090810190601f16801561061f5780820380516001836020036101000a031916815260200191505b5095505050505050602060405180830381600087803b15801561064157600080fd5b505af1158015610655573d6000803e3d6000fd5b505050506040513d602081101561066b57600080fd5b810190808051906020019092919050505050505050565b600080828401905083811015610700576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252601b8152602001807f536166654d6174683a206164646974696f6e206f766572666c6f77000000000081525060200191505060405180910390fd5b809150509291505056fe45524333313536466c617368426f72726f776572496e746572666163652e6f6e466c6173684c6f616e466c617368426f72726f7765723a20556e74727573746564206c6f616e20696e69746961746f72a265627a7a723158205fe49bad209b1196962e1b14bef29164c8b1f9cdec095c5265a79b021a4ec60c64736f6c63430005100032";

type FlashloanAndRepayBorrowConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: FlashloanAndRepayBorrowConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class FlashloanAndRepayBorrow__factory extends ContractFactory {
  constructor(...args: FlashloanAndRepayBorrowConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<FlashloanAndRepayBorrow> {
    return super.deploy(overrides || {}) as Promise<FlashloanAndRepayBorrow>;
  }
  override getDeployTransaction(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  override attach(address: string): FlashloanAndRepayBorrow {
    return super.attach(address) as FlashloanAndRepayBorrow;
  }
  override connect(signer: Signer): FlashloanAndRepayBorrow__factory {
    return super.connect(signer) as FlashloanAndRepayBorrow__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): FlashloanAndRepayBorrowInterface {
    return new utils.Interface(_abi) as FlashloanAndRepayBorrowInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): FlashloanAndRepayBorrow {
    return new Contract(
      address,
      _abi,
      signerOrProvider
    ) as FlashloanAndRepayBorrow;
  }
}
