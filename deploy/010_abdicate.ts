import {
  BuidlerRuntimeEnvironment,
  DeployFunction,
} from "@nomiclabs/buidler/types";

import { BigNumber, ethers, utils } from "ethers";

const func: DeployFunction = async function (bre: BuidlerRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = bre;
  const { deploy, execute, read} = deployments;

  const { deployer } = await getNamedAccounts();

  const gov = await deployments.get("GovernorAlpha");

  console.log(bre.network.name);

  console.log("community governance");

  await execute('Timelock', { from: deployer }, "setPendingAdmin", gov.address);
  await execute('GovernorAlpha', { from: deployer }, "__acceptAdmin");
  await execute('GovernorAlpha', { from: deployer }, "__abdicate");
};

func.skip = async function (bre: BuidlerRuntimeEnvironment){ return bre.network.name === "mainnet" };

export default func;
