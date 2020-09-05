import {
  BuidlerRuntimeEnvironment,
  DeployFunction,
} from "@nomiclabs/buidler/types";

import { BigNumber, ethers, utils } from "ethers";

const func: DeployFunction = async function (bre: BuidlerRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = bre;
  const { deploy, execute } = deployments;

  const { deployer, distributor } = await getNamedAccounts();

  const ham = await deployments.get("HAM");
  const reserves = await deployments.get("HAMReserves");
  const rebaser = await deployments.get("HAMRebaser");
  const gov = await deployments.get("GovernorAlpha");
  const timelock = await deployments.get("Timelock");

  console.log(bre.network.name);

  if (bre.network.name != "test") {
    const ethPool = await deploy("HAMETHPool", {from: deployer, args:[], log:true});
    const amplPool = await deploy("HAMAMPLPool", {from: deployer, args:[], log:true});
    const yfiPool = await deploy("HAMYFIPool", {from: deployer, args:[], log:true});
    const linkPool = await deploy("HAMLINKPool", {from: deployer, args:[], log:true});
    const mkrPool = await deploy("HAMMKRPool", {from: deployer, args:[], log:true});
    const lendPool = await deploy("HAMLENDPool", {from: deployer, args:[], log:true});
    const compPool = await deploy("HAMCOMPPool", {from: deployer, args:[], log:true});
    const snxPool = await deploy("HAMSNXPool", {from: deployer, args:[], log:true});
    const incentivizer = await deploy("HAMIncentivizer", {from: deployer, args:[], log:true});

    console.log("setting distributor");

    await Promise.all([
      execute("HAMETHPool",
        { from: deployer }, "setRewardDistribution", distributor),
      execute("HAMAMPLPool",
        { from: deployer }, "setRewardDistribution", distributor),
      execute("HAMYFIPool",
        { from: deployer }, "setRewardDistribution", distributor),
      execute("HAMLINKPool",
        { from: deployer }, "setRewardDistribution", distributor),
      execute("HAMLENDPool",
        { from: deployer }, "setRewardDistribution", distributor),
      execute("HAMMKRPool",
        { from: deployer }, "setRewardDistribution", distributor),
      execute("HAMCOMPPool",
        { from: deployer }, "setRewardDistribution", distributor),
      execute("HAMSNXPool",
        { from: deployer }, "setRewardDistribution", distributor),
      execute("HAMIncentivizer",
        { from: deployer }, "setRewardDistribution", distributor),
    ]);

    const twoFifty = BigNumber.from(10).pow(3).mul(BigNumber.from(10).pow(18)).mul(250);
    const oneFive = twoFifty.mul(6);

    console.log("transfering and notifying");
    console.log("eth");

    await Promise.all([
      execute('HAM',
        { from: deployer }, "transfer", ethPool.address, twoFifty),
      execute('HAM',
        { from: deployer }, "transfer", amplPool.address, twoFifty),
      execute('HAM',
        { from: deployer }, "transfer", yfiPool.address, twoFifty),
      execute('HAM',
        { from: deployer }, "transfer", lendPool.address, twoFifty),
      execute('HAM',
        { from: deployer }, "transfer", mkrPool.address, twoFifty),
      execute('HAM',
        { from: deployer }, "transfer", snxPool.address, twoFifty),
      execute('HAM',
        { from: deployer }, "transfer", compPool.address, twoFifty),
      execute('HAM',
        { from: deployer }, "transfer", linkPool.address, twoFifty),
      execute('HAM',
        { from: deployer }, "_setIncentivizer", incentivizer.address),
    ]);

    await Promise.all([
      execute('HAMETHPool',
        { from: distributor }, "notifyRewardAmount", twoFifty),
      execute('HAMAMPLPool',
        { from: distributor }, "notifyRewardAmount", twoFifty),
      execute('HAMYFIPool',
        { from: distributor }, "notifyRewardAmount", twoFifty),
      execute('HAMLENDPool',
        { from: distributor }, "notifyRewardAmount", twoFifty),
      execute('HAMMKRPool',
        { from: distributor }, "notifyRewardAmount", twoFifty),
      execute('HAMSNXPool',
        { from: distributor }, "notifyRewardAmount", twoFifty),
      execute('HAMCOMPPool',
        { from: distributor }, "notifyRewardAmount", twoFifty),
      execute('HAMLINKPool',
        { from: distributor }, "notifyRewardAmount", twoFifty),
      execute('HAMIncentivizer',
        { from: distributor, gasLimit: 500000}, "notifyRewardAmount", "0"),
    ]);

    await Promise.all([
      execute('HAMETHPool',
        { from: deployer, gasLimit: 100000},
        "setRewardDistribution",
        timelock.address
      ),
      execute('HAMAMPLPool',
        { from: deployer, gasLimit: 100000},
        "setRewardDistribution",
        timelock.address
      ),
      execute('HAMYFIPool',
        { from: deployer, gasLimit: 100000},
        "setRewardDistribution",
        timelock.address
      ),
      execute('HAMLENDPool',
        { from: deployer, gasLimit: 100000},
        "setRewardDistribution",
        timelock.address
      ),
      execute('HAMMKRPool',
        { from: deployer, gasLimit: 100000},
        "setRewardDistribution",
        timelock.address
      ),
      execute('HAMSNXPool',
        { from: deployer, gasLimit: 100000},
        "setRewardDistribution",
        timelock.address
      ),
      execute('HAMCOMPPool',
        { from: deployer, gasLimit: 100000},
        "setRewardDistribution",
        timelock.address
      ),
      execute('HAMLINKPool',
        { from: deployer, gasLimit: 100000},
        "setRewardDistribution",
        timelock.address
      ),
      execute('HAMIncentivizer',
        { from: deployer, gasLimit: 100000},
        "setRewardDistribution",
        timelock.address
      ),
    ]);

    await Promise.all([
      execute('HAMETHPool',
        { from: deployer, gasLimit: 100000},
        "transferOwnership",
        timelock.address
      ),
      execute('HAMAMPLPool',
        { from: deployer, gasLimit: 100000},
        "transferOwnership",
        timelock.address
      ),
      execute('HAMYFIPool',
        { from: deployer, gasLimit: 100000},
        "transferOwnership",
        timelock.address
      ),
      execute('HAMLENDPool',
        { from: deployer, gasLimit: 100000},
        "transferOwnership",
        timelock.address
      ),
      execute('HAMMKRPool',
        { from: deployer, gasLimit: 100000},
        "transferOwnership",
        timelock.address
      ),
      execute('HAMSNXPool',
        { from: deployer, gasLimit: 100000},
        "transferOwnership",
        timelock.address
      ),
      execute('HAMCOMPPool',
        { from: deployer, gasLimit: 100000},
        "transferOwnership",
        timelock.address
      ),
      execute('HAMLINKPool',
        { from: deployer, gasLimit: 100000},
        "transferOwnership",
        timelock.address
      ),
      execute('HAMIncentivizer',
        { from: deployer, gasLimit: 100000},
        "transferOwnership",
        timelock.address
      )
    ]);
  }

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

  await execute('Timelock', { from: deployer }, "setPendingAdmin", gov.address);
  await execute('GovernorAlpha', { from: deployer }, "__acceptAdmin");
  await execute('GovernorAlpha', { from: deployer }, "__abdicate");
};

export default func;
