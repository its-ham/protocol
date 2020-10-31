import {
  BuidlerRuntimeEnvironment,
  DeployFunction,
} from "@nomiclabs/buidler/types";

import UniswapV2FactoryArtifact from "@uniswap/v2-core/build/UniswapV2Factory.json";
import UniswapV2RouterArtifact from "@uniswap/v2-periphery/build/UniswapV2Router02.json";
import WETHArtifact from "@uniswap/v2-periphery/build/WETH9.json";

import { BigNumber, constants, ethers, utils } from "ethers";

const func: DeployFunction = async function (bre: BuidlerRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = bre;
  const { deploy, execute } = deployments;

  const { deployer } = await getNamedAccounts();

  const ham = await deployments.get("HAM");

  if (bre.network.name !== "mainnet") {
    console.log("Deploying Uniswap v2 factory, router, WETH, and stub tokens");

    const weth = await deploy(
      "WETH",
      { contract:WETHArtifact, from: deployer, args: [], log: true}
    );

    const uniswapV2Factory = await deploy(
      "UniswapV2Factory",
      { contract:UniswapV2FactoryArtifact, from: deployer, args: [constants.AddressZero], log: true}
    );

    await deploy(
      "UniswapV2Router",
      {
        contract: UniswapV2RouterArtifact,
        from: deployer,
        args:[uniswapV2Factory.address, weth.address],
        log: true
      }
    );

    await deploy(
      "DAI",
      {
        contract: "StubToken",
        from: deployer,
        args:["DAI", "DAI", BigNumber.from("2000000000000000000000000")],
        log: true
      }
    );
  }
};

export default func;
