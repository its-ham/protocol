import { ethers, deployments, waffle } from "@nomiclabs/buidler";
import { Deployment } from "@nomiclabs/buidler/types";
import { MockProvider, solidity } from "ethereum-waffle";
import { BigNumber, constants, Contract, Signer, utils } from "ethers";
import { ecsign, toBuffer } from 'ethereumjs-util';

import { UniswapPair } from "../build/typechain/UniswapPair";
import { UniswapPairFactory } from "../build/typechain/UniswapPairFactory";
import { UniswapV2Factory } from "../build/typechain/UniswapV2Factory";
import { UniswapV2FactoryFactory } from "../build/typechain/UniswapV2FactoryFactory";
import { UniswapV2Router02 } from "../build/typechain/UniswapV2Router02";
import { UniswapV2Router02Factory } from "../build/typechain/UniswapV2Router02Factory";

import { Ham } from "../build/typechain/Ham";
import { HamFactory } from "../build/typechain/HamFactory";
import { HamRebaser } from "../build/typechain/HamRebaser";
import { HamRebaserFactory } from "../build/typechain/HamRebaserFactory";
import { HamReserves } from "../build/typechain/HamReserves";
import { HamReservesFactory } from "../build/typechain/HamReservesFactory";
import { StubToken } from "../build/typechain/StubToken";
import { StubTokenFactory } from "../build/typechain/StubTokenFactory";

import { increaseTime, mineBlock } from "./evm";

import chai from "chai";

chai.use(solidity);

describe("rebase_tests", () => {
  const { expect } = chai;
  const { provider, loadFixture } = waffle;
  const [
    user,
    a1,
    a2,
    a3,
    a4,
    guy
  ] = provider.getWallets();

  let ham : Ham;
  let rebaser : HamRebaser;
  let ycrv : StubToken;
  let reserves : HamReserves;
  let uniswapFactory : UniswapV2Factory;
  let uniswapRouter : UniswapV2Router02;

  const oneEth = BigNumber.from(10).pow(18);
  const oneHundredEth = oneEth.mul(100);
  const uniswapDeadline = BigNumber.from(10000000).add(1596740361);

  async function deploymentFixture(wallets : Signer[], provider : MockProvider) {
    await deployments.fixture();

    let hamDeployment = await deployments.get("HAM");
    let rebaserDeployment = await deployments.get("HAMRebaser");
    let reservesDeployment = await deployments.get("HAMReserves");
    let ycrvDeployment = await deployments.get("yCRV");
    let uniFactDeployment = await deployments.get("UniswapV2Factory");
    let uniRouterDeployment = await deployments.get("UniswapV2Router");

    return {
      ham: HamFactory.connect(hamDeployment.address, user),
      rebaser: HamRebaserFactory.connect(rebaserDeployment.address, user),
      reserves: HamReservesFactory.connect(reservesDeployment.address, user),
      ycrv: StubTokenFactory.connect(ycrvDeployment.address, user),
      uniswapFactory: UniswapV2FactoryFactory.connect(uniFactDeployment.address, user),
      uniswapRouter: UniswapV2Router02Factory.connect(uniRouterDeployment.address, user),
    };
  }

  beforeEach(async () => {
    ({ ham, rebaser, reserves, ycrv, uniswapFactory, uniswapRouter } = await loadFixture(deploymentFixture));
  });

  describe("rebase", () => {
    it("user has ycrv", async () => {
      let bal0 = await ycrv.balanceOf(user.address);
      expect(bal0).to.be.eq(BigNumber.from("2000000000000000000000000"));
    });

    it("create pair", async () => {
      await uniswapFactory.createPair(
        ycrv.address,
        ham.address,
        { gasLimit: 8000000 }
      );
      });

    it("mint pair", async () => {
      await ham.approve(
        uniswapRouter.address,
        constants.MaxUint256.sub(1),
        { gasLimit: 80000 }
      );
      await ycrv.approve(
        uniswapRouter.address,
        constants.MaxUint256.sub(1),
        { gasLimit: 80000 }
      );
      await uniswapRouter.addLiquidity(
        ham.address,
        ycrv.address,
        BigNumber.from(10000000),
        BigNumber.from(10000000),
        BigNumber.from(10000000),
        BigNumber.from(10000000),
        user.address,
        uniswapDeadline,
        { gasLimit: 8000000 }
      );
      let pairAddress = await uniswapFactory.getPair(
        ham.address,
        ycrv.address
      );
      let pair = UniswapPairFactory.connect(pairAddress, user);
      let bal = await pair.balanceOf(user.address);
      expect(bal).to.be.gt(100);
    });

    it("init_twap", async () => {
      await ham.approve(
        uniswapRouter.address,
        constants.MaxUint256.sub(1), { gasLimit: 80000}
      );
      await ycrv.approve(
        uniswapRouter.address,
        constants.MaxUint256.sub(1), { gasLimit: 80000}
      );

      await uniswapRouter.addLiquidity(
        ham.address,
        ycrv.address,
        BigNumber.from(10000000),
        BigNumber.from(10000000),
        BigNumber.from(10000000),
        BigNumber.from(10000000),
        user.address,
        uniswapDeadline,
        { gasLimit: 8000000 }
      );
      let pairAddress = await uniswapFactory.getPair(
        ham.address,
        ycrv.address
      );
      let pair = UniswapPairFactory.connect(pairAddress, user);
      let bal = await pair.balanceOf(user.address);

      // make a trade to get init values in uniswap
      await uniswapRouter.swapExactTokensForTokens(
        BigNumber.from(1000),
        BigNumber.from(100),
        [
          ham.address,
          ycrv.address
        ],
        user.address,
        uniswapDeadline,
        { gasLimit: 1000000 });

      await increaseTime(provider, 1000);

      await rebaser.init_twap({
        gasLimit: 500000
      });

      let init_twap = await rebaser.timeOfTWAPInit();
      let priceCumulativeLast = await rebaser.priceCumulativeLast();
      expect(init_twap).to.be.gt(0);
      expect(priceCumulativeLast).to.be.gte(0);
      });

    it("activate rebasing", async () => {
      await ham.approve(
        uniswapRouter.address,
        constants.MaxUint256.sub(1),
        { gasLimit: 80000 }
      );

      await ycrv.approve(
        uniswapRouter.address,
        constants.MaxUint256.sub(1),
        { gasLimit: 80000 }
      );

      let pairAddress = await uniswapFactory.getPair(
        ham.address,
        ycrv.address
      );
      let pair = UniswapPairFactory.connect(pairAddress, user);

      await uniswapRouter.addLiquidity(
        ham.address,
        ycrv.address,
        BigNumber.from(100000),
        BigNumber.from(100000),
        BigNumber.from(100000),
        BigNumber.from(100000),
        user.address,
        uniswapDeadline,
        { gasLimit: 8000000 }
      );

      // make a trade to get init values in uniswap
      await uniswapRouter.swapExactTokensForTokens(
        BigNumber.from(1000),
        BigNumber.from(100),
        [
          ham.address,
          ycrv.address
        ],
        user.address,
        uniswapDeadline,
        { gasLimit: 1000000 }
      );

      await increaseTime(provider, 1000);

      await rebaser.init_twap({
        gasLimit: 500000
      });

      let init_twap = await rebaser.timeOfTWAPInit();
      let priceCumulativeLast = await rebaser.priceCumulativeLast();
      expect(init_twap).to.be.gt(0);
      expect(priceCumulativeLast).to.be.gt(0);

      await increaseTime(provider, 12 * 60 * 60);

      await rebaser.activate_rebasing({
        gasLimit: 500000
      });
    });

    it("positive rebasing", async () => {
      await ham.approve(
        uniswapRouter.address,
        constants.MaxUint256.sub(1), { gasLimit: 80000 }
      );
      await ycrv.approve(
        uniswapRouter.address,
        constants.MaxUint256.sub(1), { gasLimit: 80000 }
      );

      await uniswapRouter.addLiquidity(
        ham.address,
        ycrv.address,
        BigNumber.from("1000000000000000000000000"),
        BigNumber.from("1000000000000000000000000"),
        BigNumber.from("1000000000000000000000000"),
        BigNumber.from("1000000000000000000000000"),
        user.address,
        uniswapDeadline,
        {
          gasLimit: 8000000
        }
      );

      let pairAddress = await uniswapFactory.getPair(
        ham.address,
        ycrv.address
      );
      let pair = UniswapPairFactory.connect(pairAddress, user);

      let bal = await pair.balanceOf(user.address);

      // make a trade to get init values in uniswap
      await uniswapRouter.swapExactTokensForTokens(
        BigNumber.from("100000000000"),
        BigNumber.from(100000),
        [
          ycrv.address,
          ham.address
        ],
        user.address,
        uniswapDeadline,
        {
          gasLimit: 1000000
        }
      );

      // trade back for easier calcs later
      await uniswapRouter.swapExactTokensForTokens(
        BigNumber.from("100000000000"),
        BigNumber.from(100000),
        [
          ham.address,
          ycrv.address
        ],
        user.address,
        uniswapDeadline,
        {
          gasLimit: 1000000
        }
      );

      await increaseTime(provider, 43200);

      await rebaser.init_twap({
        gasLimit: 500000
      });

      await uniswapRouter.swapExactTokensForTokens(
        BigNumber.from("100000000000000000000000"),
        BigNumber.from(100000),
        [
          ycrv.address,
          ham.address
        ],
        user.address,
        uniswapDeadline,
        {
          gasLimit: 1000000
        }
      );

      // init twap
      let init_twap = await rebaser.timeOfTWAPInit();

      // wait 12 hours
      await increaseTime(provider, 12 * 60 * 60);

      // perform trade to change price
      await uniswapRouter.swapExactTokensForTokens(
        BigNumber.from("10000000000000000000"),
        BigNumber.from(100000),
        [
          ycrv.address,
          ham.address
        ],
        user.address,
        uniswapDeadline,
        {
          gasLimit: 1000000
        }
      );

      // activate rebasing
      await rebaser.activate_rebasing({
        gasLimit: 500000
      });
      await mineBlock(provider);

      let res_bal = await ham.balanceOf(
          reserves.address
      );

      expect(res_bal).to.be.eq("0");

      bal = await ham.balanceOf(user.address);

      let a = await provider.getBlock('latest');

      let offset = (await rebaser.rebaseWindowOffsetSec()).toNumber();
      let interval = (await rebaser.minRebaseTimeIntervalSec()).toNumber();

      let i;
      if (a["timestamp"] % interval > offset) {
        i = (interval - (a["timestamp"] % interval)) + offset;
      } else {
        i = offset - (a["timestamp"] % interval);
      }

      await increaseTime(provider, i);

      let r = await pair.getReserves();
      let q = await uniswapRouter.quote(oneEth.toString(), r[0], r[1]);
      console.log("quote pre positive rebase", q);

      await rebaser.rebase({
        gasLimit: 2500000
      });

      //console.log(b.events)
      //console.log("positive rebase gas used:", b["gasUsed"]);

      let bal1 = await ham.balanceOf(user.address);

      let resHAM = await ham.balanceOf(reserves.address);

      let resycrv = await ycrv.balanceOf(reserves.address);

      console.log("bal user, bal ham res, bal res crv", bal1, resHAM, resycrv);
      r = await pair.getReserves();
      q = await uniswapRouter.quote(oneEth.toString(), r[0], r[1]);
      console.log("post positive rebase quote", q);

      // new balance > old balance
      expect(bal).to.be.lte(bal1);
      // used full ham reserves
      expect(resHAM).to.be.eq(0);
      // increases reserves
      expect(resycrv).to.be.gte(0);

      // not below peg
      expect(q).to.be.gte(oneEth);
    });

    it("negative rebasing", async () => {
      await ham.approve(
        uniswapRouter.address,
        constants.MaxUint256.sub(1), { gasLimit: 80000 }
      );
      await ycrv.approve(
        uniswapRouter.address,
        constants.MaxUint256.sub(1), { gasLimit: 80000 }
      );

      await uniswapRouter.addLiquidity(
        ham.address,
        ycrv.address,
        BigNumber.from("1000000000000000000000000"),
        BigNumber.from("1000000000000000000000000"),
        BigNumber.from("1000000000000000000000000"),
        BigNumber.from("1000000000000000000000000"),
        user.address,
        uniswapDeadline,
        { gasLimit: 8000000 });

      let pairAddress = await uniswapFactory.getPair(
        ham.address,
        ycrv.address
      );
      let pair = UniswapPairFactory.connect(pairAddress, user);

      let bal = await pair.balanceOf(user.address);

      // make a trade to get init values in uniswap
      await uniswapRouter.swapExactTokensForTokens(
        BigNumber.from("100000000000"),
        BigNumber.from(100000),
        [
          ycrv.address,
          ham.address
        ],
        user.address,
        uniswapDeadline,
        { gasLimit: 1000000 });

      // trade back for easier calcs later
      await uniswapRouter.swapExactTokensForTokens(
        BigNumber.from("100000000000"),
        BigNumber.from(100000),
        [
          ham.address,
          ycrv.address
        ],
        user.address,
        uniswapDeadline,
        { gasLimit: 1000000 }
      );

      await increaseTime(provider, 43200);

      await rebaser.init_twap({
        gasLimit: 500000
      });


      await uniswapRouter.swapExactTokensForTokens(
        BigNumber.from("500000000000000000000000"),
        BigNumber.from(100000),
        [
          ham.address,
          ycrv.address
        ],
        user.address,
        uniswapDeadline,
        { gasLimit: 1000000 });

      // init twap
      let init_twap = await rebaser.timeOfTWAPInit();

      // wait 12 hours
      await increaseTime(provider, 12 * 60 * 60);

      // perform trade to change price
      await uniswapRouter.swapExactTokensForTokens(
        BigNumber.from("10000000000000000000"),
        BigNumber.from(100000),
        [
          ham.address,
          ycrv.address
        ],
        user.address,
        uniswapDeadline,
        { gasLimit: 1000000 });

      // activate rebasing
      await rebaser.activate_rebasing({
        gasLimit: 500000
      });


      bal = await ham.balanceOf(user.address);

      let a = await provider.getBlock('latest');

      let offset = (await rebaser.rebaseWindowOffsetSec()).toNumber();
      let interval = (await rebaser.minRebaseTimeIntervalSec()).toNumber();

      let i;
      if (a["timestamp"] % interval > offset) {
        i = (interval - (a["timestamp"] % interval)) + offset;
      } else {
        i = offset - (a["timestamp"] % interval);
      }

      await increaseTime(provider, i);

      let r = await pair.getReserves();
      let q = await uniswapRouter.quote(oneEth.toString(), r[0], r[1]);
      console.log("quote pre negative rebase", q);

      let tx = await rebaser.rebase({
        gasLimit: 2500000
      });
      let txReceipt = await tx.wait(1);

      //console.log(b.events)
      console.log("negative rebase gas used:", txReceipt.gasUsed);

      let bal1 = await ham.balanceOf(user.address);

      let resHAM = await ham.balanceOf(reserves.address);

      let resycrv = await ycrv.balanceOf(reserves.address);

      // balance decreases
      expect(bal1).to.be.lte(bal);
      // no increases to reserves
      expect(resHAM).to.be.eq(0);
      expect(resycrv).to.be.eq(0);
    });
    it("no rebasing", async () => {
      await ham.approve(
        uniswapRouter.address,
        constants.MaxUint256.sub(1), { gasLimit: 80000 }
      );
      await ycrv.approve(
        uniswapRouter.address,
        constants.MaxUint256.sub(1), { gasLimit: 80000 }
      );

      await uniswapRouter.addLiquidity(
        ham.address,
        ycrv.address,
        BigNumber.from("1000000000000000000000000"),
        BigNumber.from("1000000000000000000000000"),
        BigNumber.from("1000000000000000000000000"),
        BigNumber.from("1000000000000000000000000"),
        user.address,
        uniswapDeadline,
        { gasLimit: 8000000 });

      let pairAddress = await uniswapFactory.getPair(
        ham.address,
        ycrv.address
      );
      let pair = UniswapPairFactory.connect(pairAddress, user);

      let bal = await pair.balanceOf(user.address);

      // make a trade to get init values in uniswap
      await uniswapRouter.swapExactTokensForTokens(
        BigNumber.from("100000000000"),
        BigNumber.from(100000),
        [
          ycrv.address,
          ham.address
        ],
        user.address,
        uniswapDeadline,
        { gasLimit: 1000000 });

      // trade back for easier calcs later
      await uniswapRouter.swapExactTokensForTokens(
        BigNumber.from("100000000000"),
        BigNumber.from(100000),
        [
          ham.address,
          ycrv.address
        ],
        user.address,
        uniswapDeadline,
        { gasLimit: 1000000 });

      await increaseTime(provider, 43200);

      await rebaser.init_twap({
        gasLimit: 500000
      });


      await uniswapRouter.swapExactTokensForTokens(
        BigNumber.from("10000000000000000000000"),
        BigNumber.from(100000),
        [
          ham.address,
          ycrv.address
        ],
        user.address,
        uniswapDeadline,
        { gasLimit: 1000000 });

      await uniswapRouter.swapExactTokensForTokens(
        BigNumber.from("10000000000000000000000"),
        BigNumber.from(100000),
        [
          ycrv.address,
          ham.address
        ],
        user.address,
        uniswapDeadline,
        { gasLimit: 1000000 });

      // init twap
      let init_twap = await rebaser.timeOfTWAPInit();

      // wait 12 hours
      await increaseTime(provider, 12 * 60 * 60);

      // perform trade to change price
      await uniswapRouter.swapExactTokensForTokens(
        BigNumber.from("10000000000000000000"),
        BigNumber.from(100000),
        [
          ham.address,
          ycrv.address
        ],
        user.address,
        uniswapDeadline,
        { gasLimit: 1000000 });

      await uniswapRouter.swapExactTokensForTokens(
        BigNumber.from("10000000000000000000"),
        BigNumber.from(100000),
        [
          ycrv.address,
          ham.address
        ],
        user.address,
        uniswapDeadline,
        { gasLimit: 1000000 });

      // activate rebasing
      await rebaser.activate_rebasing({
        gasLimit: 500000
      });


      bal = await ham.balanceOf(user.address);

      let a = await provider.getBlock('latest');

      let offset = (await rebaser.rebaseWindowOffsetSec()).toNumber();
      let interval = (await rebaser.minRebaseTimeIntervalSec()).toNumber();

      let i;
      if (a["timestamp"] % interval > offset) {
        i = (interval - (a["timestamp"] % interval)) + offset;
      } else {
        i = offset - (a["timestamp"] % interval);
      }

      await increaseTime(provider, i);

      let r = await pair.getReserves();
      console.log(r, r[0], r[1]);
      let q = await uniswapRouter.quote(oneEth.toString(), r[0], r[1]);
      console.log("quote pre no rebase", q);
      let tx = await rebaser.rebase({
        gasLimit: 2500000
      });
      let txReceipt = await tx.wait(1);

      console.log("no rebase gas used:", txReceipt.gasUsed);

      let bal1 = await ham.balanceOf(user.address);

      let resHAM = await ham.balanceOf(reserves.address);

      let resycrv = await ycrv.balanceOf(reserves.address);

      // no change
      expect(bal1).to.be.eq(bal);
      // no increases to reserves
      expect(resHAM).to.be.eq(0);
      expect(resycrv).to.be.eq(0);
      r = await pair.getReserves();
      q = await uniswapRouter.quote(oneEth.toString(), r[0], r[1]);
      console.log("quote post no rebase", q);
    });
    it("rebasing with HAM in reserves", async () => {
      await ham.approve(
        uniswapRouter.address,
        constants.MaxUint256.sub(1), { gasLimit: 80000 }
      );
      await ycrv.approve(
        uniswapRouter.address,
        constants.MaxUint256.sub(1), { gasLimit: 80000 }
      );

      await uniswapRouter.addLiquidity(
        ham.address,
        ycrv.address,
        BigNumber.from("1000000000000000000000000"),
        BigNumber.from("1000000000000000000000000"),
        BigNumber.from("1000000000000000000000000"),
        BigNumber.from("1000000000000000000000000"),
        user.address,
        uniswapDeadline,
        { gasLimit: 8000000 }
      );

      let pairAddress = await uniswapFactory.getPair(
        ham.address,
        ycrv.address
      );
      let pair = UniswapPairFactory.connect(pairAddress, user);

      let bal = await pair.balanceOf(user.address);

      // make a trade to get init values in uniswap
      await uniswapRouter.swapExactTokensForTokens(
        BigNumber.from("100000000000"),
        BigNumber.from(100000),
        [
          ycrv.address,
          ham.address
        ],
        user.address,
        uniswapDeadline,
        { gasLimit: 1000000 });

      // trade back for easier calcs later
      await uniswapRouter.swapExactTokensForTokens(
        BigNumber.from("100000000000"),
        BigNumber.from(100000),
        [
          ham.address,
          ycrv.address
        ],
        user.address,
        uniswapDeadline,
        { gasLimit: 1000000 });

      await increaseTime(provider, 43200);

      await rebaser.init_twap({
        gasLimit: 500000
      });


      await uniswapRouter.swapExactTokensForTokens(
        BigNumber.from("500000000000000000000000"),
        BigNumber.from("100000"),
        [
          ycrv.address,
          ham.address
        ],
        user.address,
        uniswapDeadline, { gasLimit: 1000000 });

      // init twap
      let init_twap = await rebaser.timeOfTWAPInit();

      // wait 12 hours
      await increaseTime(provider, 12 * 60 * 60);

      // perform trade to change price
      await uniswapRouter.swapExactTokensForTokens(
        BigNumber.from("10000000000000000000"),
        BigNumber.from("100000"),
        [
          ycrv.address,
          ham.address
        ],
        user.address,
        uniswapDeadline, { gasLimit: 1000000 });

      // activate rebasing
      await rebaser.activate_rebasing({
        gasLimit: 500000
      });


      bal = await ham.balanceOf(user.address);

      let a = await provider.getBlock('latest');

      let offset = (await rebaser.rebaseWindowOffsetSec()).toNumber();
      let interval = (await rebaser.minRebaseTimeIntervalSec()).toNumber();

      let i;
      if (a["timestamp"] % interval > offset) {
        i = (interval - (a["timestamp"] % interval)) + offset;
      } else {
        i = offset - (a["timestamp"] % interval);
      }

      await increaseTime(provider, i);

      let r = await pair.getReserves();
      let q = await uniswapRouter.quote(oneEth.toString(), r[0], r[1]);
      console.log("quote pre pos rebase with reserves", q);

      let tx = await rebaser.rebase({
        gasLimit: 2500000
      });
      let txReceipt = await tx.wait(1);

      console.log("positive  with reserves gas used:", txReceipt.gasUsed);

      let bal1 = await ham.balanceOf(user.address);

      let resHAM = await ham.balanceOf(reserves.address);

      let resycrv = await ycrv.balanceOf(reserves.address);

      console.log(bal, bal1, resHAM, resycrv);
      expect(bal).to.be.lte(bal1);
      expect(resHAM).to.be.gte(0);
      expect(resycrv).to.be.gte(0);
      r = await pair.getReserves();
      q = await uniswapRouter.quote(oneEth.toString(), r[0], r[1]);
      console.log("quote post rebase w/ reserves", q);
      expect(q).to.be.gte(oneEth);
    });
  });

  describe("failing", () => {
    it("unitialized rebasing", async () => {
      await expect(rebaser.activate_rebasing({
        gasLimit: 500000
      })).to.reverted;//"twap wasnt intitiated, call init_twap()");
    });
    it("no early twap", async () => {
      await expect(rebaser.init_twap({
        gasLimit: 500000
      })).to.be.reverted;
    });
    it("too late rebasing", async () => {
      await ham.approve(
        uniswapRouter.address,
        constants.MaxUint256.sub(1), { gasLimit: 80000 });
      await ycrv.approve(
        uniswapRouter.address,
        constants.MaxUint256.sub(1), { gasLimit: 80000 });

      await uniswapRouter.addLiquidity(
        ham.address,
        ycrv.address,
        BigNumber.from("1000000000000000000000000"),
        BigNumber.from("1000000000000000000000000"),
        BigNumber.from("1000000000000000000000000"),
        BigNumber.from("1000000000000000000000000"),
        user.address,
        uniswapDeadline,
        { gasLimit: 8000000 });

      let pairAddress = await uniswapFactory.getPair(
        ham.address,
        ycrv.address
      );
      let pair = UniswapPairFactory.connect(pairAddress, user);

      let bal = await pair.balanceOf(user.address);

      // make a trade to get init values in uniswap
      await uniswapRouter.swapExactTokensForTokens(
        BigNumber.from("100000000000"),
        BigNumber.from(100000),
        [
          ycrv.address,
          ham.address
        ],
        user.address,
        uniswapDeadline,
        { gasLimit: 1000000 });

      // trade back for easier calcs later
      await uniswapRouter.swapExactTokensForTokens(
        BigNumber.from("100000000000"),
        BigNumber.from(100000),
        [
          ham.address,
          ycrv.address
        ],
        user.address,
        uniswapDeadline,
        { gasLimit: 1000000 });

      await increaseTime(provider, 43200);

      await rebaser.init_twap({
        gasLimit: 500000
      });


      await uniswapRouter.swapExactTokensForTokens(
        BigNumber.from("500000000000000000000000"),
        BigNumber.from(100000),
        [
          ycrv.address,
          ham.address
        ],
        user.address,
        uniswapDeadline,
        { gasLimit: 1000000 });

      // init twap
      let init_twap = await rebaser.timeOfTWAPInit();

      // wait 12 hours
      await increaseTime(provider, 12 * 60 * 60);

      // perform trade to change price
      await uniswapRouter.swapExactTokensForTokens(
        BigNumber.from("10000000000000000000"),
        BigNumber.from(100000),
        [
          ycrv.address,
          ham.address
        ],
        user.address,
        uniswapDeadline,
        { gasLimit: 1000000 });

      // activate rebasing
      await rebaser.activate_rebasing({
        gasLimit: 500000
      });


      bal = await ham.balanceOf(user.address);

      let a = await provider.getBlock('latest');

      let offset = (await rebaser.rebaseWindowOffsetSec()).toNumber();
      let interval = (await rebaser.minRebaseTimeIntervalSec()).toNumber();

      let i;
      if (a["timestamp"] % interval > offset) {
        i = (interval - (a["timestamp"] % interval)) + offset;
      } else {
        i = offset - (a["timestamp"] % interval);
      }

      let len = await rebaser.rebaseWindowLengthSec();

      await increaseTime(provider, i + BigNumber.from(len).toNumber()+1);

      let b = await expect(rebaser.rebase({
        gasLimit: 2500000
      })).to.be.reverted;//, "too late");
    });

    it("too early rebasing", async () => {
      await ham.approve(
        uniswapRouter.address,
        constants.MaxUint256.sub(1), { gasLimit: 80000 });
      await ycrv.approve(
        uniswapRouter.address,
        constants.MaxUint256.sub(1), { gasLimit: 80000 }
      );

      await uniswapRouter.addLiquidity(
        ham.address,
        ycrv.address,
        BigNumber.from("1000000000000000000000000"),
        BigNumber.from("1000000000000000000000000"),
        BigNumber.from("1000000000000000000000000"),
        BigNumber.from("1000000000000000000000000"),
        user.address,
        uniswapDeadline, { gasLimit: 8000000 });

      let pairAddress = await uniswapFactory.getPair(
        ham.address,
        ycrv.address
      );
      let pair = UniswapPairFactory.connect(pairAddress, user);

      let bal = await pair.balanceOf(user.address);

      // make a trade to get init values in uniswap
      await uniswapRouter.swapExactTokensForTokens(
        BigNumber.from("100000000000"),
        BigNumber.from("100000"),
        [
          ycrv.address,
          ham.address
        ],
        user.address,
        uniswapDeadline, { gasLimit: 1000000 });

      // trade back for easier calcs later
      await uniswapRouter.swapExactTokensForTokens(
        BigNumber.from("100000000000"),
        BigNumber.from("100000"),
        [
          ham.address,
          ycrv.address
        ],
        user.address,
        uniswapDeadline, { gasLimit: 1000000 });

      await increaseTime(provider, 43200);

      await rebaser.init_twap({
        gasLimit: 500000
      });


      await uniswapRouter.swapExactTokensForTokens(
        BigNumber.from("500000000000000000000000"),
        BigNumber.from("100000"),
        [
          ycrv.address,
          ham.address
        ],
        user.address,
        uniswapDeadline, { gasLimit: 1000000 });

      // init twap
      let init_twap = await rebaser.timeOfTWAPInit();

      // wait 12 hours
      await increaseTime(provider, 12 * 60 * 60);

      // perform trade to change price
      await uniswapRouter.swapExactTokensForTokens(
        BigNumber.from("10000000000000000000"),
        BigNumber.from("100000"),
        [
          ycrv.address,
          ham.address
        ],
        user.address,
        uniswapDeadline,
        {
          gasLimit: 1000000
        }
      );

      // activate rebasing
      await rebaser.activate_rebasing({
        gasLimit: 500000
      });

      bal = await ham.balanceOf(user.address);

      let a = await provider.getBlock('latest');

      let offset = (await rebaser.rebaseWindowOffsetSec()).toNumber();
      let interval = (await rebaser.minRebaseTimeIntervalSec()).toNumber();

      let i;
      if (a["timestamp"] % interval > offset) {
        i = (interval - (a["timestamp"] % interval)) + offset;
      } else {
        i = offset - (a["timestamp"] % interval);
      }

      await increaseTime(provider, i - 1);

      await expect(rebaser.rebase({ gasLimit: 2500000 })).to.be.reverted;//"too early");
    });
  });
});
