import {
  BuidlerRuntimeEnvironment,
  DeployFunction,
} from "@nomiclabs/buidler/types";

import { BigNumber, ethers, utils } from "ethers";

const func: DeployFunction = async function (bre: BuidlerRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = bre;
  const { deploy, execute, read} = deployments;

  const { deployer } = await getNamedAccounts();

  const ham = await deployments.get("HAM");
  const reserves = await deployments.get("HAMReserves");
  const rebaser = await deployments.get("HAMRebaser");
  const timelock = await deployments.get("Timelock");

  const transferOwnership = (contract : string, newAddress : string) => {
    return execute(contract,
      { from: deployer, gasLimit: 100000},
      "transferOwnership",
      newAddress
    )
  };

  console.log(bre.network.name);

  console.log("timelocking the hamburglar deploy key for farms");

  await transferOwnership("FarmRegistry", timelock.address);
  await transferOwnership("IncentivizerRegistry", timelock.address);

  console.log("timelocking the hamburglar deploy key for governance");

  await Promise.all([
    execute('HAM',
      { from: deployer, gasLimit: 100000},
      "_setPendingGov",
      timelock.address
    ),
    execute('HAMReserves',
      { from: deployer, gasLimit: 100000},
      "_setPendingGov",
      timelock.address
    ),
    execute('HAMRebaser',
      { from: deployer, gasLimit: 100000},
      "_setPendingGov",
      timelock.address
    ),
  ]);

  await Promise.all([
    execute('Timelock',
      { from: deployer },
      "executeTransaction",
      ham.address, 0, "_acceptGov()", "0x", 0
    ),
    execute('Timelock',
      { from: deployer },
      "executeTransaction",
      reserves.address, 0, "_acceptGov()", "0x", 0
    ),
    execute('Timelock',
      { from: deployer },
      "executeTransaction",
      rebaser.address, 0, "_acceptGov()", "0x", 0
    ),
  ]);
};

export default func;
