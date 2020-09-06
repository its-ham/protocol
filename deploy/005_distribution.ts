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
    const ethPool = await deploy("HAMETHPool", {
      from: deployer,
      contract: "Farm",
      args:[
        ham.address,
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
        1597172400, // 2020-08-11 19:00:00 (UTC UTC +00:00)
        625000, // ~7 1/4 days
      ],
      log:true
    });
    const amplPool = await deploy("HAMAMPLPool", {
      from: deployer,
      contract: "Farm",
      args:[
        ham.address,
        "0xc5be99A02C6857f9Eac67BbCE58DF5572498F40c", // AMP-ETH-UNI-LP
        1597172400, // 2020-08-11 19:00:00 (UTC UTC +00:00)
        625000, // ~7 1/4 days
      ],
      log:true
    });
    const yfiPool = await deploy("HAMYFIPool", {
      from: deployer,
      contract: "Farm",
      args:[
        ham.address,
        "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e", // YFI
        1597172400, // 2020-08-11 19:00:00 (UTC UTC +00:00)
        625000, // ~7 1/4 days
      ],
      log:true
    });
    const linkPool = await deploy("HAMLINKPool", {
      from: deployer,
      contract: "Farm",
      args:[
        ham.address,
        "0x514910771AF9Ca656af840dff83E8264EcF986CA", // LINK
        1597172400, // 2020-08-11 19:00:00 (UTC UTC +00:00)
        625000, // ~7 1/4 days
      ],
      log:true
    });
    const mkrPool = await deploy("HAMMKRPool", {
      from: deployer,
      contract: "Farm",
      args:[
        ham.address,
        "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2", // MKR
        1597172400, // 2020-08-11 19:00:00 (UTC UTC +00:00)
        625000, // ~7 1/4 days
      ],
      log:true
    });
    const lendPool = await deploy("HAMLENDPool", {
      from: deployer,
      contract: "Farm",
      args:[
        ham.address,
        "0x80fB784B7eD66730e8b1DBd9820aFD29931aab03", // LEND
        1597172400, // 2020-08-11 19:00:00 (UTC UTC +00:00)
        625000, // ~7 1/4 days
      ],
      log:true
    });
    const compPool = await deploy("HAMCOMPPool", {
      from: deployer,
      contract: "Farm",
      args:[
        ham.address,
        "0xc00e94Cb662C3520282E6f5717214004A7f26888", // COMP
        1597172400, // 2020-08-11 19:00:00 (UTC UTC +00:00)
        625000, // ~7 1/4 days
      ],
      log:true
    });
    const snxPool = await deploy("HAMSNXPool", {
      from: deployer,
      contract: "Farm",
      args:[
        ham.address,
        "0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F", // SNX
        1597172400, // 2020-08-11 19:00:00 (UTC UTC +00:00)
        625000, // ~7 1/4 days
      ],
      log:true
    });
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
