import BigNumber from 'bignumber.js/bignumber';

import Web3 from 'web3';
import { provider as Provider } from 'web3-core';
import { AbiItem } from 'web3-utils';
import { Contract } from 'web3-eth-contract';

import { HamOptions } from '../Ham';
import * as Types from "./types";
import { SUBTRACT_GAS_LIMIT, addressMap } from './constants';

import ERC20Json from '../../../build/contracts/IERC20.json';
import HAMJson from '../../../build/contracts/HAMDelegator.json';
import HAMRebaserJson from '../../../build/contracts/HAMRebaser.json';
import HAMReservesJson from '../../../build/contracts/HAMReserves.json';
import HAMGovJson from '../../../build/contracts/GovernorAlpha.json';
import HAMTimelockJson from '../../../build/contracts/Timelock.json';
import WETHJson from './weth.json';
import SNXJson from './snx.json';
import UNIFactJson from './unifact2.json';
import UNIPairJson from './uni2.json';
import UNIRouterJson from './uniR.json';

import WETHPoolJson from '../../../build/contracts/HAMETHPool.json';
import AMPLPoolJson from '../../../build/contracts/HAMAMPLPool.json';
import YFIPoolJson from '../../../build/contracts/HAMYFIPool.json';

import MKRPoolJson from '../../../build/contracts/HAMMKRPool.json';
import LENDPoolJson from '../../../build/contracts/HAMLENDPool.json';
import COMPPoolJson from '../../../build/contracts/HAMCOMPPool.json';
import SNXPoolJson from '../../../build/contracts/HAMSNXPool.json';
import LINKPoolJson from '../../../build/contracts/HAMLINKPool.json';

import IncJson from '../../../build/contracts/HAMIncentivizer.json';

export class Contracts {
  defaultConfirmations: number;
  autoGasMultiplier: number;
  confirmationType: number;
  defaultGas: string;
  defaultGasPrice: string;

  blockGasLimit: number | undefined;

  notifier: undefined | {
    hash: ((txHash: string) => void)
  };

  web3: Web3;

  ham: Contract;
  uni_pair: Contract;
  uni_router : Contract;
  uni_fact : Contract;
  yfi : Contract;
  UNIAmpl : Contract;
  ycrv : Contract;

  yfi_pool : Contract;
  eth_pool : Contract;
  ampl_pool : Contract;
  ycrv_pool : Contract;

  comp_pool : Contract;
  link_pool : Contract;
  lend_pool : Contract;
  snx_pool : Contract;
  mkr_pool : Contract;

  comp : Contract;
  link : Contract;
  lend : Contract;
  snx : Contract;
  mkr : Contract;

  erc20 : Contract;
  pool : Contract;

  rebaser : Contract;
  reserves : Contract;
  gov : Contract;
  timelock : Contract;
  weth : Contract;

  constructor(
    provider: Provider,
    networkId: string,
    web3: Web3,
    options : HamOptions
  ) {
    this.web3 = web3;
    this.defaultConfirmations = options.defaultConfirmations || 1;
    this.autoGasMultiplier = options.autoGasMultiplier || 1.5;
    this.confirmationType = options.confirmationType || Types.ConfirmationType.Confirmed;
    this.defaultGas = options.defaultGas || '0';
    this.defaultGasPrice = options.defaultGasPrice || '30';

    this.uni_pair = new this.web3.eth.Contract(UNIPairJson as AbiItem[]);
    this.uni_router = new this.web3.eth.Contract(
      UNIRouterJson as AbiItem[], addressMap["UNIRouter"]);
    this.uni_fact = new this.web3.eth.Contract(
      UNIFactJson as AbiItem[], addressMap["uniswapFactoryV2"]);
    this.yfi = new this.web3.eth.Contract(ERC20Json.abi as AbiItem[], addressMap["YFI"]);
    this.UNIAmpl = new this.web3.eth.Contract(ERC20Json.abi as AbiItem[], addressMap["UNIAmpl"]);
    this.ycrv = new this.web3.eth.Contract(ERC20Json.abi as AbiItem[], addressMap["YCRV"]);
    this.ham = new this.web3.eth.Contract(HAMJson.abi as AbiItem[]);

    this.yfi_pool = new this.web3.eth.Contract(YFIPoolJson.abi as AbiItem[]);
    this.eth_pool = new this.web3.eth.Contract(WETHPoolJson.abi as AbiItem[]);
    this.ampl_pool = new this.web3.eth.Contract(AMPLPoolJson.abi as AbiItem[]);
    this.ycrv_pool = new this.web3.eth.Contract(IncJson.abi as AbiItem[]);

    this.comp_pool = new this.web3.eth.Contract(COMPPoolJson.abi as AbiItem[]);
    this.link_pool = new this.web3.eth.Contract(LINKPoolJson.abi as AbiItem[]);
    this.lend_pool = new this.web3.eth.Contract(LENDPoolJson.abi as AbiItem[]);
    this.snx_pool = new this.web3.eth.Contract(SNXPoolJson.abi as AbiItem[]);
    this.mkr_pool = new this.web3.eth.Contract(MKRPoolJson.abi as AbiItem[]);

    this.comp = new this.web3.eth.Contract(ERC20Json.abi as AbiItem[], addressMap["COMP"]);
    this.link = new this.web3.eth.Contract(ERC20Json.abi as AbiItem[], addressMap["LINK"]);
    this.lend = new this.web3.eth.Contract(ERC20Json.abi as AbiItem[], addressMap["LEND"]);
    this.snx = new this.web3.eth.Contract(ERC20Json.abi as AbiItem[], addressMap["SNX"]);
    this.mkr = new this.web3.eth.Contract(ERC20Json.abi as AbiItem[], addressMap["MKR"]);

    this.erc20 = new this.web3.eth.Contract(ERC20Json.abi as AbiItem[]);
    this.pool = new this.web3.eth.Contract(LENDPoolJson.abi as AbiItem[]);

    this.rebaser = new this.web3.eth.Contract(HAMRebaserJson.abi as AbiItem[]);
    this.reserves = new this.web3.eth.Contract(HAMReservesJson.abi as AbiItem[]);
    this.gov = new this.web3.eth.Contract(HAMGovJson.abi as AbiItem[]);
    this.timelock = new this.web3.eth.Contract(HAMTimelockJson.abi as AbiItem[]);
    this.weth = new this.web3.eth.Contract(WETHJson as AbiItem[], addressMap["WETH"]);

    this.setDefaultAccount(this.web3.eth.defaultAccount);

    // this.pools = [
    //   {"tokenAddr": this.yfi.options.address, "poolAddr": this.yfi_pool.options.address},
    //   {"tokenAddr": this.snx.options.address, "poolAddr": this.snx_pool.options.address},
    //   {"tokenAddr": this.weth.options.address, "poolAddr": this.eth_pool.options.address},
    //   {"tokenAddr": this.comp.options.address, "poolAddr": this.comp_pool.options.address},
    //   {"tokenAddr": this.link.options.address, "poolAddr": this.link_pool.options.address},
    //   {"tokenAddr": this.lend.options.address, "poolAddr": this.lend_pool.options.address},
    //   {"tokenAddr": this.mkr.options.address, "poolAddr": this.mkr_pool.options.address},
    //   {"tokenAddr": this.UNIAmpl.options.address, "poolAddr": this.ampl_pool.options.address},
    // ]
  }

  setDefaultAccount(account: string | null) : void {
    this.yfi.options.from = account || undefined;
    this.ycrv.options.from = account || undefined;
    this.ham.options.from = account || undefined;
    this.weth.options.from = account || undefined;
  }

  async callContractFunction(
    method: any,
    options: {
      confirmations: number,
      confirmationType: number,
      autoGasMultiplier: number,
      [key: string]: any
    }
  ) {
    const { confirmations, confirmationType, autoGasMultiplier, ...txOptions } = options;

    if (!this.blockGasLimit) {
      await this.setGasLimit();
    }

    if (!txOptions.gasPrice && this.defaultGasPrice) {
      txOptions.gasPrice = this.defaultGasPrice;
    }

    if (confirmationType === Types.ConfirmationType.Simulate || !options.gas) {
      let gasEstimate;
      if (this.defaultGas && confirmationType !== Types.ConfirmationType.Simulate) {
        txOptions.gas = this.defaultGas;
      } else {
        try {
          console.log("estimating gas");
          gasEstimate = await method.estimateGas(txOptions);
        } catch (error) {
          const data = method.encodeABI();
          const { from, value } = options;
          const to = method._parent._address;
          error.transactionData = { from, value, data, to };
          throw error;
        }

        const multiplier = autoGasMultiplier || this.autoGasMultiplier;
        const totalGas = Math.floor(gasEstimate * multiplier);
        txOptions.gas = this.blockGasLimit && totalGas < this.blockGasLimit ? totalGas : this.blockGasLimit;
      }

      if (confirmationType === Types.ConfirmationType.Simulate) {
        let g = txOptions.gas;
        return { gasEstimate, g };
      }
    }

    if (txOptions.value) {
      txOptions.value = new BigNumber(txOptions.value).toFixed(0);
    } else {
      txOptions.value = '0';
    }

    const promi = method.send(txOptions);

    const OUTCOMES = {
      INITIAL: 0,
      RESOLVED: 1,
      REJECTED: 2,
    };

    let hashOutcome = OUTCOMES.INITIAL;
    let confirmationOutcome = OUTCOMES.INITIAL;

    const t = confirmationType !== undefined ? confirmationType : this.confirmationType;

    if (!Object.values(Types.ConfirmationType).includes(t)) {
      throw new Error(`Invalid confirmation type: ${t}`);
    }

    let hashPromise;
    let confirmationPromise;

    if (t === Types.ConfirmationType.Hash || t === Types.ConfirmationType.Both) {
      hashPromise = new Promise(
        (resolve, reject) => {
          promi.on('error', (error: any) => {
            if (hashOutcome === OUTCOMES.INITIAL) {
              hashOutcome = OUTCOMES.REJECTED;
              reject(error);
              const anyPromi = promi ;
              anyPromi.off();
            }
          });

          promi.on('transactionHash', (txHash: string) => {
            if (hashOutcome === OUTCOMES.INITIAL) {
              hashOutcome = OUTCOMES.RESOLVED;
              resolve(txHash);
              if (t !== Types.ConfirmationType.Both) {
                const anyPromi = promi ;
                anyPromi.off();
              }
            }
          });
        },
      );
    }

    if (t === Types.ConfirmationType.Confirmed || t === Types.ConfirmationType.Both) {
      confirmationPromise = new Promise(
        (resolve, reject) => {
          promi.on('error', (error: any) => {
            if (
              (t === Types.ConfirmationType.Confirmed || hashOutcome === OUTCOMES.RESOLVED)
              && confirmationOutcome === OUTCOMES.INITIAL
            ) {
              confirmationOutcome = OUTCOMES.REJECTED;
              reject(error);
              const anyPromi = promi ;
              anyPromi.off();
            }
          });

          const desiredConf = confirmations || this.defaultConfirmations;
          if (desiredConf) {
            promi.on('confirmation', (confNumber: number, receipt: any) => {
              if (confNumber >= desiredConf) {
                if (confirmationOutcome === OUTCOMES.INITIAL) {
                  confirmationOutcome = OUTCOMES.RESOLVED;
                  resolve(receipt);
                  const anyPromi = promi ;
                  anyPromi.off();
                }
              }
            });
          } else {
            promi.on('receipt', (receipt: any) => {
              confirmationOutcome = OUTCOMES.RESOLVED;
              resolve(receipt);
              const anyPromi = promi ;
              anyPromi.off();
            });
          }
        },
      );
    }

    if (t === Types.ConfirmationType.Hash) {
      const transactionHash = await hashPromise;
      if (this.notifier && transactionHash) {
          this.notifier.hash(transactionHash as string)
      }
      return { transactionHash };
    }

    if (t === Types.ConfirmationType.Confirmed) {
      return confirmationPromise;
    }

    const transactionHash = await hashPromise;
    if (this.notifier && transactionHash) {
        this.notifier.hash(transactionHash as string)
    }
    return {
      transactionHash,
      confirmation: confirmationPromise,
    };
  }

  async callConstantContractFunction(
    method: any,
    options: { blockNumber: number, [key: string]: any}
  ) {
    const m2 = method;
    const { blockNumber, ...txOptions } = options;
    return m2.call(txOptions, blockNumber);
  }

  async setGasLimit() {
    const block = await this.web3.eth.getBlock('latest');
    this.blockGasLimit = block.gasLimit - SUBTRACT_GAS_LIMIT;
  }
}
