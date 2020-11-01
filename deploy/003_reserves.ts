import {
  BuidlerRuntimeEnvironment,
  DeployFunction,
} from "@nomiclabs/buidler/types";

const func: DeployFunction = async function (bre: BuidlerRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = bre;
  const { deploy, execute, read, log } = deployments;

  const { deployer } = await getNamedAccounts();

  const ham = await deployments.get("HAM");
  const reserveToken = await deployments.get("DAI");
  const uniswapFactory = await deployments.get("UniswapV2Factory");

  const reserves = await deploy(
    "HAMReserves",
    { from: deployer, args: [ reserveToken.address, ham.address ], log: true }
  );

  const rebaser = await deploy(
    'HAMRebaser',
    {
      from: deployer,
      log: true,
      args: [ ham.address, reserveToken.address, uniswapFactory.address, reserves.address ]
    }
  );

  let pair = await read("HAMRebaser", "uniswap_pair");

  console.log(`Rebaser Uniswap pair ${pair}`);

  await execute("HAM", { from: deployer }, "_setRebaser", rebaser.address)
  await execute("HAMReserves", { from: deployer }, "_setRebaser", rebaser.address)
};

export default func;
