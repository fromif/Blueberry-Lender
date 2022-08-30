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
  EvilToken,
  EvilTokenInterface,
} from "../../../Test/EvilToken.sol/EvilToken";

const _abi = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_initialAmount",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "_tokenName",
        type: "string",
      },
      {
        internalType: "uint8",
        name: "_decimalUnits",
        type: "uint8",
      },
      {
        internalType: "string",
        name: "_tokenSymbol",
        type: "string",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "_owner",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "allocateTo",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "allowance",
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
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "_spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "balanceOf",
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
    name: "fail",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
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
    constant: false,
    inputs: [
      {
        internalType: "bool",
        name: "_fail",
        type: "bool",
      },
    ],
    name: "setFail",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
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
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "dst",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transfer",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        internalType: "address",
        name: "src",
        type: "address",
      },
      {
        internalType: "address",
        name: "dst",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transferFrom",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
];

const _bytecode =
  "0x60806040523480156200001157600080fd5b50604051620011dd380380620011dd833981810160405260808110156200003757600080fd5b8101908080519060200190929190805160405193929190846401000000008211156200006257600080fd5b838201915060208201858111156200007957600080fd5b82518660018202830111640100000000821117156200009757600080fd5b8083526020830192505050908051906020019080838360005b83811015620000cd578082015181840152602081019050620000b0565b50505050905090810190601f168015620000fb5780820380516001836020036101000a031916815260200191505b5060405260200180519060200190929190805160405193929190846401000000008211156200012957600080fd5b838201915060208201858111156200014057600080fd5b82518660018202830111640100000000821117156200015e57600080fd5b8083526020830192505050908051906020019080838360005b838110156200019457808201518184015260208101905062000177565b50505050905090810190601f168015620001c25780820380516001836020036101000a031916815260200191505b5060405250505083838383838383838360038190555083600560003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000208190555082600090805190602001906200023492919062000296565b5080600190805190602001906200024d92919062000296565b5081600260006101000a81548160ff021916908360ff16021790555050505050505050506001600660006101000a81548160ff0219169083151502179055505050505062000345565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f10620002d957805160ff19168380011785556200030a565b828001600101855582156200030a579182015b8281111562000309578251825591602001919060010190620002ec565b5b5090506200031991906200031d565b5090565b6200034291905b808211156200033e57600081600090555060010162000324565b5090565b90565b610e8880620003556000396000f3fe608060405234801561001057600080fd5b50600436106100b45760003560e01c806370a082311161007157806370a08231146102b857806395d89b41146103105780639d76940214610393578063a9059cbb146103c3578063a9cc471814610429578063dd62ed3e1461044b576100b4565b806306fdde03146100b957806308bca5661461013c578063095ea7b31461018a57806318160ddd146101f057806323b872dd1461020e578063313ce56714610294575b600080fd5b6100c16104c3565b6040518080602001828103825283818151815260200191508051906020019080838360005b838110156101015780820151818401526020810190506100e6565b50505050905090810190601f16801561012e5780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b6101886004803603604081101561015257600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff16906020019092919080359060200190929190505050610561565b005b6101d6600480360360408110156101a057600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff16906020019092919080359060200190929190505050610627565b604051808215151515815260200191505060405180910390f35b6101f8610719565b6040518082815260200191505060405180910390f35b61027a6004803603606081101561022457600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803573ffffffffffffffffffffffffffffffffffffffff1690602001909291908035906020019092919050505061071f565b604051808215151515815260200191505060405180910390f35b61029c6109e9565b604051808260ff1660ff16815260200191505060405180910390f35b6102fa600480360360208110156102ce57600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff1690602001909291905050506109fc565b6040518082815260200191505060405180910390f35b610318610a14565b6040518080602001828103825283818151815260200191508051906020019080838360005b8381101561035857808201518184015260208101905061033d565b50505050905090810190601f1680156103855780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b6103c1600480360360208110156103a957600080fd5b81019080803515159060200190929190505050610ab2565b005b61040f600480360360408110156103d957600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff16906020019092919080359060200190929190505050610acf565b604051808215151515815260200191505060405180910390f35b610431610c89565b604051808215151515815260200191505060405180910390f35b6104ad6004803603604081101561046157600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803573ffffffffffffffffffffffffffffffffffffffff169060200190929190505050610c9c565b6040518082815260200191505060405180910390f35b60008054600181600116156101000203166002900480601f0160208091040260200160405190810160405280929190818152602001828054600181600116156101000203166002900480156105595780601f1061052e57610100808354040283529160200191610559565b820191906000526020600020905b81548152906001019060200180831161053c57829003601f168201915b505050505081565b80600560008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282540192505081905550806003600082825401925050819055508173ffffffffffffffffffffffffffffffffffffffff163073ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef836040518082815260200191505060405180910390a35050565b600081600460003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925846040518082815260200191505060405180910390a36001905092915050565b60035481565b6000600660009054906101000a900460ff161561073f57600090506109e2565b61079182600560008773ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054610cc190919063ffffffff16565b600560008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000208190555061082682600560008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054610d0b90919063ffffffff16565b600560008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055506108f882600460008773ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054610cc190919063ffffffff16565b600460008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef846040518082815260200191505060405180910390a3600190505b9392505050565b600260009054906101000a900460ff1681565b60056020528060005260406000206000915090505481565b60018054600181600116156101000203166002900480601f016020809104026020016040519081016040528092919081815260200182805460018160011615610100020316600290048015610aaa5780601f10610a7f57610100808354040283529160200191610aaa565b820191906000526020600020905b815481529060010190602001808311610a8d57829003601f168201915b505050505081565b80600660006101000a81548160ff02191690831515021790555050565b6000600660009054906101000a900460ff1615610aef5760009050610c83565b610b4182600560003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054610cc190919063ffffffff16565b600560003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002081905550610bd682600560008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054610d0b90919063ffffffff16565b600560008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef846040518082815260200191505060405180910390a3600190505b92915050565b600660009054906101000a900460ff1681565b6004602052816000526040600020602052806000526040600020600091509150505481565b6000610d0383836040518060400160405280601f81526020017f536166654d6174683a207375627472616374696f6e20756e646572666c6f7700815250610d93565b905092915050565b600080828401905083811015610d89576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252601b8152602001807f536166654d6174683a206164646974696f6e206f766572666c6f77000000000081525060200191505060405180910390fd5b8091505092915050565b6000838311158290610e40576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825283818151815260200191508051906020019080838360005b83811015610e05578082015181840152602081019050610dea565b50505050905090810190601f168015610e325780820380516001836020036101000a031916815260200191505b509250505060405180910390fd5b506000838503905080915050939250505056fea265627a7a72315820a977152e69d699bcb8330d6c0fc367d9a154a594ad6f4b4e8b2a0b7ab02aa80f64736f6c63430005100032";

type EvilTokenConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: EvilTokenConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class EvilToken__factory extends ContractFactory {
  constructor(...args: EvilTokenConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    _initialAmount: PromiseOrValue<BigNumberish>,
    _tokenName: PromiseOrValue<string>,
    _decimalUnits: PromiseOrValue<BigNumberish>,
    _tokenSymbol: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<EvilToken> {
    return super.deploy(
      _initialAmount,
      _tokenName,
      _decimalUnits,
      _tokenSymbol,
      overrides || {}
    ) as Promise<EvilToken>;
  }
  override getDeployTransaction(
    _initialAmount: PromiseOrValue<BigNumberish>,
    _tokenName: PromiseOrValue<string>,
    _decimalUnits: PromiseOrValue<BigNumberish>,
    _tokenSymbol: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(
      _initialAmount,
      _tokenName,
      _decimalUnits,
      _tokenSymbol,
      overrides || {}
    );
  }
  override attach(address: string): EvilToken {
    return super.attach(address) as EvilToken;
  }
  override connect(signer: Signer): EvilToken__factory {
    return super.connect(signer) as EvilToken__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): EvilTokenInterface {
    return new utils.Interface(_abi) as EvilTokenInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): EvilToken {
    return new Contract(address, _abi, signerOrProvider) as EvilToken;
  }
}
