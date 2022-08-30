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
import type {
  FunctionFragment,
  Result,
  EventFragment,
} from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type {
  TypedEventFilter,
  TypedEvent,
  TypedListener,
  OnEvent,
  PromiseOrValue,
} from "../../common";

export interface MockBTokenAdminInterface extends utils.Interface {
  functions: {
    "_acceptAdmin(address)": FunctionFragment;
    "_clearPendingAdmin(address,address)": FunctionFragment;
    "_clearPendingImplementation(address,address)": FunctionFragment;
    "_queuePendingAdmin(address,address)": FunctionFragment;
    "_queuePendingImplementation(address,address)": FunctionFragment;
    "_reduceReserves(address,uint256)": FunctionFragment;
    "_setCollateralCap(address,uint256)": FunctionFragment;
    "_setComptroller(address,address)": FunctionFragment;
    "_setInterestRateModel(address,address)": FunctionFragment;
    "_setReserveFactor(address,uint256)": FunctionFragment;
    "_togglePendingAdmin(address,address)": FunctionFragment;
    "_togglePendingImplementation(address,address,bool,bytes)": FunctionFragment;
    "admin()": FunctionFragment;
    "adminQueue(address,address)": FunctionFragment;
    "blockTimestamp()": FunctionFragment;
    "extractReserves(address,uint256)": FunctionFragment;
    "getBTokenAdmin(address)": FunctionFragment;
    "getBlockTimestamp()": FunctionFragment;
    "implementationQueue(address,address)": FunctionFragment;
    "reserveManager()": FunctionFragment;
    "seize(address)": FunctionFragment;
    "setAdmin(address)": FunctionFragment;
    "setBlockTimestamp(uint256)": FunctionFragment;
    "setReserveManager(address)": FunctionFragment;
    "timeLock()": FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic:
      | "_acceptAdmin"
      | "_clearPendingAdmin"
      | "_clearPendingImplementation"
      | "_queuePendingAdmin"
      | "_queuePendingImplementation"
      | "_reduceReserves"
      | "_setCollateralCap"
      | "_setComptroller"
      | "_setInterestRateModel"
      | "_setReserveFactor"
      | "_togglePendingAdmin"
      | "_togglePendingImplementation"
      | "admin"
      | "adminQueue"
      | "blockTimestamp"
      | "extractReserves"
      | "getBTokenAdmin"
      | "getBlockTimestamp"
      | "implementationQueue"
      | "reserveManager"
      | "seize"
      | "setAdmin"
      | "setBlockTimestamp"
      | "setReserveManager"
      | "timeLock"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "_acceptAdmin",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "_clearPendingAdmin",
    values: [PromiseOrValue<string>, PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "_clearPendingImplementation",
    values: [PromiseOrValue<string>, PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "_queuePendingAdmin",
    values: [PromiseOrValue<string>, PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "_queuePendingImplementation",
    values: [PromiseOrValue<string>, PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "_reduceReserves",
    values: [PromiseOrValue<string>, PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "_setCollateralCap",
    values: [PromiseOrValue<string>, PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "_setComptroller",
    values: [PromiseOrValue<string>, PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "_setInterestRateModel",
    values: [PromiseOrValue<string>, PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "_setReserveFactor",
    values: [PromiseOrValue<string>, PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "_togglePendingAdmin",
    values: [PromiseOrValue<string>, PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "_togglePendingImplementation",
    values: [
      PromiseOrValue<string>,
      PromiseOrValue<string>,
      PromiseOrValue<boolean>,
      PromiseOrValue<BytesLike>
    ]
  ): string;
  encodeFunctionData(functionFragment: "admin", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "adminQueue",
    values: [PromiseOrValue<string>, PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "blockTimestamp",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "extractReserves",
    values: [PromiseOrValue<string>, PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "getBTokenAdmin",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "getBlockTimestamp",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "implementationQueue",
    values: [PromiseOrValue<string>, PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "reserveManager",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "seize",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "setAdmin",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "setBlockTimestamp",
    values: [PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "setReserveManager",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(functionFragment: "timeLock", values?: undefined): string;

  decodeFunctionResult(
    functionFragment: "_acceptAdmin",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "_clearPendingAdmin",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "_clearPendingImplementation",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "_queuePendingAdmin",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "_queuePendingImplementation",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "_reduceReserves",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "_setCollateralCap",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "_setComptroller",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "_setInterestRateModel",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "_setReserveFactor",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "_togglePendingAdmin",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "_togglePendingImplementation",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "admin", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "adminQueue", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "blockTimestamp",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "extractReserves",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getBTokenAdmin",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getBlockTimestamp",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "implementationQueue",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "reserveManager",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "seize", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "setAdmin", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "setBlockTimestamp",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setReserveManager",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "timeLock", data: BytesLike): Result;

  events: {
    "ImplementationChanged(address,address)": EventFragment;
    "ImplementationCleared(address,address)": EventFragment;
    "ImplementationQueued(address,address,uint256)": EventFragment;
    "PendingAdminChanged(address,address)": EventFragment;
    "PendingAdminCleared(address,address)": EventFragment;
    "PendingAdminQueued(address,address,uint256)": EventFragment;
    "SetAdmin(address,address)": EventFragment;
    "SetReserveManager(address,address)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "ImplementationChanged"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "ImplementationCleared"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "ImplementationQueued"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "PendingAdminChanged"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "PendingAdminCleared"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "PendingAdminQueued"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "SetAdmin"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "SetReserveManager"): EventFragment;
}

export interface ImplementationChangedEventObject {
  bToken: string;
  newImplementation: string;
}
export type ImplementationChangedEvent = TypedEvent<
  [string, string],
  ImplementationChangedEventObject
>;

export type ImplementationChangedEventFilter =
  TypedEventFilter<ImplementationChangedEvent>;

export interface ImplementationClearedEventObject {
  bToken: string;
  newImplementation: string;
}
export type ImplementationClearedEvent = TypedEvent<
  [string, string],
  ImplementationClearedEventObject
>;

export type ImplementationClearedEventFilter =
  TypedEventFilter<ImplementationClearedEvent>;

export interface ImplementationQueuedEventObject {
  bToken: string;
  newImplementation: string;
  expiration: BigNumber;
}
export type ImplementationQueuedEvent = TypedEvent<
  [string, string, BigNumber],
  ImplementationQueuedEventObject
>;

export type ImplementationQueuedEventFilter =
  TypedEventFilter<ImplementationQueuedEvent>;

export interface PendingAdminChangedEventObject {
  bToken: string;
  newPendingAdmin: string;
}
export type PendingAdminChangedEvent = TypedEvent<
  [string, string],
  PendingAdminChangedEventObject
>;

export type PendingAdminChangedEventFilter =
  TypedEventFilter<PendingAdminChangedEvent>;

export interface PendingAdminClearedEventObject {
  bToken: string;
  newPendingAdmin: string;
}
export type PendingAdminClearedEvent = TypedEvent<
  [string, string],
  PendingAdminClearedEventObject
>;

export type PendingAdminClearedEventFilter =
  TypedEventFilter<PendingAdminClearedEvent>;

export interface PendingAdminQueuedEventObject {
  bToken: string;
  newPendingAdmin: string;
  expiration: BigNumber;
}
export type PendingAdminQueuedEvent = TypedEvent<
  [string, string, BigNumber],
  PendingAdminQueuedEventObject
>;

export type PendingAdminQueuedEventFilter =
  TypedEventFilter<PendingAdminQueuedEvent>;

export interface SetAdminEventObject {
  oldAdmin: string;
  newAdmin: string;
}
export type SetAdminEvent = TypedEvent<[string, string], SetAdminEventObject>;

export type SetAdminEventFilter = TypedEventFilter<SetAdminEvent>;

export interface SetReserveManagerEventObject {
  oldReserveManager: string;
  newAdmin: string;
}
export type SetReserveManagerEvent = TypedEvent<
  [string, string],
  SetReserveManagerEventObject
>;

export type SetReserveManagerEventFilter =
  TypedEventFilter<SetReserveManagerEvent>;

export interface MockBTokenAdmin extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: MockBTokenAdminInterface;

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
    _acceptAdmin(
      bToken: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    _clearPendingAdmin(
      bToken: PromiseOrValue<string>,
      newPendingAdmin: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    _clearPendingImplementation(
      bToken: PromiseOrValue<string>,
      implementation: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    _queuePendingAdmin(
      bToken: PromiseOrValue<string>,
      newPendingAdmin: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    _queuePendingImplementation(
      bToken: PromiseOrValue<string>,
      implementation: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    _reduceReserves(
      bToken: PromiseOrValue<string>,
      reduceAmount: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    _setCollateralCap(
      bToken: PromiseOrValue<string>,
      newCollateralCap: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    _setComptroller(
      bToken: PromiseOrValue<string>,
      newComptroller: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    _setInterestRateModel(
      bToken: PromiseOrValue<string>,
      newInterestRateModel: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    _setReserveFactor(
      bToken: PromiseOrValue<string>,
      newReserveFactorMantissa: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    _togglePendingAdmin(
      bToken: PromiseOrValue<string>,
      newPendingAdmin: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    _togglePendingImplementation(
      bToken: PromiseOrValue<string>,
      implementation: PromiseOrValue<string>,
      allowResign: PromiseOrValue<boolean>,
      becomeImplementationData: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    admin(overrides?: CallOverrides): Promise<[string]>;

    adminQueue(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    blockTimestamp(overrides?: CallOverrides): Promise<[BigNumber]>;

    extractReserves(
      bToken: PromiseOrValue<string>,
      reduceAmount: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    getBTokenAdmin(
      bToken: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<[string]>;

    getBlockTimestamp(overrides?: CallOverrides): Promise<[BigNumber]>;

    implementationQueue(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    reserveManager(overrides?: CallOverrides): Promise<[string]>;

    seize(
      token: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    setAdmin(
      newAdmin: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    setBlockTimestamp(
      timestamp: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    setReserveManager(
      newReserveManager: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    timeLock(overrides?: CallOverrides): Promise<[BigNumber]>;
  };

  _acceptAdmin(
    bToken: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  _clearPendingAdmin(
    bToken: PromiseOrValue<string>,
    newPendingAdmin: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  _clearPendingImplementation(
    bToken: PromiseOrValue<string>,
    implementation: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  _queuePendingAdmin(
    bToken: PromiseOrValue<string>,
    newPendingAdmin: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  _queuePendingImplementation(
    bToken: PromiseOrValue<string>,
    implementation: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  _reduceReserves(
    bToken: PromiseOrValue<string>,
    reduceAmount: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  _setCollateralCap(
    bToken: PromiseOrValue<string>,
    newCollateralCap: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  _setComptroller(
    bToken: PromiseOrValue<string>,
    newComptroller: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  _setInterestRateModel(
    bToken: PromiseOrValue<string>,
    newInterestRateModel: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  _setReserveFactor(
    bToken: PromiseOrValue<string>,
    newReserveFactorMantissa: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  _togglePendingAdmin(
    bToken: PromiseOrValue<string>,
    newPendingAdmin: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  _togglePendingImplementation(
    bToken: PromiseOrValue<string>,
    implementation: PromiseOrValue<string>,
    allowResign: PromiseOrValue<boolean>,
    becomeImplementationData: PromiseOrValue<BytesLike>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  admin(overrides?: CallOverrides): Promise<string>;

  adminQueue(
    arg0: PromiseOrValue<string>,
    arg1: PromiseOrValue<string>,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  blockTimestamp(overrides?: CallOverrides): Promise<BigNumber>;

  extractReserves(
    bToken: PromiseOrValue<string>,
    reduceAmount: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  getBTokenAdmin(
    bToken: PromiseOrValue<string>,
    overrides?: CallOverrides
  ): Promise<string>;

  getBlockTimestamp(overrides?: CallOverrides): Promise<BigNumber>;

  implementationQueue(
    arg0: PromiseOrValue<string>,
    arg1: PromiseOrValue<string>,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  reserveManager(overrides?: CallOverrides): Promise<string>;

  seize(
    token: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  setAdmin(
    newAdmin: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  setBlockTimestamp(
    timestamp: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  setReserveManager(
    newReserveManager: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  timeLock(overrides?: CallOverrides): Promise<BigNumber>;

  callStatic: {
    _acceptAdmin(
      bToken: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    _clearPendingAdmin(
      bToken: PromiseOrValue<string>,
      newPendingAdmin: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<void>;

    _clearPendingImplementation(
      bToken: PromiseOrValue<string>,
      implementation: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<void>;

    _queuePendingAdmin(
      bToken: PromiseOrValue<string>,
      newPendingAdmin: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<void>;

    _queuePendingImplementation(
      bToken: PromiseOrValue<string>,
      implementation: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<void>;

    _reduceReserves(
      bToken: PromiseOrValue<string>,
      reduceAmount: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    _setCollateralCap(
      bToken: PromiseOrValue<string>,
      newCollateralCap: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<void>;

    _setComptroller(
      bToken: PromiseOrValue<string>,
      newComptroller: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    _setInterestRateModel(
      bToken: PromiseOrValue<string>,
      newInterestRateModel: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    _setReserveFactor(
      bToken: PromiseOrValue<string>,
      newReserveFactorMantissa: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    _togglePendingAdmin(
      bToken: PromiseOrValue<string>,
      newPendingAdmin: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    _togglePendingImplementation(
      bToken: PromiseOrValue<string>,
      implementation: PromiseOrValue<string>,
      allowResign: PromiseOrValue<boolean>,
      becomeImplementationData: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<void>;

    admin(overrides?: CallOverrides): Promise<string>;

    adminQueue(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    blockTimestamp(overrides?: CallOverrides): Promise<BigNumber>;

    extractReserves(
      bToken: PromiseOrValue<string>,
      reduceAmount: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<void>;

    getBTokenAdmin(
      bToken: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<string>;

    getBlockTimestamp(overrides?: CallOverrides): Promise<BigNumber>;

    implementationQueue(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    reserveManager(overrides?: CallOverrides): Promise<string>;

    seize(
      token: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<void>;

    setAdmin(
      newAdmin: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<void>;

    setBlockTimestamp(
      timestamp: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<void>;

    setReserveManager(
      newReserveManager: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<void>;

    timeLock(overrides?: CallOverrides): Promise<BigNumber>;
  };

  filters: {
    "ImplementationChanged(address,address)"(
      bToken?: PromiseOrValue<string> | null,
      newImplementation?: PromiseOrValue<string> | null
    ): ImplementationChangedEventFilter;
    ImplementationChanged(
      bToken?: PromiseOrValue<string> | null,
      newImplementation?: PromiseOrValue<string> | null
    ): ImplementationChangedEventFilter;

    "ImplementationCleared(address,address)"(
      bToken?: PromiseOrValue<string> | null,
      newImplementation?: PromiseOrValue<string> | null
    ): ImplementationClearedEventFilter;
    ImplementationCleared(
      bToken?: PromiseOrValue<string> | null,
      newImplementation?: PromiseOrValue<string> | null
    ): ImplementationClearedEventFilter;

    "ImplementationQueued(address,address,uint256)"(
      bToken?: PromiseOrValue<string> | null,
      newImplementation?: PromiseOrValue<string> | null,
      expiration?: null
    ): ImplementationQueuedEventFilter;
    ImplementationQueued(
      bToken?: PromiseOrValue<string> | null,
      newImplementation?: PromiseOrValue<string> | null,
      expiration?: null
    ): ImplementationQueuedEventFilter;

    "PendingAdminChanged(address,address)"(
      bToken?: PromiseOrValue<string> | null,
      newPendingAdmin?: PromiseOrValue<string> | null
    ): PendingAdminChangedEventFilter;
    PendingAdminChanged(
      bToken?: PromiseOrValue<string> | null,
      newPendingAdmin?: PromiseOrValue<string> | null
    ): PendingAdminChangedEventFilter;

    "PendingAdminCleared(address,address)"(
      bToken?: PromiseOrValue<string> | null,
      newPendingAdmin?: PromiseOrValue<string> | null
    ): PendingAdminClearedEventFilter;
    PendingAdminCleared(
      bToken?: PromiseOrValue<string> | null,
      newPendingAdmin?: PromiseOrValue<string> | null
    ): PendingAdminClearedEventFilter;

    "PendingAdminQueued(address,address,uint256)"(
      bToken?: PromiseOrValue<string> | null,
      newPendingAdmin?: PromiseOrValue<string> | null,
      expiration?: null
    ): PendingAdminQueuedEventFilter;
    PendingAdminQueued(
      bToken?: PromiseOrValue<string> | null,
      newPendingAdmin?: PromiseOrValue<string> | null,
      expiration?: null
    ): PendingAdminQueuedEventFilter;

    "SetAdmin(address,address)"(
      oldAdmin?: PromiseOrValue<string> | null,
      newAdmin?: PromiseOrValue<string> | null
    ): SetAdminEventFilter;
    SetAdmin(
      oldAdmin?: PromiseOrValue<string> | null,
      newAdmin?: PromiseOrValue<string> | null
    ): SetAdminEventFilter;

    "SetReserveManager(address,address)"(
      oldReserveManager?: PromiseOrValue<string> | null,
      newAdmin?: PromiseOrValue<string> | null
    ): SetReserveManagerEventFilter;
    SetReserveManager(
      oldReserveManager?: PromiseOrValue<string> | null,
      newAdmin?: PromiseOrValue<string> | null
    ): SetReserveManagerEventFilter;
  };

  estimateGas: {
    _acceptAdmin(
      bToken: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    _clearPendingAdmin(
      bToken: PromiseOrValue<string>,
      newPendingAdmin: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    _clearPendingImplementation(
      bToken: PromiseOrValue<string>,
      implementation: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    _queuePendingAdmin(
      bToken: PromiseOrValue<string>,
      newPendingAdmin: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    _queuePendingImplementation(
      bToken: PromiseOrValue<string>,
      implementation: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    _reduceReserves(
      bToken: PromiseOrValue<string>,
      reduceAmount: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    _setCollateralCap(
      bToken: PromiseOrValue<string>,
      newCollateralCap: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    _setComptroller(
      bToken: PromiseOrValue<string>,
      newComptroller: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    _setInterestRateModel(
      bToken: PromiseOrValue<string>,
      newInterestRateModel: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    _setReserveFactor(
      bToken: PromiseOrValue<string>,
      newReserveFactorMantissa: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    _togglePendingAdmin(
      bToken: PromiseOrValue<string>,
      newPendingAdmin: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    _togglePendingImplementation(
      bToken: PromiseOrValue<string>,
      implementation: PromiseOrValue<string>,
      allowResign: PromiseOrValue<boolean>,
      becomeImplementationData: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    admin(overrides?: CallOverrides): Promise<BigNumber>;

    adminQueue(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    blockTimestamp(overrides?: CallOverrides): Promise<BigNumber>;

    extractReserves(
      bToken: PromiseOrValue<string>,
      reduceAmount: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    getBTokenAdmin(
      bToken: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    getBlockTimestamp(overrides?: CallOverrides): Promise<BigNumber>;

    implementationQueue(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    reserveManager(overrides?: CallOverrides): Promise<BigNumber>;

    seize(
      token: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    setAdmin(
      newAdmin: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    setBlockTimestamp(
      timestamp: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    setReserveManager(
      newReserveManager: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    timeLock(overrides?: CallOverrides): Promise<BigNumber>;
  };

  populateTransaction: {
    _acceptAdmin(
      bToken: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    _clearPendingAdmin(
      bToken: PromiseOrValue<string>,
      newPendingAdmin: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    _clearPendingImplementation(
      bToken: PromiseOrValue<string>,
      implementation: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    _queuePendingAdmin(
      bToken: PromiseOrValue<string>,
      newPendingAdmin: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    _queuePendingImplementation(
      bToken: PromiseOrValue<string>,
      implementation: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    _reduceReserves(
      bToken: PromiseOrValue<string>,
      reduceAmount: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    _setCollateralCap(
      bToken: PromiseOrValue<string>,
      newCollateralCap: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    _setComptroller(
      bToken: PromiseOrValue<string>,
      newComptroller: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    _setInterestRateModel(
      bToken: PromiseOrValue<string>,
      newInterestRateModel: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    _setReserveFactor(
      bToken: PromiseOrValue<string>,
      newReserveFactorMantissa: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    _togglePendingAdmin(
      bToken: PromiseOrValue<string>,
      newPendingAdmin: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    _togglePendingImplementation(
      bToken: PromiseOrValue<string>,
      implementation: PromiseOrValue<string>,
      allowResign: PromiseOrValue<boolean>,
      becomeImplementationData: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    admin(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    adminQueue(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    blockTimestamp(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    extractReserves(
      bToken: PromiseOrValue<string>,
      reduceAmount: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    getBTokenAdmin(
      bToken: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    getBlockTimestamp(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    implementationQueue(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    reserveManager(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    seize(
      token: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    setAdmin(
      newAdmin: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    setBlockTimestamp(
      timestamp: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    setReserveManager(
      newReserveManager: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    timeLock(overrides?: CallOverrides): Promise<PopulatedTransaction>;
  };
}
