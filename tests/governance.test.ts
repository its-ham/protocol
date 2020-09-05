import { waffle } from "@nomiclabs/buidler";
import { deployContract, solidity } from "ethereum-waffle";
import { BigNumber, ethers, utils } from "ethers";
import { ecsign, toBuffer } from 'ethereumjs-util';
import { TypedDataUtils } from 'ethers-eip712'
import { Ham } from "../build/typechain/Ham";
import HamJSON from "../build/contracts/HAM.json";
import { mineBlock } from "./evm";

import chai from "chai";

chai.use(solidity);

describe('HAM governance', () => {
  const { expect } = chai;
  const { provider } = waffle;
  const [
    user,
    a1,
    a2,
    guy
  ] = provider.getWallets();

  const oneEth = BigNumber.from(10).pow(18);
  const oneHundredEth = oneEth.mul(100);

  let ham: Ham;

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
      BigNumber.from("7000000000000000000000000")
    );
  });

  describe('delegateBySig', () => {

    // we publish the mnemonic. its is a well known test mnemonic so these pvks
    // arent a security issue.
    const pvk = "0xf2f48ee19680706196e2e339e5da3491186e0c4c5030670656b0e0164837257d";
    const pvk_a1 = "0x5d862464fe9303452126c8bc94274b8c5f9874cbd219789b3eb2128075a76f72";

  //  it('reverts if the signatory is invalid', async () => {
  //    const delegatee = user, nonce = 0, expiry = 0;
  //    await expect(
  //      ham.connect(a1).delegateBySig(
  //        delegatee.address,
  //        nonce,
  //        expiry,
  //        0,
  //        utils.hexZeroPad('0xdeadbeef', 32),
  //        utils.hexZeroPad('0xdeadbeef', 32))
  //    ).to.be.revertedWith("HAM::delegateBySig: invalid signature");
  //  });

  //  // it('reverts if the nonce is bad ', async () => {
  //  //   // const delegatee = user, nonce = 1, expiry = 0;
  //  //   // const { v, r, s } = EIP712.sign(Domain(), 'Delegation', { delegatee, nonce, expiry }, Types, pvk_a1);

  //  //   const typedData = {
  //  //        types: {
  //  //            EIP712Domain: [
  //  //                { name: 'name', type: 'string' },
  //  //                { name: 'chainId', type: 'uint256' },
  //  //                { name: 'verifyingContract', type: 'address' },
  //  //            ],
  //  //            Delegation: [
  //  //              { name: 'delegatee', type: 'address' },
  //  //              { name: 'nonce', type: 'uint256' },
  //  //              { name: 'expiry', type: 'uint256' }
  //  //            ]
  //  //        },
  //  //        primaryType: 'Delegation',
  //  //        domain: {
  //  //            name: 'HAM',
  //  //            chainId: 1, // since we are using --fork, it respects that chainID
  //  //            verifyingContract: '0x4BC6657283f8f24e27EAc1D21D1deE566C534A9A',
  //  //        },
  //  //        message: {
  //  //            delegatee: user,
  //  //            nonce: 1, // bad
  //  //            expiry: 0,
  //  //        },
  //  //    };

  //  //  let sigHash = TypedDataUtils.encodeDigest(typedData);
  //  //  const sig = ecsign(
  //  //    toBuffer(BigNumber.from(sigHash)),
  //  //    toBuffer(BigNumber.from(pvk_a1))
  //  //  );


  //  //   // const encoded = EIP712.signer.encodeMessageData(delegation.types, delegation.primaryType, delegation.message);

  //  //   await expect(
  //  //     ham.connect(a1).delegateBySig(user.address, 1, 0, sig.v, sig.r, sig.s)
  //  //   ).to.be.revertedWith("HAM::delegateBySig: invalid nonce");
  //  // });

  //  it('reverts if the signature has expired', async () => {
  //    // const delegatee = user, nonce = 0, expiry = 0;
  //    // const { v, r, s } = EIP712.sign(Domain(), 'Delegation', { delegatee, nonce, expiry }, Types, pvk_a1);

  //    const typedData = {
  //         types: {
  //             EIP712Domain: [
  //                 { name: 'name', type: 'string' },
  //                 { name: 'chainId', type: 'uint256' },
  //                 { name: 'verifyingContract', type: 'address' },
  //             ],
  //             Delegation: [
  //               { name: 'delegatee', type: 'address' },
  //               { name: 'nonce', type: 'uint256' },
  //               { name: 'expiry', type: 'uint256' }
  //             ]
  //         },
  //         primaryType: 'Delegation',
  //         domain: {
  //             name: 'HAM',
  //             chainId: 31337,
  //             verifyingContract: '0x4BC6657283f8f24e27EAc1D21D1deE566C534A9A',
  //         },
  //         message: {
  //             delegatee: user,
  //             nonce: 0,
  //             expiry: 0, //bad
  //         },
  //     };

  //    let sigHash = TypedDataUtils.encodeDigest(typedData)
  //    const sig = ecsign(
  //      toBuffer(BigNumber.from(sigHash)),
  //      toBuffer(BigNumber.from(pvk_a1))
  //    );

  //    await expect(
  //      ham.connect(a1).delegateBySig(user.address, 0, 0, sig.v, sig.r, sig.s)
  //    ).to.be.revertedWith("HAM::delegateBySig: signature expired");
  //  });

    // it('delegates on behalf of the signatory', async () => {

    //   const typedData = {
    //        types: {
    //            EIP712Domain: [
    //                { name: 'name', type: 'string' },
    //                { name: 'chainId', type: 'uint256' },
    //                { name: 'verifyingContract', type: 'address' },
    //            ],
    //            Delegation: [
    //              { name: 'delegatee', type: 'address' },
    //              { name: 'nonce', type: 'uint256' },
    //              { name: 'expiry', type: 'uint256' }
    //            ]
    //        },
    //        primaryType: 'Delegation',
    //        domain: {
    //            name: 'HAM',
    //            chainId: 1,
    //            verifyingContract: '0x4BC6657283f8f24e27EAc1D21D1deE566C534A9A',
    //        },
    //        message: {
    //            delegatee: user,
    //            nonce: 0,
    //            expiry: 10e9,
    //        },
    //    };

    //   let sigHash = TypedDataUtils.encodeDigest(typedData)
    //   const sig = ecsign(
    //     toBuffer(BigNumber.from(sigHash)),
    //     toBuffer(BigNumber.from(pvk_a1))
    //   );

    //   let tx = await ham.connect(a1).delegateBySig(
    //     user.address, 0, 10 ** 9, sig.v, sig.r, sig.s, { gasLimit: 500000 });
    //   let txReceipt = await tx.wait(1);
    //   expect(txReceipt.gasUsed).to.be.below(80000);
    //   let k = await ham.delegates(a1.address);
    //   let j = await ham.delegates(user.address);
    //   expect(k).to.be.eq(user.address);
    // });

    it('delegate', async () => {
      let d = await ham.delegates(a1.address);
      expect(d).to.be.eq("0x0000000000000000000000000000000000000000");
      let tx = await ham.connect(a1).delegate(user.address);
      let txReceipt = await tx.wait(1);
      expect(txReceipt.gasUsed).to.be.below(80000);
      let k = await ham.delegates(a1.address);
      expect(k).to.be.eq(user.address);
    });
  });

  describe('numCheckpoints', () => {
    it('returns the number of checkpoints for a delegate', async () => {

      await ham.transfer(guy.address, oneHundredEth);
      let nc = await ham.numCheckpoints(a1.address);
      expect(nc).to.be.eq(0);

      await ham.connect(guy).delegate(a1.address);
      nc = await ham.numCheckpoints(a1.address);
      expect(nc).to.be.eq(1);


      await ham.connect(guy).transfer(a2.address, oneHundredEth.div(10));
      nc = await ham.numCheckpoints(a1.address);
      expect(nc).to.be.eq(2);

      await ham.connect(guy).transfer(a2.address, oneHundredEth.div(10));
      nc = await ham.numCheckpoints(a1.address);
      expect(nc).to.be.eq(3);


      await ham.transfer(guy.address, oneHundredEth.div(5));
      nc = await ham.numCheckpoints(a1.address);
      expect(nc).to.be.eq(4);

      let cs = await ham.checkpoints(a1.address, 0);
      expect(cs.votes).to.be.eq("100000000000000000000000000"); // 100 * 1e24

      cs = await ham.checkpoints(a1.address, 1);
      expect(cs.votes).to.be.eq("90000000000000000000000000"); // 90 * 1e24


      cs = await ham.checkpoints(a1.address, 2);
      expect(cs.votes).to.be.eq("80000000000000000000000000"); // 90 * 1e24

      cs = await ham.checkpoints(a1.address, 3);
      expect(cs.votes).to.be.eq("100000000000000000000000000"); // 90 * 1e24
    });

    it('does not add more than one checkpoint in a block', async () => {
      // For this test to pass, you must enable blocktimes. it will fail otherwise

      await ham.transfer(guy.address, oneHundredEth);
      let nc = await ham.numCheckpoints(a1.address);
      expect(nc).to.be.eq(0);

      let t1 = await ham.connect(guy).delegate(a1.address);
      let t2 = await ham.connect(guy).transfer(a2.address, oneHundredEth.div('10'));
      let t3 = await ham.connect(guy).transfer(a2.address, oneHundredEth.div('10'));

      let receipt1 = await t1.wait(1);
      let receipt2 = await t2.wait(1);

      if (receipt1.blockNumber != receipt2.blockNumber) {
        console.log("WARNING: 'does not add more than one checkpoint in a block' REQUIRES DIFFERENT EVM PARAMs. RUN IN MINING MODE");
        return;
      }

      nc = await ham.numCheckpoints(a1.address);
      expect(nc).to.be.eq('1');

      let cs = await ham.checkpoints(a1.address, 0);
      expect(cs.votes).to.be.eq("80000000000000000000000000"); // 80 * 1e24

      cs = await ham.checkpoints(a1.address, 1);
      expect(cs.votes).to.be.eq("0"); // 0

      cs = await ham.checkpoints(a1.address, 2);
      expect(cs.votes).to.be.eq("0"); // 0

      let t4 = await ham.transfer(guy.address, oneHundredEth.mul(.2));

      nc = await ham.numCheckpoints(a1.address);
      expect(nc).to.be.eq('2');

      cs = await ham.checkpoints(a1.address, 1);
      expect(cs.votes).to.be.eq("100000000000000000000000000"); // 0
    });
  });

  describe('getPriorVotes', () => {
    it('reverts if block number >= current block', async () => {
      await expect(
        ham.getPriorVotes(a1.address, 5e10)
      ).to.be.revertedWith("HAM::getPriorVotes: not yet determined");
    });

    it('returns 0 if there are no checkpoints', async () => {
      let pv = await ham.getPriorVotes(a1.address, 0);
      expect(pv).to.be.eq('0');
    });

    it('returns the latest block if >= last checkpoint block', async () => {
      let t1 = await ham.delegate(a1.address);
      let receipt = await t1.wait(1);
      await mineBlock(provider);
      await mineBlock(provider);

      let pv = await ham.getPriorVotes(a1.address, receipt.blockNumber);
      debugger;
      expect(pv).to.be.eq('7000000000000000000000000000000');

      pv = await ham.getPriorVotes(
        a1.address,
        receipt.blockNumber + 1
      );
      expect(pv).to.be.eq('7000000000000000000000000000000');
    });

    it('returns zero if < first checkpoint block', async () => {
      await mineBlock(provider);
      let t1 = await ham.delegate(a1.address);
      let t1Receipt = await t1.wait(1);
      await mineBlock(provider);
      await mineBlock(provider);

      let pv = await ham.getPriorVotes(
        a1.address,
        t1Receipt.blockNumber - 1
      );
      expect(pv).to.be.eq('0');

      pv = await ham.getPriorVotes(
        a1.address,
        t1Receipt.blockNumber + 1
      );
      expect(pv).to.be.eq('7000000000000000000000000000000');
    });

    it('returns the voting balance at the appropriate checkpoint', async () => {
      await ham.transfer(guy.address, oneHundredEth);

      let t1 = await ham.connect(guy).delegate(a1.address);
      let receipt1 = await t1.wait(1);
      await mineBlock(provider);
      await mineBlock(provider);
      let t2 = await ham.connect(guy).transfer(a2.address, oneHundredEth.div(10));
      let receipt2 = await t2.wait(1);
      await mineBlock(provider);
      await mineBlock(provider);
      let t3 = await ham.connect(guy).transfer(a2.address, oneHundredEth.div(10));
      let receipt3 = await t3.wait(1);
      await mineBlock(provider);
      await mineBlock(provider);
      let t4 = await ham.connect(a2).transfer(guy.address, oneHundredEth.div(5));
      let receipt4 = await t4.wait(1);
      await mineBlock(provider);
      await mineBlock(provider);

      let pv = await ham.getPriorVotes(
        a1.address,
        receipt1.blockNumber - 1
      );
      expect(pv).to.be.eq('0');

      pv = await ham.getPriorVotes(a1.address, receipt1.blockNumber);
      expect(pv).to.be.eq('100000000000000000000000000');

      pv = await ham.getPriorVotes(a1.address, receipt1.blockNumber + 1);
      expect(pv).to.be.eq('100000000000000000000000000');

      pv = await ham.getPriorVotes(a1.address, receipt2.blockNumber);
      expect(pv).to.be.eq('90000000000000000000000000');

      pv = await ham.getPriorVotes(a1.address, receipt2.blockNumber + 1);
      expect(pv).to.be.eq('90000000000000000000000000');

      pv = await ham.getPriorVotes(a1.address, receipt3.blockNumber);
      expect(pv).to.be.eq('80000000000000000000000000');

      pv = await ham.getPriorVotes(a1.address, receipt3.blockNumber + 1);
      expect(pv).to.be.eq('80000000000000000000000000');

      pv = await ham.getPriorVotes(a1.address, receipt4.blockNumber);
      expect(pv).to.be.eq('100000000000000000000000000');

      pv = await ham.getPriorVotes(a1.address, receipt4.blockNumber + 1);
      expect(pv).to.be.eq('100000000000000000000000000');
    });
  });
});
