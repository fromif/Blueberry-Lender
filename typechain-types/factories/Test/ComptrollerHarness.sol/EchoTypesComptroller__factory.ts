/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../../common";
import type {
  EchoTypesComptroller,
  EchoTypesComptrollerInterface,
} from "../../../Test/ComptrollerHarness.sol/EchoTypesComptroller";

const _abi = [
  {
    constant: true,
    inputs: [
      {
        internalType: "address",
        name: "a",
        type: "address",
      },
    ],
    name: "addresses",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    payable: false,
    stateMutability: "pure",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "admin",
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
        internalType: "address payable",
        name: "unitroller",
        type: "address",
      },
    ],
    name: "becomeBrains",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      {
        internalType: "bool",
        name: "b",
        type: "bool",
      },
    ],
    name: "booly",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "pure",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "comptrollerImplementation",
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
    constant: true,
    inputs: [
      {
        internalType: "uint256[]",
        name: "u",
        type: "uint256[]",
      },
    ],
    name: "listOInts",
    outputs: [
      {
        internalType: "uint256[]",
        name: "",
        type: "uint256[]",
      },
    ],
    payable: false,
    stateMutability: "pure",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "pendingAdmin",
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
    constant: true,
    inputs: [],
    name: "pendingComptrollerImplementation",
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
    constant: true,
    inputs: [],
    name: "reverty",
    outputs: [],
    payable: false,
    stateMutability: "pure",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      {
        internalType: "string",
        name: "s",
        type: "string",
      },
    ],
    name: "stringy",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    payable: false,
    stateMutability: "pure",
    type: "function",
  },
];

const _bytecode =
  "0x608060405234801561001057600080fd5b50610717806100206000396000f3fe608060405234801561001057600080fd5b506004361061009e5760003560e01c8063ba3cca6911610066578063ba3cca69146103bc578063bb82aa5e14610400578063bd96b5161461044a578063dcfbc0c714610492578063f851a440146104dc5761009e565b806326782247146100a35780634bdd1eaf146100ed57806374b0b7df146101fa57806382d389541461032e5780638d2c913c146103b2575b600080fd5b6100ab610526565b604051808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390f35b6101a36004803603602081101561010357600080fd5b810190808035906020019064010000000081111561012057600080fd5b82018360208201111561013257600080fd5b8035906020019184602083028401116401000000008311171561015457600080fd5b919080806020026020016040519081016040528093929190818152602001838360200280828437600081840152601f19601f82011690508083019250505050505050919291929050505061054c565b6040518080602001828103825283818151815260200191508051906020019060200280838360005b838110156101e65780820151818401526020810190506101cb565b505050509050019250505060405180910390f35b6102b36004803603602081101561021057600080fd5b810190808035906020019064010000000081111561022d57600080fd5b82018360208201111561023f57600080fd5b8035906020019184600183028401116401000000008311171561026157600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600081840152601f19601f820116905080830192505050505050509192919290505050610556565b6040518080602001828103825283818151815260200191508051906020019080838360005b838110156102f35780820151818401526020810190506102d8565b50505050905090810190601f1680156103205780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b6103706004803603602081101561034457600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190505050610560565b604051808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390f35b6103ba61056a565b005b6103fe600480360360208110156103d257600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff1690602001909291905050506105e0565b005b610408610667565b604051808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390f35b6104786004803603602081101561046057600080fd5b8101908080351515906020019092919050505061068d565b604051808215151515815260200191505060405180910390f35b61049a610697565b604051808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390f35b6104e46106bd565b604051808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390f35b600160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b6060819050919050565b6060819050919050565b6000819050919050565b60006105de576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252600c8152602001807f676f74636861207375636b61000000000000000000000000000000000000000081525060200191505060405180910390fd5b565b8073ffffffffffffffffffffffffffffffffffffffff1663c1e803346040518163ffffffff1660e01b8152600401602060405180830381600087803b15801561062857600080fd5b505af115801561063c573d6000803e3d6000fd5b505050506040513d602081101561065257600080fd5b81019080805190602001909291905050505050565b600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b6000819050919050565b600360009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b6000809054906101000a900473ffffffffffffffffffffffffffffffffffffffff168156fea265627a7a7231582084416b595989b8b615483b51fca2106317e0a5f3274a1fcd0ae09770396d41aa64736f6c63430005100032";

type EchoTypesComptrollerConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: EchoTypesComptrollerConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class EchoTypesComptroller__factory extends ContractFactory {
  constructor(...args: EchoTypesComptrollerConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<EchoTypesComptroller> {
    return super.deploy(overrides || {}) as Promise<EchoTypesComptroller>;
  }
  override getDeployTransaction(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  override attach(address: string): EchoTypesComptroller {
    return super.attach(address) as EchoTypesComptroller;
  }
  override connect(signer: Signer): EchoTypesComptroller__factory {
    return super.connect(signer) as EchoTypesComptroller__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): EchoTypesComptrollerInterface {
    return new utils.Interface(_abi) as EchoTypesComptrollerInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): EchoTypesComptroller {
    return new Contract(
      address,
      _abi,
      signerOrProvider
    ) as EchoTypesComptroller;
  }
}
