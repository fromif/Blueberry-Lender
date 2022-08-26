import { Contract } from '../Contract';
import { Sendable } from '../Invokation';

export interface CompoundLensMethods {
  bTokenBalances(bToken: string, account: string): Sendable<[string,number,number,number,number,number]>;
  bTokenBalancesAll(bTokens: string[], account: string): Sendable<[string,number,number,number,number,number][]>;
  bTokenMetadata(bToken: string): Sendable<[string,number,number,number,number,number,number,number,number,boolean,number,string,number,number]>;
  bTokenMetadataAll(bTokens: string[]): Sendable<[string,number,number,number,number,number,number,number,number,boolean,number,string,number,number][]>;
  getAccountLimits(comptroller: string, account: string): Sendable<[string[],number,number]>;
}

export interface CompoundLens extends Contract {
  methods: CompoundLensMethods;
  name: string;
}
