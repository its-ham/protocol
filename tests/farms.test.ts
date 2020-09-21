import { ethers, deployments, waffle } from "@nomiclabs/buidler";
import { Deployment } from "@nomiclabs/buidler/types";
import { solidity } from "ethereum-waffle";
import { BigNumber, constants, utils, Wallet } from "ethers";

import { increaseTime } from "./evm";

import { Ham } from "../build/typechain/Ham";
import { HamFactory } from "../build/typechain/HamFactory";
import { StubToken } from "../build/typechain/StubToken";
import { StubTokenFactory } from "../build/typechain/StubTokenFactory";
import CompostHeapJSON from "../build/contracts/CompostHeap.json";
import { CompostHeap } from "../build/typechain/CompostHeap";
import DamJSON from "../build/contracts/Dam.json";
import { Dam } from "../build/typechain/Dam";
import TroughJSON from "../build/contracts/Trough.json";
import { Trough } from "../build/typechain/Trough";
import FarmJSON from "../build/contracts/Farm.json";
import { Farm } from "../build/typechain/Farm";
import { UniswapV2Factory } from "../build/typechain/UniswapV2Factory";
import { UniswapV2FactoryFactory } from "../build/typechain/UniswapV2FactoryFactory";
import { UniswapV2Pair } from "../build/typechain/UniswapV2Pair";
import { UniswapV2PairFactory } from "../build/typechain/UniswapV2PairFactory";
import { UniswapV2Router02 } from "../build/typechain/UniswapV2Router02";
import { UniswapV2Router02Factory } from "../build/typechain/UniswapV2Router02Factory";
import { Weth9 } from "../build/typechain/Weth9";
import { Weth9Factory } from "../build/typechain/Weth9Factory";

import chai from "chai";

chai.use(solidity);

function nowInSeconds() {
  return Math.round(Date.now() / 1000);
}

describe("farms", () => {
  const { expect } = chai;
  const { deployContract, provider } = waffle;
  const [
    user,
    a1,
    a2,
  ] = provider.getWallets();

  let chainId: number;

  const oneEth = BigNumber.from(10).pow(18);

  let ham: Ham;
  let ampl: StubToken;
  let ycrv: StubToken;
  let uniswapRouter: UniswapV2Router02;
  let uniswapFactory: UniswapV2Factory;
  let weth: Weth9;

  beforeEach(async () => {
    await deployments.fixture();

    ham = HamFactory.connect((await deployments.get("HAM")).address, user);
    ampl = StubTokenFactory.connect((await deployments.get("AMPL")).address, user);
    ycrv = StubTokenFactory.connect((await deployments.get("yCRV")).address, user);
    weth = Weth9Factory.connect((await deployments.get("WETH")).address, user);
    uniswapRouter = UniswapV2Router02Factory.connect((await deployments.get("UniswapV2Router")).address, user);
    uniswapFactory = UniswapV2FactoryFactory.connect((await deployments.get("UniswapV2Factory")).address, user);
  });


  describe("basic farms", () => {
    let farm : Farm;

    beforeEach(async () => {
      farm = (await deployContract(
        user,
        FarmJSON,
        [ham.address, weth.address],
      )) as Farm;
    });

    it("requires initialization to stake", async () => {
      await expect(farm.stake(100)).to.be.revertedWith("not initialized");
    });

    it("can't be initialized twice", async () => {
      await farm.initialize(1, 2);
      await expect(farm.initialize(1, 3)).to.be.revertedWith("already initialized");
    });

    it("can only be initialized by the owener", async () => {
      await expect(farm.connect(a1).initialize(1, 2)).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("compost heaps", () => {
    let heap : CompostHeap;

    beforeEach(async () => {
      heap = (await deployContract(
        user,
        CompostHeapJSON,
        [ham.address, [ycrv.address], weth.address, uniswapRouter.address],
      )) as CompostHeap;
      await heap.initialize(nowInSeconds() + 60 * 10, 625000);
      await ham.transfer(heap.address, oneEth.mul(10000));
    });

    it("shouldnt allow normal staking", async () => {
      await expect(heap.stake(100)).to.be.revertedWith("cant stake without selling");
    });
    it("only takes shit", async () => {
      await increaseTime(provider, 60 * 10);

      await expect(heap.stakeAndSell(constants.AddressZero, 0)).to.be.revertedWith("can't stake 0");
      await expect(heap.stakeAndSell(constants.AddressZero, 1)).to.be.revertedWith("token not accepted");
      await ampl.approve(heap.address, 1);
      await expect(heap.stakeAndSell(ampl.address, 1)).to.be.revertedWith("token not accepted");

      await ycrv.approve(heap.address, 1);
      await expect(heap.stakeAndSell(ycrv.address, 2)).to.be.reverted;

      await ycrv.approve(heap.address, "2000000000000000000000001");
      await expect(heap.stakeAndSell(ycrv.address, "2000000000000000000000001")).to.be.reverted;
    });

    it("shouldnt sell shit before start", async () => {
      await ycrv.approve(heap.address, "2000");
      await expect(heap.stakeAndSell(ycrv.address, "2000", { gasLimit: 30000 })).to.be.revertedWith("not start");
    });
    it("should sell shit after start", async () => {
      await increaseTime(provider, 60 * 10);

      await uniswapFactory.createPair(ycrv.address, weth.address);

      expect(await ycrv.balanceOf(user.address)).to.be.gt(oneEth.mul(1000));

      await ycrv.approve(uniswapRouter.address, oneEth.mul(1000));
      await uniswapRouter.addLiquidityETH(
        ycrv.address,
        oneEth.mul(100),
        oneEth.mul(100),
        oneEth,
        user.address,
        nowInSeconds() + 60 * 11,
        { value: oneEth }
      );

      let pairAddress = await uniswapFactory.getPair(ycrv.address, weth.address);
      let pair = UniswapV2PairFactory.connect(pairAddress, user);
      let reserves0 = await pair.getReserves();

      await ycrv.approve(heap.address, "2000");
      await heap.stakeAndSell(ycrv.address, "2000");

      let reserves1 = await pair.getReserves();
      if (ycrv.address == await pair.token0()) {
        expect(reserves0[0]).to.be.lt(reserves1[0]);
        expect(reserves0[1]).to.be.gt(reserves1[1]);
        expect(await heap.balanceOf(user.address)).to.be.eq(reserves0[1].sub(reserves1[1]));
      } else {
        expect(reserves0[0]).to.be.gt(reserves1[0]);
        expect(reserves0[1]).to.be.lt(reserves1[1]);
        expect(await heap.balanceOf(user.address)).to.be.eq(reserves0[0].sub(reserves1[0]));
      }

      // balances should be in not-shit
      let heapBalance = await heap.balanceOf(user.address);
      expect(heapBalance).to.be.gt(0);
      expect(await weth.balanceOf(heap.address)).to.be.eq(heapBalance);

      let balance1 = await weth.balanceOf(user.address);
      await heap.exit();
      let balance2 = await weth.balanceOf(user.address);
      expect(balance2.sub(balance1)).to.be.eq(heapBalance);
    });
  });

  describe("troughs", () => {
    let trough : Trough;

    beforeEach(async () => {
      trough = (await deployContract(
        user,
        TroughJSON,
        [ham.address, ycrv.address, 2, 1],
      )) as Trough;
      await trough.initialize(nowInSeconds() + 60 * 10, 625000);
      await ham.transfer(trough.address, oneEth.mul(10000));
    });
    it("reverts before start", async () => {
      await ycrv.approve(trough.address, 2000);
      await expect(trough.stake(2000)).to.be.revertedWith("not start");
    });
    it("issue rewards when fed", async () => {
      await increaseTime(provider, 60 * 10);
      await ycrv.approve(trough.address, 2000);
      await trough.stake(2000);
      expect(await trough.earned(user.address)).to.be.eq(4000);
    });
    it("dont allow normal staking", async () => {
      await increaseTime(provider, 60 * 10);
      await ycrv.approve(trough.address, 2000);
      await trough.stake(2000);
      expect(await trough.balanceOf(user.address)).to.be.eq(0);
    });
    it("reward on exit", async () => {
      let balance0 = await ham.balanceOf(user.address);
      await increaseTime(provider, 60 * 10);
      await ycrv.approve(trough.address, 2000);
      await trough.stake(2000);
      await trough.exit({ gasLimit: 300000 });
      let balance1 = await ham.balanceOf(user.address);
      expect(balance1.sub(balance0)).to.be.eq(4000);
    });
  });

  describe("dams", () => {
    let dam : Dam;
    let pair : UniswapV2Pair;

    beforeEach(async () => {
      await ycrv.approve(uniswapRouter.address, oneEth.mul(1000));
      await uniswapRouter.addLiquidityETH(
        ycrv.address,
        oneEth.mul(100),
        oneEth.mul(100),
        oneEth,
        user.address,
        nowInSeconds() + 60,
        { value: oneEth }
      );

      let pairAddress = await uniswapFactory.getPair(ycrv.address, weth.address);
      pair = UniswapV2PairFactory.connect(pairAddress, user);

      dam = (await deployContract(
        user,
        DamJSON,
        [ham.address, [pairAddress], uniswapRouter.address],
      )) as Dam;
      await dam.initialize(nowInSeconds() + 60 * 10, 625000);
      await ham.transfer(dam.address, oneEth.mul(10000));
    });

    it("dont allow staking or withdrawing", async () => {
      await expect(dam.stake(2000)).to.be.revertedWith("cant stake without unwrapping");
      await expect(dam.withdraw(2000)).to.be.revertedWith("cant withdraw, use exit");
    });
    it("dont lower liquidity before start", async () => {
      await pair.approve(dam.address, 100);
      await expect(dam.stakeAndUnwrap(pair.address, 100)).to.be.revertedWith("not start");
    });
    it("lower liquidity", async () => {
      await increaseTime(provider, 60 * 10);
      let reserves0 = await pair.getReserves();
      await pair.approve(dam.address, 100);
      await dam.stakeAndUnwrap(pair.address, 100);
      let reserves1 = await pair.getReserves();
      expect(reserves1[0]).to.be.lt(reserves0[0]);
      expect(reserves1[1]).to.be.lt(reserves0[1]);
    });
    it("return all tokens at exit", async () => {
      await increaseTime(provider, 60 * 10);
      let reserves0 = await pair.getReserves();
      let yBalance0 = await ycrv.balanceOf(user.address)
      let lpBalance = await pair.balanceOf(user.address);
      await pair.approve(dam.address, lpBalance);
      await dam.stakeAndUnwrap(pair.address, lpBalance);
      await dam.exit();
      let yBalance1 = await ycrv.balanceOf(user.address);
      expect(yBalance1).to.be.gt(yBalance0);
    });
  });
});
