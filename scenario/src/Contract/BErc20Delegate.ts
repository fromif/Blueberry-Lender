import { Contract } from '../Contract';
import { Sendable } from '../Invokation';
import { BTokenMethods, BTokenScenarioMethods } from './BToken';

interface BErc20DelegateMethods extends BTokenMethods {
  _becomeImplementation(data: string): Sendable<void>;
  _resignImplementation(): Sendable<void>;
}

interface BErc20DelegateScenarioMethods extends BTokenScenarioMethods {
  _becomeImplementation(data: string): Sendable<void>;
  _resignImplementation(): Sendable<void>;
}

export interface BErc20Delegate extends Contract {
  methods: BErc20DelegateMethods;
  name: string;
}

export interface BErc20DelegateScenario extends Contract {
  methods: BErc20DelegateScenarioMethods;
  name: string;
}
