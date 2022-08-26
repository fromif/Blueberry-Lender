import { Contract } from "../Contract";
import { Callable, Sendable } from "../Invokation";
import { BTokenMethods } from "./BToken";
import { encodedNumber } from "../Encoding";

interface BErc20DelegatorMethods extends BTokenMethods {
  implementation(): Callable<string>;
  _setImplementation(
    implementation_: string,
    allowResign: boolean,
    becomImplementationData: string
  ): Sendable<void>;
}

interface BErc20DelegatorScenarioMethods extends BErc20DelegatorMethods {
  setTotalBorrows(amount: encodedNumber): Sendable<void>;
  setTotalReserves(amount: encodedNumber): Sendable<void>;
}

export interface BErc20Delegator extends Contract {
  methods: BErc20DelegatorMethods;
  name: string;
}

export interface BErc20DelegatorScenario extends Contract {
  methods: BErc20DelegatorMethods;
  name: string;
}

export interface BCollateralCapErc20DelegatorScenario extends Contract {
  methods: BErc20DelegatorMethods;
  name: string;
}

export interface BWrappedNativeDelegatorScenario extends Contract {
  methods: BErc20DelegatorMethods;
  name: string;
}
