import { MockProvider } from "ethereum-waffle";

export async function mineBlock(provider: MockProvider) {
  await provider.send("evm_mine", []);
  return (await provider.getBlock('latest')).hash;
}

export async function increaseTime(
  provider: MockProvider,
  time: number
) {
  return await provider.send("evm_increaseTime", [time]);
}
