import {
  BuidlerRuntimeEnvironment,
  DeployFunction,
} from "@nomiclabs/buidler/types";

import { BigNumber, ethers, utils } from "ethers";

const func: DeployFunction = async function (bre: BuidlerRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = bre;
  const { deploy, execute, read} = deployments;

  const { deployer, distributor } = await getNamedAccounts();

  const ham = await deployments.get("HAM");
  const reserves = await deployments.get("HAMReserves");
  const rebaser = await deployments.get("HAMRebaser");
  const gov = await deployments.get("GovernorAlpha");
  const timelock = await deployments.get("Timelock");
  const uniswapRouter = await deployments.get("UniswapV2Router");

  const oneEth = BigNumber.from(10).pow(18);

  console.log(bre.network.name);

  if (bre.network.name == "buidlerevm") {

    const ampl = await deploy("AMPL", {
      contract: "StubToken",
      from: deployer,
      args: [
        "Ampleforth",
        "AMPL",
        oneEth.mul(1000)
      ],
      log:true
    });

    const weth = await deployments.get("WETH");

    const wethAmplPair = await read("UniswapV2Factory",
      { from: deployer }, "getPair", weth.address, ampl.address);

    const ethPool = await deploy("HAMETHPool", {
      from: deployer,
      contract: "Farm",
      args:[
        ham.address,
        weth.address,
        1601510400, // 2020-10-01 00:00:00 (UTC +00:00)
        625000, // ~7 1/4 days
      ],
      log:true
    });

    const amplPool = await deploy("HAMAMPLPool", {
      from: deployer,
      contract: "Farm",
      args:[
        ham.address,
        wethAmplPair as string,
        1601510400, // 2020-10-01 00:00:00 (UTC +00:00)
        625000, // ~7 1/4 days
      ],
      log:true
      });

    const incentivizer = await deploy("HAMIncentivizer", {
      from: deployer,
      args:[
        ham.address,
        1601510400, // 2020-10-01 00:00:00 (UTC +00:00)
        625000, // ~7 1/4 days
      ],
      log:true
    });

    console.log("setting distributor");

    await Promise.all([
      execute("HAMETHPool",
        { from: deployer }, "setRewardDistribution", distributor),
      execute("HAMAMPLPool",
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
        { from: deployer }, "_setIncentivizer", incentivizer.address),
    ]);

    await Promise.all([
      execute('HAMETHPool',
        { from: distributor }, "notifyRewardAmount", twoFifty),
      execute('HAMAMPLPool',
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
      execute('HAMIncentivizer',
        { from: deployer, gasLimit: 100000},
        "setRewardDistribution",
        timelock.address
      ),
    ]);

    const transferOwnership = (contract : string) => {
      return execute(contract,
        { from: deployer, gasLimit: 100000},
        "transferOwnership",
        timelock.address
      )
    };

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
