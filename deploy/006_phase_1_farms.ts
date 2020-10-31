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
  const hundo = BigNumber.from(10).pow(3).mul(oneEth).mul(100);

  const transferOwnership = (contract : string, newAddress : string) => {
    return execute(contract,
      { from: deployer, gasLimit: 100000},
      "transferOwnership",
      newAddress
    )
  };

  const yamFarm = await deploy("IYamWhatIYam", {
    contract: "Trough",
    from: deployer,
    args:[
      ham.address,
      "0x0e2298E3B3390e3b945a5456fBf59eCc3f55DA16",
      1,
      2
    ],
    log: true,
  });

  const wnxmFarm = await deploy("NotoriousPIG", {
    contract: "Farm",
    from: deployer,
    args:[
      ham.address,
      "0x0d438f3b5175bebc262bf23753c1e53d03432bde"
    ],
    log: true,
  });

  const linkFarm = await deploy("LoveFindsAWay", {
    contract: "Farm",
    from: deployer,
    args:[
      ham.address,
      "0x514910771af9ca656af840dff83e8264ecf986ca"
    ],
    log: true,
  });

  await Promise.all([
    transferOwnership('IYamWhatIYam', farmRegistry.address),
    transferOwnership('NotoriousPIG', farmRegistry.address),
    transferOwnership('LoveFindsAWay', farmRegistry.address),
   ]);

  await execute("FarmRegistry",
    { from: deployer },
    "addNewFarm",
    yamFarm.address,
    hundo,
    1604188799, // 2020-10-31 23:59:59 GMT+00:00
    625000, // ~7 1/4 days
  );

  await execute("FarmRegistry",
    { from: deployer },
    "addNewFarm",
    wnxmFarm.address,
    hundo,
    1604188799, // 2020-10-31 23:59:59 GMT+00:00
    625000, // ~7 1/4 days
  );

  await execute("FarmRegistry",
    { from: deployer },
    "addNewFarm",
    linkFarm.address,
    hundo,
    1604188799, // 2020-10-31 23:59:59 GMT+00:00
    625000, // ~7 1/4 days
  );
};

export default func;
