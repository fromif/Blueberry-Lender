/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumber,
  BytesLike,
  CallOverrides,
  ContractTransaction,
  PayableOverrides,
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
} from "./common";

export interface MaximillionInterface extends utils.Interface {
  functions: {
    "bWrappedNative()": FunctionFragment;
    "repayBehalf(address)": FunctionFragment;
    "repayBehalfExplicit(address,address)": FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic:
      | "bWrappedNative"
      | "repayBehalf"
      | "repayBehalfExplicit"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "bWrappedNative",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "repayBehalf",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "repayBehalfExplicit",
    values: [PromiseOrValue<string>, PromiseOrValue<string>]
  ): string;

  decodeFunctionResult(
    functionFragment: "bWrappedNative",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "repayBehalf",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "repayBehalfExplicit",
    data: BytesLike
  ): Result;

  events: {};
}

export interface Maximillion extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: MaximillionInterface;

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
    bWrappedNative(overrides?: CallOverrides): Promise<[string]>;

    repayBehalf(
      borrower: PromiseOrValue<string>,
      overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    repayBehalfExplicit(
      borrower: PromiseOrValue<string>,
      bWrappedNative_: PromiseOrValue<string>,
      overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;
  };

  bWrappedNative(overrides?: CallOverrides): Promise<string>;

  repayBehalf(
    borrower: PromiseOrValue<string>,
    overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  repayBehalfExplicit(
    borrower: PromiseOrValue<string>,
    bWrappedNative_: PromiseOrValue<string>,
    overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  callStatic: {
    bWrappedNative(overrides?: CallOverrides): Promise<string>;

    repayBehalf(
      borrower: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<void>;

    repayBehalfExplicit(
      borrower: PromiseOrValue<string>,
      bWrappedNative_: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<void>;
  };

  filters: {};

  estimateGas: {
    bWrappedNative(overrides?: CallOverrides): Promise<BigNumber>;

    repayBehalf(
      borrower: PromiseOrValue<string>,
      overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    repayBehalfExplicit(
      borrower: PromiseOrValue<string>,
      bWrappedNative_: PromiseOrValue<string>,
      overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    bWrappedNative(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    repayBehalf(
      borrower: PromiseOrValue<string>,
      overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    repayBehalfExplicit(
      borrower: PromiseOrValue<string>,
      bWrappedNative_: PromiseOrValue<string>,
      overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;
  };
}
