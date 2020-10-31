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

  const sam = await deploy(
    "SAM",
    {
      contract: "StubToken",
      from: deployer,
      args:["SAM", "samczsun the chad", oneEth.mul(1000000)],
      log: true
    }
  );

  // TODO put up SAM on Uniswap

  await execute("SAM", { from: deployer }, "transfer", "0xc95C558dAA63b1A79331B2AB4a2a7af375384d3B", oneEth.mul(400000));

  const transferOwnership = (contract : string, newAddress : string) => {
    return execute(contract,
      { from: deployer, gasLimit: 100000},
      "transferOwnership",
      newAddress
    )
  };

  const samFarm = await deploy("SummonSam", {
    contract: "Farm",
    from: deployer,
    args:[
      ham.address,
      sam.address
    ],
    log: true,
  });

  await transferOwnership('SummonSam', farmRegistry.address);

  await execute("FarmRegistry",
    { from: deployer },
    "addNewFarm",
    samFarm.address,
    oneEth.mul(100000),
    1604188799, // 2020-10-31 23:59:59 GMT+00:00
    1250000 // ~14.5 days
  );
};

export default func;
