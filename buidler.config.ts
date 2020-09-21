import fs from "fs";
import path from "path";
import { TASK_COMPILE } from "@nomiclabs/buidler/builtin-tasks/task-names";
import { task, usePlugin } from "@nomiclabs/buidler/config";
import { tsGenerator } from "ts-generator";
import { TypeChain } from "typechain/dist/TypeChain";

usePlugin("@nomiclabs/buidler-waffle");
usePlugin("buidler-deploy");
usePlugin('buidler-contract-sizer');

task(
  "typechain",
  "Generate contract typings with typechain"
).setAction(async ({}, {config, run}) => {
  await run(TASK_COMPILE);

  let cwd = process.cwd();

  console.log(
    `Copying imported artifacts...`
  );

  [
    "@uniswap/v2-core/build/UniswapV2Factory.json",
    "@uniswap/v2-periphery/build/UniswapV2Router02.json",
    "@uniswap/v2-periphery/build/WETH9.json",
    "@uniswap/v2-core/build/UniswapV2Pair.json"
  ].forEach((s) =>
    fs.copyFile(
      path.join(cwd, "node_modules", s),
      path.join(cwd, "build", "contracts", path.basename(s)), (err) => {
        if (err) throw err;
    })
  );

  console.log(
    `Creating Typechain artifacts in ./build/typechain/...`
  );

  await tsGenerator(
    { cwd },
    new TypeChain({
      cwd,
      rawConfig: {
        files: "./build/contracts/*.json",
        outDir: "./build/typechain/",
        target: "ethers-v5",
      },
    })
  );

  console.log(`Successfully generated Typechain artifacts!`);
});

export default {
  solc: {
    version: "0.5.17"
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    distributor: {
      default: 1,
    }
  },
  paths: {
    artifacts: "./build/contracts",
    tests: "./tests",
    deploy: "./deploy/",
    deployments: "./deployments",
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: false,
  },
};
