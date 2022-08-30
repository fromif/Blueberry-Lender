/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import {
  Signer,
  utils,
  Contract,
  ContractFactory,
  BigNumberish,
  Overrides,
} from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../../common";
import type {
  MockAggregator,
  MockAggregatorInterface,
} from "../../../Test/MockAggregator.sol/MockAggregator";

const _abi = [
  {
    inputs: [
      {
        internalType: "int256",
        name: "_answer",
        type: "int256",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    constant: true,
    inputs: [],
    name: "answer",
    outputs: [
      {
        internalType: "int256",
        name: "",
        type: "int256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "description",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      {
        internalType: "uint80",
        name: "_roundId",
        type: "uint80",
      },
    ],
    name: "getRoundData",
    outputs: [
      {
        internalType: "uint80",
        name: "",
        type: "uint80",
      },
      {
        internalType: "int256",
        name: "",
        type: "int256",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "uint80",
        name: "",
        type: "uint80",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "latestRoundData",
    outputs: [
      {
        internalType: "uint80",
        name: "",
        type: "uint80",
      },
      {
        internalType: "int256",
        name: "",
        type: "int256",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "uint80",
        name: "",
        type: "uint80",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "roundId",
    outputs: [
      {
        internalType: "uint80",
        name: "",
        type: "uint80",
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
        internalType: "int256",
        name: "_answer",
        type: "int256",
      },
    ],
    name: "setAnswer",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "uint8",
        name: "_decimals",
        type: "uint8",
      },
    ],
    name: "setDecimals",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "version",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
];

const _bytecode =
  "0x608060405260126000806101000a81548160ff021916908360ff16021790555034801561002b57600080fd5b506040516104853803806104858339818101604052602081101561004e57600080fd5b8101908080519060200190929190505050806001819055505061040f806100766000396000f3fe608060405234801561001057600080fd5b50600436106100935760003560e01c806385bb7d691161006657806385bb7d691461018e5780638cd221c9146101ac57806399213cd8146101e25780639a6fc8f514610210578063feaf968c146102aa57610093565b8063313ce5671461009857806354fd4d50146100bc5780637284e416146100da5780637a1395aa1461015d575b600080fd5b6100a0610314565b604051808260ff1660ff16815260200191505060405180910390f35b6100c4610326565b6040518082815260200191505060405180910390f35b6100e261032b565b6040518080602001828103825283818151815260200191508051906020019080838360005b83811015610122578082015181840152602081019050610107565b50505050905090810190601f16801561014f5780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b61018c6004803603602081101561017357600080fd5b81019080803560ff169060200190929190505050610364565b005b610196610381565b6040518082815260200191505060405180910390f35b6101b4610387565b604051808269ffffffffffffffffffff1669ffffffffffffffffffff16815260200191505060405180910390f35b61020e600480360360208110156101f857600080fd5b810190808035906020019092919050505061038c565b005b6102486004803603602081101561022657600080fd5b81019080803569ffffffffffffffffffff169060200190929190505050610396565b604051808669ffffffffffffffffffff1669ffffffffffffffffffff1681526020018581526020018481526020018381526020018269ffffffffffffffffffff1669ffffffffffffffffffff1681526020019550505050505060405180910390f35b6102b26103b9565b604051808669ffffffffffffffffffff1669ffffffffffffffffffff1681526020018581526020018481526020018381526020018269ffffffffffffffffffff1669ffffffffffffffffffff1681526020019550505050505060405180910390f35b6000809054906101000a900460ff1681565b600181565b6040518060400160405280600f81526020017f6d6f636b2061676772656761746f72000000000000000000000000000000000081525081565b806000806101000a81548160ff021916908360ff16021790555050565b60015481565b600181565b8060018190555050565b600080600080600060018054424260019450945094509450945091939590929450565b6000806000806000600180544242600194509450945094509450909192939456fea265627a7a723158204d34bb16ee9f480457bd4ae7374b201c661029bbc77d1a5e0406304d92b86c8f64736f6c63430005100032";

type MockAggregatorConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: MockAggregatorConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class MockAggregator__factory extends ContractFactory {
  constructor(...args: MockAggregatorConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    _answer: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<MockAggregator> {
    return super.deploy(_answer, overrides || {}) as Promise<MockAggregator>;
  }
  override getDeployTransaction(
    _answer: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(_answer, overrides || {});
  }
  override attach(address: string): MockAggregator {
    return super.attach(address) as MockAggregator;
  }
  override connect(signer: Signer): MockAggregator__factory {
    return super.connect(signer) as MockAggregator__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): MockAggregatorInterface {
    return new utils.Interface(_abi) as MockAggregatorInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): MockAggregator {
    return new Contract(address, _abi, signerOrProvider) as MockAggregator;
  }
}
