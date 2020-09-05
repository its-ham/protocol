import chai from "chai";

import { Ham } from "../index";
import * as Types from "../lib/types.js";
import {
  addressMap
} from "../lib/constants";
import {
  bigNumber,
  decimalToString,
  stringToDecimal
} from "../lib/helpers"

const { expect } = chai;

export const ham = new Ham(
  "http://localhost:8545/",
  // "http://127.0.0.1:9545/",
  "1001",
  true, {
    defaultAccount: "",
    defaultConfirmations: 1,
    autoGasMultiplier: 1.5,
    testing: false,
    defaultGas: "6000000",
    defaultGasPrice: "1000000000000",
    accounts: [],
    ethereumNodeTimeout: 10000
  }
)
const oneEther = bigNumber(10 ** 18);
const one = bigNumber(1);

describe("post-deployment", () => {
  let snapshotId : string | undefined;
  let user: string;

  before(async () => {
    const accounts = await ham.web3.eth.getAccounts();
    ham.addAccount(accounts[0]);
    user = accounts[0];
    if (ham.testing) {
      snapshotId = await ham.testing.snapshot();
    }
  });

  beforeEach(async () => {
    if (ham.testing) {
      await ham.testing.resetEVM("0x2");
    }
  });

  describe("supply ownership", () => {

    test("owner balance", async () => {
      let balance = await ham.contracts.ham.methods.balanceOf(user).call();
      expect(balance).to.be.eq(bigNumber(7000000).times(oneEther).toString())
    });

    test("pool balances", async () => {
      let ycrv_balance = await ham.contracts.ham.methods.balanceOf(ham.contracts.ycrv_pool.options.address).call();

      expect(ycrv_balance).to.be.eq(bigNumber(1500000).times(oneEther).times(one).toString())

      let yfi_balance = await ham.contracts.ham.methods.balanceOf(ham.contracts.yfi_pool.options.address).call();

      expect(yfi_balance).to.be.eq(bigNumber(250000).times(oneEther).times(one).toString())

      let ampl_balance = await ham.contracts.ham.methods.balanceOf(ham.contracts.ampl_pool.options.address).call();

      expect(ampl_balance).to.be.eq(bigNumber(250000).times(oneEther).times(one).toString())

      let eth_balance = await ham.contracts.ham.methods.balanceOf(ham.contracts.eth_pool.options.address).call();

      expect(eth_balance).to.be.eq(bigNumber(250000).times(oneEther).times(one).toString())

      let snx_balance = await ham.contracts.ham.methods.balanceOf(ham.contracts.snx_pool.options.address).call();

      expect(snx_balance).to.be.eq(bigNumber(250000).times(oneEther).times(one).toString())

      let comp_balance = await ham.contracts.ham.methods.balanceOf(ham.contracts.comp_pool.options.address).call();

      expect(comp_balance).to.be.eq(bigNumber(250000).times(oneEther).times(one).toString())

      let lend_balance = await ham.contracts.ham.methods.balanceOf(ham.contracts.lend_pool.options.address).call();

      expect(lend_balance).to.be.eq(bigNumber(250000).times(oneEther).times(one).toString())

      let link_balance = await ham.contracts.ham.methods.balanceOf(ham.contracts.link_pool.options.address).call();

      expect(link_balance).to.be.eq(bigNumber(250000).times(oneEther).times(one).toString())

      let mkr_balance = await ham.contracts.ham.methods.balanceOf(ham.contracts.mkr_pool.options.address).call();

      expect(mkr_balance).to.be.eq(bigNumber(250000).times(oneEther).times(one).toString())

    });

    test("total supply", async () => {
      let ts = await ham.contracts.ham.methods.totalSupply().call();
      expect(ts).to.be.eq("10500000000000000000000000")
    });

    test("init supply", async () => {
      let init_s = await ham.contracts.ham.methods.initSupply().call();
      expect(init_s).to.be.eq("10500000000000000000000000000000")
    });
  });

  describe("contract ownership", () => {

    test("ham gov", async () => {
      let gov = await ham.contracts.ham.methods.gov().call();
      expect(gov).to.be.eq(ham.contracts.timelock.options.address)
    });

    test("rebaser gov", async () => {
      let gov = await ham.contracts.rebaser.methods.gov().call();
      expect(gov).to.be.eq(ham.contracts.timelock.options.address)
    });

    test("reserves gov", async () => {
      let gov = await ham.contracts.reserves.methods.gov().call();
      expect(gov).to.be.eq(ham.contracts.timelock.options.address)
    });

    test("timelock admin", async () => {
      let gov = await ham.contracts.timelock.methods.admin().call();
      expect(gov).to.be.eq(ham.contracts.gov.options.address)
    });

    test("gov timelock", async () => {
      let tl = await ham.contracts.gov.methods.timelock().call();
      expect(tl).to.be.eq(ham.contracts.timelock.options.address)
    });

    test("gov guardian", async () => {
      let grd = await ham.contracts.gov.methods.guardian().call();
      expect(grd).to.be.eq("0x0000000000000000000000000000000000000000")
    });

    test("pool owner", async () => {
      let owner = await ham.contracts.eth_pool.methods.owner().call();
      expect(owner).to.be.eq(ham.contracts.timelock.options.address)
    });

    test("incentives owner", async () => {
      let owner = await ham.contracts.ycrv_pool.methods.owner().call();
      expect(owner).to.be.eq(ham.contracts.timelock.options.address)
    });

    test("pool rewarder", async () => {
      let rewarder = await ham.contracts.eth_pool.methods.rewardDistribution().call();
      expect(rewarder).to.be.eq(ham.contracts.timelock.options.address)
    });
  });

  describe("timelock delay initiated", () => {
    test("timelock delay initiated", async () => {
      let inited = await ham.contracts.timelock.methods.admin_initialized().call();
      expect(inited).to.be.eq(true);
    })
  })
})
