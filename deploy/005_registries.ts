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
  const gov = await deployments.get("GovernorAlpha");
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

  console.log("deploying farm registry");

  const farmRegistry = await deploy("FarmRegistry", {
    from: deployer,
    args:[
      ham.address,
      deployer
    ],
    log: true,
  });

  await execute("HAM", { from: deployer }, "transfer", farmRegistry.address, oneEth.mul(2000000));
  await execute("HAM", { from: deployer }, "setFarmRegistry", farmRegistry.address);

  console.log("deploying incentivizer registry");

  const incentivizerRegistry = await deploy("IncentivizerRegistry", {
    from: deployer,
    args:[ ham.address ],
    log:true
  });

  await execute('HAM', { from: deployer }, "_setIncentivizer", incentivizerRegistry.address);

  if (bre.network.name !== "mainnet") {
    console.log("deploying test farms");

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

    await transferOwnership("WethFarm", farmRegistry.address);

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

    await transferOwnership("WethAmplFarm", farmRegistry.address);

    await execute("FarmRegistry",
      { from: deployer },
      "addNewFarm",
      wethAmplFarm.address,
      twoFifty,
      1601510400, // 2020-10-01 00:00:00 (UTC +00:00)
      625000, // ~7 1/4 days
    );
  }
};

export default func;
