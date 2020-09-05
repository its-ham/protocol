import Web3 from 'web3';
import { provider as Provider } from 'web3-core';
import BigNumber from 'bignumber.js'
import {
  Contracts
} from './lib/contracts';
import {
  Account
} from './lib/accounts';
import {
  EVM
} from "./lib/evm";

const oneEther = 1000000000000000000;

export interface HamOptions {
  ethereumNodeTimeout: number,
  defaultAccount?: any,
  defaultConfirmations?: number,
  autoGasMultiplier?: number,
  testing?: boolean,
  defaultGas?: string,
  defaultGasPrice?: string,
  accounts?: string[],
  confirmationType?: number
}

export class Ham {
  contracts: Contracts;
  testing: EVM | null;
  web3: Web3;
  accounts: Account[];
  snapshot: Promise<string | undefined>;

  constructor(
    provider: any,
    networkId: string,
    testing: boolean,
    options: HamOptions
  ) {
    var realProvider;

    if (typeof provider === 'string') {
      if (provider.includes("wss")) {
        realProvider = new Web3.providers.WebsocketProvider(
          provider,
          { timeout: options.ethereumNodeTimeout || 10000 }
        );
      } else {
        realProvider = new Web3.providers.HttpProvider(
          provider,
          { timeout: options.ethereumNodeTimeout || 10000 }
        );
      }
    } else {
      realProvider = provider;
    }

    this.web3 = new Web3(realProvider);

    if (testing) {
      this.testing = new EVM(realProvider);
      this.snapshot = this.testing.snapshot() as Promise<string>;
    } else {
      this.testing = null;
      this.snapshot = new Promise<undefined>((resolve) => resolve(undefined));;
    }

    if (options.defaultAccount) {
      this.web3.eth.defaultAccount = options.defaultAccount;
    }
    this.contracts = new Contracts(realProvider, networkId, this.web3, options);
    this.accounts = [];
  }

  async resetEVM() {
    if (this.testing) {
      this.testing.resetEVM(await this.snapshot);
    }
  }

  addAccount(address: string) {
    this.accounts.push(new Account(this.contracts, address));
  }

  setDefaultAccount(account: string) {
    this.web3.eth.defaultAccount = account;
    this.contracts.setDefaultAccount(account);
  }

  getDefaultAccount() {
    return this.web3.eth.defaultAccount;
  }
}
