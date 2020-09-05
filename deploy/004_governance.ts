import {
  BuidlerRuntimeEnvironment,
  DeployFunction,
} from "@nomiclabs/buidler/types";

const func: DeployFunction = async function (bre: BuidlerRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = bre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const ham = await deployments.get("HAM");

  const lock = await deploy(
    "Timelock", {
      from: deployer,
      args: [],
      log: true
    }
  );

  await deploy(
    "GovernorAlpha", {
      from: deployer,
      args: [ lock.address, ham.address ],
      log: true
    }
  );
};

export default func;
