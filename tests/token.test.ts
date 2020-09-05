import { waffle } from "@nomiclabs/buidler";
import { deployContract, solidity } from "ethereum-waffle";
import { BigNumber } from "ethers";
import { Ham } from "../build/typechain/Ham";
import HamJSON from "../build/contracts/HAM.json";

import chai from "chai";

chai.use(solidity);

describe("token_tests", () => {
  const { expect } = chai;
  const { provider } = waffle;
  const [
    user,
    newUser
  ] = provider.getWallets();
  let ham : Ham;

  beforeEach(async () => {
    ham = (await deployContract(
      user,
      HamJSON,
      [],
    )) as Ham;

    await ham["initialize(string,string,uint8,address,uint256)"](
      "Ham ham ham",
      "HAM",
      BigNumber.from(18),
      user.address,
      BigNumber.from(1000)
    );
  });

  describe("expected fail transfers", () => {
    it("cant transfer from a 0 balance", async () => {
      await expect(
        ham.connect(newUser).transfer(user.address, "100")
      ).to.be.revertedWith("SafeMath: subtraction overflow");
    });

    it("cant transferFrom without allowance", async () => {
      await expect(
        ham.connect(newUser).transferFrom(user.address, newUser.address, "100")
      ).to.be.revertedWith("SafeMath: subtraction overflow");
    });
  });

  describe("non-failing transfers", () => {
    it("transfer to self doesnt inflate", async () => {
      let bal0 = await ham.balanceOf(user.address);
      await ham.transfer(user.address, "100");
      let bal1 = await ham.balanceOf(user.address);
      expect(bal0).to.be.eq(bal1);
    });

    it("transferFrom works", async () => {
      let bal00 = await ham.balanceOf(user.address);
      let bal01 = await ham.balanceOf(newUser.address);
      await ham.approve(newUser.address, "100");
      await ham.connect(newUser).transferFrom(user.address, newUser.address, "100");
      let bal10 = await ham.balanceOf(user.address);
      let bal11 = await ham.balanceOf(newUser.address);
      expect(BigNumber.from(bal01).add(100)).to.be.eq(bal11);
      expect(BigNumber.from(bal00).sub(100)).to.be.eq(bal10);
    });

    it("approve", async () => {
      await ham.approve(newUser.address, "100");
      let allowance = await ham.allowance(user.address, newUser.address);
      expect(allowance).to.be.eq("100");
    });

    it("increaseAllowance", async () => {
      await ham.increaseAllowance(newUser.address, "100");
      let allowance = await ham.allowance(user.address, newUser.address);
      expect(allowance).to.be.eq("100");
    });

    it("decreaseAllowance", async () => {
      await ham.increaseAllowance(newUser.address, "100");
      let allowance = await ham.allowance(user.address, newUser.address);
      expect(allowance).to.be.eq("100");
      await ham.decreaseAllowance(newUser.address, "100");
      allowance = await ham.allowance(user.address, newUser.address);
      expect(allowance).to.be.eq("0");
    });

    it("decreaseAllowance from 0", async () => {
      await ham.decreaseAllowance(newUser.address, "100");
      let allowance = await ham.allowance(user.address, newUser.address);
      expect(allowance).to.be.eq("0");
    });
  });
});
