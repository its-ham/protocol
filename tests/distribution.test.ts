import { ethers, deployments, waffle } from "@nomiclabs/buidler";
import { Deployment } from "@nomiclabs/buidler/types";
import { MockProvider, solidity } from "ethereum-waffle";
import { BigNumber, constants, Signer } from "ethers";

import { UniswapPair } from "../build/typechain/UniswapPair";
import { UniswapPairFactory } from "../build/typechain/UniswapPairFactory";
import { UniswapV2Factory } from "../build/typechain/UniswapV2Factory";
import { UniswapV2FactoryFactory } from "../build/typechain/UniswapV2FactoryFactory";
import { UniswapV2Router02 } from "../build/typechain/UniswapV2Router02";
import { UniswapV2Router02Factory } from "../build/typechain/UniswapV2Router02Factory";
import { Weth9 } from "../build/typechain/Weth9";
import { Weth9Factory } from "../build/typechain/Weth9Factory";

import { FarmFactory } from "../build/typechain/FarmFactory";
import { Farm } from "../build/typechain/Farm";
import { Ham } from "../build/typechain/Ham";
import { HamFactory } from "../build/typechain/HamFactory";
import { HamIncentivizer } from "../build/typechain/HamIncentivizer";
import { HamIncentivizerFactory } from "../build/typechain/HamIncentivizerFactory";
import { HamRebaser } from "../build/typechain/HamRebaser";
import { HamRebaserFactory } from "../build/typechain/HamRebaserFactory";
import { HamReserves } from "../build/typechain/HamReserves";
import { HamReservesFactory } from "../build/typechain/HamReservesFactory";
import { StubToken } from "../build/typechain/StubToken";
import { StubTokenFactory } from "../build/typechain/StubTokenFactory";

import { increaseTime, mineBlock } from "./evm";

import chai from "chai";

chai.use(solidity);

const oneEth = BigNumber.from(10).pow(18);
const twoFifty = BigNumber.from(10).pow(3).mul(oneEth).mul(250);
const uniswapDeadline = BigNumber.from(1596740361).add(10000000);

describe("Distribution", () => {
  const { expect } = chai;
  const { deployContract, loadFixture, provider } = waffle;
  const [
    user,
    user2,
  ] = provider.getWallets();

  let ham : Ham;
  let rebaser : HamRebaser;
  let reserves : HamReserves;
  let incentivizer : HamIncentivizer;
  let ycrv : StubToken;
  let uniswapFactory : UniswapV2Factory;
  let uniswapRouter : UniswapV2Router02;
  let weth : Weth9;
  let ampl : StubToken;
  let ethPool : Farm;
  let amplPool : Farm;
  let wethAmplPair : UniswapPair;

  async function deploymentFixture(wallets : Signer[], provider : MockProvider) {
    await deployments.fixture();

    let hamDeployment = await deployments.get("HAM");
    let rebaserDeployment = await deployments.get("HAMRebaser");
    let reservesDeployment = await deployments.get("HAMReserves");
    let uniFactDeployment = await deployments.get("UniswapV2Factory");
    let uniRouterDeployment = await deployments.get("UniswapV2Router");
    let ycrvDeployment = await deployments.get("yCRV");
    let amplDeployment = await deployments.get("AMPL");
    let amplPoolDeployment = await deployments.get("HAMAMPLPool");
    let ethPoolDeployment = await deployments.get("HAMETHPool");
    let wethDeployment = await deployments.get("WETH");
    let incentivizerDeployment = await deployments.get("HAMIncentivizer");

    let uniswapFactory = UniswapV2FactoryFactory.connect(uniFactDeployment.address, user);

    let wethAmplPairAddress = await uniswapFactory.getPair(
      wethDeployment.address,
      amplDeployment.address
    );

    let weth = Weth9Factory.connect(wethDeployment.address, user);

    await weth.deposit({ value: oneEth.mul(2000) });

    return {
      ampl: StubTokenFactory.connect(amplDeployment.address, user),
      amplPool: FarmFactory.connect(amplPoolDeployment.address, user),
      ethPool: FarmFactory.connect(ethPoolDeployment.address, user),
      ham: HamFactory.connect(hamDeployment.address, user),
      incentivizer: HamIncentivizerFactory.connect(incentivizerDeployment.address, user),
      rebaser: HamRebaserFactory.connect(rebaserDeployment.address, user),
      reserves: HamReservesFactory.connect(reservesDeployment.address, user),
      ycrv: StubTokenFactory.connect(ycrvDeployment.address, user),
      uniswapFactory: UniswapV2FactoryFactory.connect(uniFactDeployment.address, user),
      uniswapRouter: UniswapV2Router02Factory.connect(uniRouterDeployment.address, user),
      weth,
      wethAmplPair: UniswapPairFactory.connect(wethAmplPairAddress, user),
    };
  }

  beforeEach(async () => {
    ({ ampl,
       amplPool,
       ethPool,
       ham,
       incentivizer,
       rebaser,
       reserves,
       ycrv,
       uniswapFactory,
       uniswapRouter,
       weth,
       wethAmplPair } = await loadFixture(deploymentFixture));

    console.log("HERE!");
  });

  describe("pool failures", () => {
    it("cant join pool 1s early", async () => {
      let a = await provider.getBlock('latest');

      let startTime = await ethPool.startTime();

      expect(BigNumber.from(a.timestamp)).to.be.lte(startTime);

      await weth.approve(ethPool.address, constants.MaxUint256.sub(1));

      await expect(
        ethPool.stake(
          oneEth.mul(200), {
          gasLimit: 300000
        })
      ).to.be.reverted;

      a = await provider.getBlock('latest');

      startTime = await amplPool.startTime();

      expect(a.timestamp).to.be.lte(startTime);

      await wethAmplPair.approve(amplPool.address, constants.MaxUint256.sub(1));

      await expect(amplPool.stake(
        BigNumber.from("5016536322915819"),
        { gasLimit: 300000 }
      ));
    });

    it("cant join pool 2 early", async () => {

    });

    it("cant withdraw more than deposited", async () => {
      let a = await provider.getBlock('latest');

      await uniswapRouter.addLiquidityETH(
        ampl.address,
        BigNumber.from("5000000000000000"),
        oneEth.mul(1000),
        oneEth.mul(1000),
        user.address,
        uniswapDeadline,
        { value: oneEth.mul(1000) }
      );

      let startTime = (await ethPool.startTime()).toNumber();

      let waitTime = startTime - a["timestamp"];
      if (waitTime > 0) {
        await increaseTime(provider, waitTime);
      }

      await weth.approve(ethPool.address, constants.MaxUint256.sub(1));

      await ethPool.stake(
        oneEth.mul(200),
        { gasLimit: 300000 }
      );

      await wethAmplPair.approve(amplPool.address, constants.MaxUint256.sub(1));

      await amplPool.stake(
        "5000000000000000",
        { gasLimit: 300000 }
      );

      await expect(amplPool.withdraw(
        "5016536322915820",
        { gasLimit: 300000 }
      )).to.be.reverted;

      await expect(ethPool.withdraw(
        oneEth.mul(201), { gasLimit: 300000 }
      )).to.be.reverted;
    });
  });

  describe("incentivizer pool", () => {
    it("joining and exiting", async() => {
      let a = await provider.getBlock('latest');

      let startTime = (await ethPool.startTime()).toNumber();

      let waitTime = startTime - a.timestamp;
      if (waitTime > 0) {
        await increaseTime(provider, waitTime);
      } else {
        console.log("late entry", waitTime)
      }

      await weth.approve(ethPool.address, constants.MaxUint256.sub(1));

      await ethPool.stake(
        "2000000000000000000000",
        { gasLimit: 300000 }
      );

      let earned = await ethPool.earned(user.address);

      let rr = await ethPool.rewardRate();

      let rpt = await ethPool.rewardPerToken();
      //console.log(earned, rr, rpt);
      await increaseTime(provider, 86400);
      // await ham.testing.mineBlock();

      earned = await ethPool.earned(user.address);

      rpt = await ethPool.rewardPerToken();

      let ysf = await ham.hamsScalingFactor();

      console.log(earned, ysf, rpt);

      let j = await ethPool.getReward({
        gasLimit: 300000
      });

      let ham_bal = await ham.balanceOf(user.address)

      console.log("ham bal", ham_bal)
      // start rebasing
        //console.log("approve ham")
        await ham.approve(
          uniswapRouter.address,
          constants.MaxUint256.sub(1),
          { gasLimit: 80000 }
        );
        //console.log("approve ycrv")
        await ycrv.approve(
          uniswapRouter.address,
          constants.MaxUint256.sub(1),
          { gasLimit: 80000 }
        );

        let ycrv_bal = await ycrv.balanceOf(user.address)

        console.log("ycrv_bal bal", ycrv_bal)

        console.log("add liq/ create pool")
        await uniswapRouter.addLiquidity(
          ham.address,
          ycrv.address,
          ham_bal,
          ham_bal,
          ham_bal,
          ham_bal,
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

        await pair.approve(
          incentivizer.address,
          constants.MaxUint256.sub(1),
          { gasLimit: 300000 }
        );

        startTime = (await incentivizer.startTime()).toNumber();

        a = await provider.getBlock('latest');

        waitTime = startTime - a["timestamp"];
        if (waitTime > 0) {
          await increaseTime(provider, waitTime);
        } else {
          console.log("late entry, pool 2", waitTime)
        }

        await incentivizer.stake(bal, {gasLimit: 400000});

        earned = await amplPool.earned(user.address);

        rr = await amplPool.rewardRate();

        rpt = await amplPool.rewardPerToken();

        console.log(earned, rr, rpt);

        await increaseTime(provider, 625000 + 1000);

        earned = await amplPool.earned(user.address);

        rr = await amplPool.rewardRate();

        rpt = await amplPool.rewardPerToken();

        console.log(earned, rr, rpt);

        await incentivizer.exit({gasLimit: 400000});

        ham_bal = await ham.balanceOf(user.address);


        expect(BigNumber.from(ham_bal).toNumber()).to.be.gte(0)
        console.log("ham bal after staking in pool 2", ham_bal);
    });
  });


  describe("eth", () => {
    it("rewards from pool 1s eth", async () => {
      let a = await provider.getBlock('latest');

      let startTime = (await ethPool.startTime()).toNumber();

      let waitTime = startTime - a["timestamp"];
      if (waitTime > 0) {
        await increaseTime(provider, waitTime);
      } else {
        console.log("late entry", waitTime)
      }

      await weth.approve(ethPool.address, constants.MaxUint256.sub(1));

      await ethPool.stake(
        "2000000000000000000000",
        { gasLimit: 300000 }
      );

      let earned = await ethPool.earned(user.address);

      let rr = await ethPool.rewardRate();

      let rpt = await ethPool.rewardPerToken();
      //console.log(earned, rr, rpt);
      await increaseTime(provider, 625000 + 100);

      earned = await ethPool.earned(user.address);

      rpt = await ethPool.rewardPerToken();

      let ysf = await ham.hamsScalingFactor();

      let ham_bal = await ham.balanceOf(user.address)

      let j = await ethPool.exit({
        gasLimit: 300000
      });

      //console.log(j.events)

      let weth_bal = await weth.balanceOf(user.address)

      expect(weth_bal).to.be.eq("2000000000000000000000")


      let ham_bal2 = await ham.balanceOf(user.address)

      expect(ham_bal2.sub(ham_bal)).to.be.eq(twoFifty);
    });

    it("rewards from pool 1s eth with rebase", async () => {
        let a = await provider.getBlock('latest');

        let startTime = await ethPool.startTime();

        let waitTime = startTime.toNumber() - a["timestamp"];
        if (waitTime > 0) {
          await increaseTime(provider, waitTime);
        } else {
          console.log("late entry", waitTime)
        }

        await weth.approve(ethPool.address, constants.MaxUint256.sub(1));

        await ethPool.stake(
          "2000000000000000000000",
          { gasLimit: 300000 }
        );

        let earned = await ethPool.earned(user.address);

        let rr = await ethPool.rewardRate();

        let rpt = await ethPool.rewardPerToken();
        //console.log(earned, rr, rpt);
        await increaseTime(provider, 125000 + 100);
        // await ham.testing.mineBlock();

        earned = await ethPool.earned(user.address);

        rpt = await ethPool.rewardPerToken();

        let ysf = await ham.hamsScalingFactor();

        //console.log(earned, ysf, rpt);


        let j = await ethPool.getReward({
          gasLimit: 300000
        });

        let ham_bal = await ham.balanceOf(user.address);

        console.log("ham bal", ham_bal);
        // start rebasing
          //console.log("approve ham")
          await ham.approve(
            uniswapRouter.address,
            constants.MaxUint256.sub(1),
            { gasLimit: 80000 }
          );
          //console.log("approve ycrv")
          await ycrv.approve(
            uniswapRouter.address,
            constants.MaxUint256.sub(1),
            { gasLimit: 80000 }
          );

          let ycrv_bal = await ycrv.balanceOf(user.address)

          console.log("ycrv_bal bal", ycrv_bal)

          console.log("add liq/ create pool")
          await uniswapRouter.addLiquidity(
            ham.address,
            ycrv.address,
            ham_bal,
            ham_bal,
            ham_bal,
            ham_bal,
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
          //console.log("init swap")
          await uniswapRouter.swapExactTokensForTokens(
            "100000000000000000000000",
            100000,
            [
              ycrv.address,
              ham.address
            ],
            user.address,
            uniswapDeadline,
            { gasLimit: 1000000 }
          );

          // trade back for easier calcs later
          //console.log("swap 0")
          await uniswapRouter.swapExactTokensForTokens(
            "10000000000000000",
            100000,
            [
              ycrv.address,
              ham.address
            ],
            user.address,
            uniswapDeadline,
            { gasLimit: 1000000 }
          );

          await increaseTime(provider, 43200);

          //console.log("init twap")
          await rebaser.init_twap({
            gasLimit: 500000
          });

          //console.log("first swap")
          await uniswapRouter.swapExactTokensForTokens(
            "1000000000000000000000",
            100000,
            [
              ycrv.address,
              ham.address
            ],
            user.address,
            uniswapDeadline,
            { gasLimit: 1000000 }
          );

          // init twap
          let init_twap = await rebaser.timeOfTWAPInit();

          // wait 12 hours
          await increaseTime(provider, 12 * 60 * 60);

          // perform trade to change price
          //console.log("second swap")
          await uniswapRouter.swapExactTokensForTokens(
            "10000000000000000000",
            100000,
            [
              ycrv.address,
              ham.address
            ],
            user.address,
            uniswapDeadline,
            { gasLimit: 1000000 }
          );

          // activate rebasing
          await rebaser.activate_rebasing({
            gasLimit: 500000
          });


          bal = await ham.balanceOf(user.address);

          a = await provider.getBlock('latest');

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
          let q = await uniswapRouter.quote(oneEth, r[0], r[1]);
          console.log("quote pre positive rebase", q);

          let b = await rebaser.rebase({
            gasLimit: 2500000
          });

          let bal1 = await ham.balanceOf(user.address);

          let resHAM = await ham.balanceOf(reserves.address);

          let resycrv = await ycrv.balanceOf(reserves.address);

          // new balance > old balance
          expect(bal).to.be.lte(bal1);
          // increases reserves
          expect(resycrv).to.be.gte(0);

          r = await pair.getReserves();
          q = await uniswapRouter.quote(oneEth, r[0], r[1]);
          console.log("quote", q);
          // not below peg
          expect(BigNumber.from(q)).to.be.gte(oneEth);


        await increaseTime(provider, 525000 + 100);


        j = await ethPool.exit({
          gasLimit: 300000
        });
        //console.log(j.events)

        let weth_bal = await weth.balanceOf(user.address)

        expect(weth_bal).to.be.eq("2000000000000000000000")


        let ham_bal2 = await ham.balanceOf(user.address)

        expect(
          ham_bal2.sub(ham_bal)
        ).to.be.gte(twoFifty);
    });

    it("rewards from pool 1s eth with negative rebase", async () => {
        let a = await provider.getBlock('latest');

        let startTime = (await ethPool.startTime()).toNumber();

        let waitTime = startTime - a["timestamp"];
        if (waitTime > 0) {
          await increaseTime(provider, waitTime);
        } else {
          console.log("late entry", waitTime)
        }

        await weth.approve(ethPool.address, constants.MaxUint256.sub(1));

        await ethPool.stake(
          "2000000000000000000000",
          { gasLimit: 300000 }
        );

        let earned = await ethPool.earned(user.address);

        let rr = await ethPool.rewardRate();

        let rpt = await ethPool.rewardPerToken();
        //console.log(earned, rr, rpt);
        await increaseTime(provider, 125000 + 100);
        // await ham.testing.mineBlock();

        earned = await ethPool.earned(user.address);

        rpt = await ethPool.rewardPerToken();

        let ysf = await ham.hamsScalingFactor();

        //console.log(earned, ysf, rpt);


        let j = await ethPool.getReward({
          gasLimit: 300000
        });

        let ham_bal = await ham.balanceOf(user.address)

        console.log("ham bal", ham_bal)
        // start rebasing
          //console.log("approve ham")
          await ham.approve(
            uniswapRouter.address,
            constants.MaxUint256.sub(1),
            { gasLimit: 80000 }
          );
          //console.log("approve ycrv")
          await ycrv.approve(
            uniswapRouter.address,
            constants.MaxUint256.sub(1),
            { gasLimit: 80000 }
          );

          let ycrv_bal = await ycrv.balanceOf(user.address)

          console.log("ycrv_bal bal", ycrv_bal)

          ham_bal = BigNumber.from(ham_bal);
          console.log("add liq/ create pool")
          await uniswapRouter.addLiquidity(
            ham.address,
            ycrv.address,
            ham_bal.div(10),
            ham_bal.div(10),
            ham_bal.div(10),
            ham_bal.div(10),
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
          //console.log("init swap")
          await uniswapRouter.swapExactTokensForTokens(
            "1000000000000000000000",
            100000,
            [
              ham.address,
              ycrv.address
            ],
            user.address,
            uniswapDeadline,
            { gasLimit: 1000000 }
          );

          // trade back for easier calcs later
          //console.log("swap 0")
          await uniswapRouter.swapExactTokensForTokens(
            "100000000000000",
            100000,
            [
              ham.address,
              ycrv.address
            ],
            user.address,
            uniswapDeadline,
            { gasLimit: 1000000 }
          );

          await increaseTime(provider, 43200);

          //console.log("init twap")
          await rebaser.init_twap({
            gasLimit: 500000
          });

          //console.log("first swap")
          await uniswapRouter.swapExactTokensForTokens(
            "100000000000000",
            100000,
            [
              ham.address,
              ycrv.address
            ],
            user.address,
            uniswapDeadline,
            { gasLimit: 1000000 }
          );

          // init twap
          let init_twap = await rebaser.timeOfTWAPInit();

          // wait 12 hours
          await increaseTime(provider, 12 * 60 * 60);

          // perform trade to change price
          //console.log("second swap")
          await uniswapRouter.swapExactTokensForTokens(
            "1000000000000000000",
            100000,
            [
              ham.address,
              ycrv.address
            ],
            user.address,
            uniswapDeadline,
            { gasLimit: 1000000 }
          );

          // activate rebasing
          await rebaser.activate_rebasing({
            gasLimit: 500000
          });


          bal = await ham.balanceOf(user.address);

          a = await provider.getBlock('latest');

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
          let q = await uniswapRouter.quote(oneEth, r[0], r[1]);
          console.log("quote pre positive rebase", q);

          let b = await rebaser.rebase({
            gasLimit: 2500000
          });

          let bal1 = await ham.balanceOf(user.address);

          let resHAM = await ham.balanceOf(reserves.address);

          let resycrv = await ycrv.balanceOf(reserves.address);

          expect(bal1).to.be.lte(bal);
          expect(resycrv).to.be.eq(0);

          r = await pair.getReserves();
          q = await uniswapRouter.quote(oneEth, r[0], r[1]);
          console.log("quote", q);
          // not below peg
          expect(q).to.be.lte(oneEth);


        await increaseTime(provider, 525000 + 100);


        j = await ethPool.exit({
          gasLimit: 300000
        });
        //console.log(j.events)

        let weth_bal = await weth.balanceOf(user.address)

        expect(weth_bal).to.be.eq(BigNumber.from("2000000000000000000000"));

        let ham_bal2 = await ham.balanceOf(user.address);

        expect(
          ham_bal2.sub(ham_bal)
        ).to.be.lte(twoFifty);
    });
  });
});
