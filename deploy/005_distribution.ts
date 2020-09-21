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
  const twoFifty = BigNumber.from(10).pow(3).mul(BigNumber.from(10).pow(18)).mul(250);
  const oneFive = twoFifty.mul(6);

  const transferOwnership = (contract : string, newAddress : string) => {
    return execute(contract,
      { from: deployer, gasLimit: 100000},
      "transferOwnership",
      newAddress
    )
  };

  console.log(bre.network.name);

  const farmRegistry = await deploy("FarmRegistry", {
    from: deployer,
    args:[
      ham.address,
      distributor
    ],
    log: true,
  });

  await execute("HAM", { from: deployer }, "transfer", farmRegistry.address, BigNumber.from("2000000000000000000000000"));
  await execute("HAM", { from: deployer }, "setFarmRegistry", farmRegistry.address);

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

    const wethFarm = await deploy("WethFarm", {
      from: deployer,
      contract: "Farm",
      args: [ham.address, weth.address],
      log: true
    });

    await execute("WethFarm",
      { from: deployer },
      "transferOwnership",
      farmRegistry.address
    );
    await execute("FarmRegistry",
      { from: deployer },
      "addNewFarm",
      wethFarm.address,
      twoFifty,
      1601510400, // 2020-10-01 00:00:00 (UTC +00:00)
      625000, // ~7 1/4 days
    );

    const wethAmplPair = await read("UniswapV2Factory",
      { from: deployer }, "getPair", weth.address, ampl.address);

    const wethAmplFarm = await deploy("WethAmplFarm", {
      from: deployer,
      contract: "Farm",
      args: [ham.address, wethAmplPair as string],
      log: true
    });

    await execute("WethAmplFarm",
      { from: deployer },
      "transferOwnership",
      farmRegistry.address
    );
    await execute("FarmRegistry",
      { from: deployer },
      "addNewFarm",
      wethAmplFarm.address,
      twoFifty,
      1601510400, // 2020-10-01 00:00:00 (UTC +00:00)
      625000, // ~7 1/4 days
    );

    const incentivizer = await deploy("HAMIncentivizer", {
      from: deployer,
      args:[ ham.address ],
      log:true
    });
    await execute("HAMIncentivizer",
      { from: deployer },
      "initialize",
      1601510400, // 2020-10-01 00:00:00 (UTC +00:00)
      625000, // ~7 1/4 days
    );

    console.log("setting distributor");

    await execute("HAMIncentivizer", { from: deployer }, "setRewardDistribution", distributor);

    console.log("transfering and notifying");
    console.log("eth");

    await execute('HAM',
        { from: deployer }, "_setIncentivizer", incentivizer.address);

    await execute('HAMIncentivizer',
        { from: distributor, gasLimit: 500000}, "notifyRewardAmount", "0");

    await execute('HAMIncentivizer',
      { from: deployer, gasLimit: 100000},
      "setRewardDistribution",
      timelock.address
    );

    await Promise.all([
      transferOwnership('FarmRegistry', timelock.address),
      transferOwnership('HAMIncentivizer', timelock.address),
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
