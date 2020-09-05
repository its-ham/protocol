import {
  BuidlerRuntimeEnvironment,
  DeployFunction,
} from "@nomiclabs/buidler/types";

import { BigNumber } from "ethers";

const func: DeployFunction = async function (bre: BuidlerRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = bre;
  const { deploy, execute } = deployments;

  const { deployer } = await getNamedAccounts();

  let delegate = await deploy(
    "HAMDelegate", {
      from: deployer,
      contract: "HAMDelegate",
      args: [],
      log: true
    }
  );

  const twoHundred = BigNumber.from("2000000000000000000000000");
  // if testnet, give deployer 7M more tokens
  const amountToMint = (bre.network.name === "buidlerevm" ?
    twoHundred.div(2).mul(7) : twoHundred);

  await deploy(
    "HAM", { from: deployer,
      contract: "HAMDelegator",
      args: [
        "HAM",
        "Ham ham ham",
        18,
        amountToMint,
        delegate.address,
        "0x"
      ]
    }
  );
};

export default func;
