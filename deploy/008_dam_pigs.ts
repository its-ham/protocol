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
  const farmRegistry = await deployments.get("FarmRegistry");

  const oneEth = BigNumber.from(10).pow(18);

  const transferOwnership = (contract : string, newAddress : string) => {
    return execute(contract,
      { from: deployer, gasLimit: 100000},
      "transferOwnership",
      newAddress
    )
  };

  // uniswapv2router02 on mainnet
  let uniswapV2Router = (await deployments.get("UniswapV2Router")).address;

  const dam = await deploy("DamPigs", {
    contract: "Dam",
    from: deployer,
    args:[
      ham.address,
      bre.network.name === "mainnet" ? [
        "0x3da1313ae46132a397d90d95b1424a9a7e3e0fce", // ETH/CRV
        "0x8bd1661da98ebdd3bd080f0be4e6d9be8ce9858c", // ETH/REN
        "0xb9b752f7f4a4680eeb327ffe728f46666763a796", // ETH/BZXR
        "0xe6f19dab7d43317344282f803f8e8d240708174a", // ETH/KEEP
      ] : [],
      uniswapV2Router
    ],
    log: true,
  });

  await transferOwnership('DamPigs', farmRegistry.address);

  await execute("FarmRegistry",
    { from: deployer },
    "addNewFarm",
    dam.address,
    oneEth.mul(200000),
    1604188799, // 2020-10-31 23:59:59 GMT+00:00
    1250000 // ~14.5 days
  );
};

export default func;
