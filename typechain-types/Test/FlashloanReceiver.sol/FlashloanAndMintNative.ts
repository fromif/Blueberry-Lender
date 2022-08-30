/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumber,
  BigNumberish,
  BytesLike,
  CallOverrides,
  ContractTransaction,
  Overrides,
  PopulatedTransaction,
  Signer,
  utils,
} from "ethers";
import type { FunctionFragment, Result } from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type {
  TypedEventFilter,
  TypedEvent,
  TypedListener,
  OnEvent,
  PromiseOrValue,
} from "../../common";

export interface FlashloanAndMintNativeInterface extends utils.Interface {
  functions: {
    "doFlashloan(address,uint256)": FunctionFragment;
    "onFlashLoan(address,address,uint256,uint256,bytes)": FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic: "doFlashloan" | "onFlashLoan"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "doFlashloan",
    values: [PromiseOrValue<string>, PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "onFlashLoan",
    values: [
      PromiseOrValue<string>,
      PromiseOrValue<string>,
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<BytesLike>
    ]
  ): string;

  decodeFunctionResult(
    functionFragment: "doFlashloan",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "onFlashLoan",
    data: BytesLike
  ): Result;

  events: {};
}

export interface FlashloanAndMintNative extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: FlashloanAndMintNativeInterface;

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TEvent>>;

  listeners<TEvent extends TypedEvent>(
    eventFilter?: TypedEventFilter<TEvent>
  ): Array<TypedListener<TEvent>>;
  listeners(eventName?: string): Array<Listener>;
  removeAllListeners<TEvent extends TypedEvent>(
    eventFilter: TypedEventFilter<TEvent>
  ): this;
  removeAllListeners(eventName?: string): this;
  off: OnEvent<this>;
  on: OnEvent<this>;
  once: OnEvent<this>;
  removeListener: OnEvent<this>;

  functions: {
    doFlashloan(
      bToken: PromiseOrValue<string>,
      borrowAmount: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    onFlashLoan(
      initiator: PromiseOrValue<string>,
      token: PromiseOrValue<string>,
      amount: PromiseOrValue<BigNumberish>,
      fee: PromiseOrValue<BigNumberish>,
      data: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;
  };

  doFlashloan(
    bToken: PromiseOrValue<string>,
    borrowAmount: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  onFlashLoan(
    initiator: PromiseOrValue<string>,
    token: PromiseOrValue<string>,
    amount: PromiseOrValue<BigNumberish>,
    fee: PromiseOrValue<BigNumberish>,
    data: PromiseOrValue<BytesLike>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  callStatic: {
    doFlashloan(
      bToken: PromiseOrValue<string>,
      borrowAmount: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<void>;

    onFlashLoan(
      initiator: PromiseOrValue<string>,
      token: PromiseOrValue<string>,
      amount: PromiseOrValue<BigNumberish>,
      fee: PromiseOrValue<BigNumberish>,
      data: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<string>;
  };

  filters: {};

  estimateGas: {
    doFlashloan(
      bToken: PromiseOrValue<string>,
      borrowAmount: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    onFlashLoan(
      initiator: PromiseOrValue<string>,
      token: PromiseOrValue<string>,
      amount: PromiseOrValue<BigNumberish>,
      fee: PromiseOrValue<BigNumberish>,
      data: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    doFlashloan(
      bToken: PromiseOrValue<string>,
      borrowAmount: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    onFlashLoan(
      initiator: PromiseOrValue<string>,
      token: PromiseOrValue<string>,
      amount: PromiseOrValue<BigNumberish>,
      fee: PromiseOrValue<BigNumberish>,
      data: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;
  };
}
