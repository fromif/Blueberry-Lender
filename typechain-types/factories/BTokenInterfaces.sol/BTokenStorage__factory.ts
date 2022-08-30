/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../common";
import type {
  BTokenStorage,
  BTokenStorageInterface,
} from "../../BTokenInterfaces.sol/BTokenStorage";

const _abi = [
  {
    constant: true,
    inputs: [],
    name: "accrualBlockNumber",
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
  {
    constant: true,
    inputs: [],
    name: "admin",
    outputs: [
      {
        internalType: "address payable",
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
    name: "borrowIndex",
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
  {
    constant: true,
    inputs: [],
    name: "comptroller",
    outputs: [
      {
        internalType: "contract ComptrollerInterface",
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
    name: "interestRateModel",
    outputs: [
      {
        internalType: "contract InterestRateModel",
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
    name: "name",
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
    inputs: [],
    name: "pendingAdmin",
    outputs: [
      {
        internalType: "address payable",
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
    name: "reserveFactorMantissa",
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
  {
    constant: true,
    inputs: [],
    name: "symbol",
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
    inputs: [],
    name: "totalBorrows",
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
  {
    constant: true,
    inputs: [],
    name: "totalReserves",
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
  {
    constant: true,
    inputs: [],
    name: "totalSupply",
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
  "0x608060405234801561001057600080fd5b5061061a806100206000396000f3fe608060405234801561001057600080fd5b50600436106100cf5760003560e01c80635fe3b5671161008c57806395d89b411161006657806395d89b41146102a5578063aa5af0fd14610328578063f3fdb15a14610346578063f851a44014610390576100cf565b80635fe3b5671461021f5780636c540baf146102695780638f840ddd14610287576100cf565b806306fdde03146100d4578063173b99041461015757806318160ddd146101755780632678224714610193578063313ce567146101dd57806347bd371814610201575b600080fd5b6100dc6103da565b6040518080602001828103825283818151815260200191508051906020019080838360005b8381101561011c578082015181840152602081019050610101565b50505050905090810190601f1680156101495780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b61015f610478565b6040518082815260200191505060405180910390f35b61017d61047e565b6040518082815260200191505060405180910390f35b61019b610484565b604051808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390f35b6101e56104aa565b604051808260ff1660ff16815260200191505060405180910390f35b6102096104bd565b6040518082815260200191505060405180910390f35b6102276104c3565b604051808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390f35b6102716104e9565b6040518082815260200191505060405180910390f35b61028f6104ef565b6040518082815260200191505060405180910390f35b6102ad6104f5565b6040518080602001828103825283818151815260200191508051906020019080838360005b838110156102ed5780820151818401526020810190506102d2565b50505050905090810190601f16801561031a5780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b610330610593565b6040518082815260200191505060405180910390f35b61034e610599565b604051808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390f35b6103986105bf565b604051808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390f35b60018054600181600116156101000203166002900480601f0160208091040260200160405190810160405280929190818152602001828054600181600116156101000203166002900480156104705780601f1061044557610100808354040283529160200191610470565b820191906000526020600020905b81548152906001019060200180831161045357829003601f168201915b505050505081565b60085481565b600d5481565b600460009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b600360009054906101000a900460ff1681565b600b5481565b600560009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b60095481565b600c5481565b60028054600181600116156101000203166002900480601f01602080910402602001604051908101604052809291908181526020018280546001816001161561010002031660029004801561058b5780601f106105605761010080835404028352916020019161058b565b820191906000526020600020905b81548152906001019060200180831161056e57829003601f168201915b505050505081565b600a5481565b600660009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b600360019054906101000a900473ffffffffffffffffffffffffffffffffffffffff168156fea265627a7a72315820c1c73320c973735ba5e4619b7aef80db1b00b0043a8b07d34fd919a7ce77978e64736f6c63430005100032";

type BTokenStorageConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: BTokenStorageConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class BTokenStorage__factory extends ContractFactory {
  constructor(...args: BTokenStorageConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<BTokenStorage> {
    return super.deploy(overrides || {}) as Promise<BTokenStorage>;
  }
  override getDeployTransaction(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  override attach(address: string): BTokenStorage {
    return super.attach(address) as BTokenStorage;
  }
  override connect(signer: Signer): BTokenStorage__factory {
    return super.connect(signer) as BTokenStorage__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): BTokenStorageInterface {
    return new utils.Interface(_abi) as BTokenStorageInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): BTokenStorage {
    return new Contract(address, _abi, signerOrProvider) as BTokenStorage;
  }
}
