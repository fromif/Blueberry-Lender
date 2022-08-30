/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../../common";
import type {
  ErrorReporter,
  ErrorReporterInterface,
} from "../../../PriceOracle/v1PriceOracle.sol/ErrorReporter";

const _abi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "error",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "info",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "detail",
        type: "uint256",
      },
    ],
    name: "Failure",
    type: "event",
  },
];

const _bytecode =
  "0x6080604052348015600f57600080fd5b50603e80601d6000396000f3fe6080604052600080fdfea265627a7a72315820d2409f3631f094da28c5b327fa1469f515d3c1015421de209a32c974830d1b9d64736f6c63430005100032";

type ErrorReporterConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: ErrorReporterConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class ErrorReporter__factory extends ContractFactory {
  constructor(...args: ErrorReporterConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ErrorReporter> {
    return super.deploy(overrides || {}) as Promise<ErrorReporter>;
  }
  override getDeployTransaction(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  override attach(address: string): ErrorReporter {
    return super.attach(address) as ErrorReporter;
  }
  override connect(signer: Signer): ErrorReporter__factory {
    return super.connect(signer) as ErrorReporter__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): ErrorReporterInterface {
    return new utils.Interface(_abi) as ErrorReporterInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): ErrorReporter {
    return new Contract(address, _abi, signerOrProvider) as ErrorReporter;
  }
}
