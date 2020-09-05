import { getChainId, ethers, deployments, waffle } from "@nomiclabs/buidler";
import { Deployment } from "@nomiclabs/buidler/types";
import { solidity } from "ethereum-waffle";
import { BigNumber, utils, Wallet } from "ethers";
import { encodeTypedDataDigest } from 'ethers-eip712';
import { HamFactory } from "../build/typechain/HamFactory";
import { GovernorAlphaFactory } from "../build/typechain/GovernorAlphaFactory";
import { mineBlock } from "./evm";

import chai from "chai";

chai.use(solidity);

async function enfranchise(ham: any, actor: Wallet, amount: BigNumber) {
  await ham.transfer(actor.address, amount);
  await ham.connect(actor).delegate(actor.address);
}

function voteDigest(
  contractAddress: string,
  proposalId: BigNumber,
  support: boolean,
  chainId: number
) {
  const typedData = {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      Ballot: [
        { name: 'proposalId', type: 'uint256' },
        { name: 'support', type: 'bool' }
      ]
    },
    primaryType: 'Ballot',
    domain: {
      name: 'HAM Governor Alpha',
      chainId: chainId,
      verifyingContract: contractAddress,
    },
    message: {
      proposalId: proposalId,
      support: support,
    },
  };

  return encodeTypedDataDigest(typedData);
}

describe("governorAlpha#castVote/2", () => {
  const { expect } = chai;
  const { provider } = waffle;
  const [
    user,
    a1,
    a2,
    a3,
    a4,
    guy
  ] = provider.getWallets();

  let chainId: number;

  const oneEth = BigNumber.from(10).pow(18);
  const oneHundredEth = oneEth.mul(100);

  let hamDeployment: Deployment;
  let govDeployment: Deployment;

  let proposalId : BigNumber;

  const proposeNothing = (gov: any, actor: Wallet) => {
    const abi = ["function getBalanceOf(address owner)"];
    const iface = new ethers.utils.Interface(abi);
    const callData = iface.encodeFunctionData("getBalanceOf", [a1.address]);
    return gov.connect(actor).propose(
      [actor.address],
      ["0"],
      ["getBalanceOf(address)"],
      [callData],
      "do nothing",
      {gasLimit: 400000}
    );
  };

  beforeEach(async () => {
    await deployments.fixture();

    chainId = BigNumber.from(await getChainId()).toNumber();

    hamDeployment = await deployments.get("HAM");
    govDeployment = await deployments.get("GovernorAlpha");

    let ham = HamFactory.connect(hamDeployment.address, user);
    let gov = GovernorAlphaFactory.connect(govDeployment.address, user);

    await ham.delegate(a1.address, {gasLimit: 400000});

    await proposeNothing(gov, a1);
    proposalId = await gov.latestProposalIds(a1.address);
  });

  describe("We must revert if:", () => {
    it("There does not exist a proposal with matching proposal id where the current block number is between the proposal's start block (exclusive) and end block (inclusive)", async () => {
      let gov = GovernorAlphaFactory.connect(govDeployment.address, user);
      await expect(gov.castVote(proposalId, true)).to.be.revertedWith(
        "GovernorAlpha::_castVote: voting is closed"
      );
    });

    it("Such proposal already has an entry in its voters set matching the sender", async () => {
      let ham = HamFactory.connect(hamDeployment.address, user);
      let gov = GovernorAlphaFactory.connect(govDeployment.address, user);

      await mineBlock(provider);
      await mineBlock(provider);

      await gov.connect(a4).castVote(proposalId, true);
      await expect(
        gov.connect(a4).castVote(proposalId, true)
      ).to.be.revertedWith(
        "GovernorAlpha::_castVote: voter already voted"
      );
    });
  });

  describe("Otherwise", () => {
    it("we add the sender to the proposal's voters set", async () => {
      let ham = HamFactory.connect(hamDeployment.address, user);
      let gov = GovernorAlphaFactory.connect(govDeployment.address, user);

      await mineBlock(provider);
      await mineBlock(provider);

      let r = await gov.getReceipt(proposalId, a2.address);
      expect(r.hasVoted).to.be.eq(false);

      await gov.connect(a2).castVote(proposalId, true);
      r = await gov.getReceipt(proposalId, a2.address);
      expect(r.hasVoted).to.be.eq(true);
    });

    describe("and we take the balance returned by GetPriorVotes for the given sender and the proposal's start block, which may be zero,", () => {
      let actor; // an account that will propose, receive tokens, delegate to self, and vote on own proposal

      it("and we add that ForVotes", async () => {
        let ham = HamFactory.connect(hamDeployment.address, user);
        let gov = GovernorAlphaFactory.connect(govDeployment.address, user);

        await mineBlock(provider);
        await mineBlock(provider);
        actor = a2;
        await enfranchise(
          ham, actor, BigNumber.from(10).pow(18).mul(400001));

        await proposeNothing(gov, actor);

        let proposalId = await gov.latestProposalIds(actor.address);

        let beforeFors = (await gov.proposals(proposalId)).forVotes;
        await mineBlock(provider);
        await gov.connect(actor).castVote(proposalId, true);

        let afterFors = (await gov.proposals(proposalId)).forVotes;
        expect(BigNumber.from(afterFors)).to.be.eq(BigNumber.from(10).pow(24).mul(400001).add(beforeFors));
      });

      it("or AgainstVotes corresponding to the caller's support flag.", async () => {
        let ham = HamFactory.connect(hamDeployment.address, user);
        let gov = GovernorAlphaFactory.connect(govDeployment.address, user);

        await mineBlock(provider);
        await mineBlock(provider);
        actor = a4;
        await enfranchise(ham, actor, BigNumber.from(10).pow(18).mul(400001));

        await proposeNothing(gov, actor);

        proposalId = await gov.latestProposalIds(actor.address);

        let beforeFors = (await gov.proposals(proposalId)).againstVotes;
        await mineBlock(provider);
        await gov.connect(actor).castVote(proposalId, false);

        let afterFors = (await gov.proposals(proposalId)).againstVotes;
        expect(BigNumber.from(afterFors)).to.be.eq(BigNumber.from(10).pow(24).mul(400001).add(beforeFors));
      });
    });

    describe('castVoteBySig', () => {

      it('calculates the correct vote digest', async () => {
        let newPropId = BigNumber.from(utils.randomBytes(32));
        let support = Math.random() >= 0.5;
        let digest = voteDigest(govDeployment.address, newPropId, support, chainId);

        let gov = GovernorAlphaFactory.connect(govDeployment.address, user);
        let chainDigest = await gov.voteDigest(newPropId, support);
        expect(chainDigest).to.be.eq(utils.hexlify(digest));
      });

      it('reverts if the signatory is invalid', async () => {
        let gov = GovernorAlphaFactory.connect(govDeployment.address, user);

        let sigHash = voteDigest(govDeployment.address, proposalId, false, chainId);
        let sig = utils.splitSignature(await a1.signMessage(sigHash));

        await mineBlock(provider);
        await mineBlock(provider);

        await expect(
          gov.castVoteBySig(
            proposalId, false, 0, sig.r, sig.s)
        ).to.be.revertedWith(
          "GovernorAlpha::castVoteBySig: invalid signature"
        );
      });

      it('casts vote on behalf of the signatory', async () => {
        let ham = HamFactory.connect(hamDeployment.address, user);
        let gov = GovernorAlphaFactory.connect(govDeployment.address, user);

        await enfranchise(ham, a4, BigNumber.from(10).pow(18).mul(400001));
        await proposeNothing(gov, a4);
        proposalId = await gov.latestProposalIds(a4.address);

        let sigHash = voteDigest(gov.address, proposalId, true, chainId);
        const sig = utils.splitSignature(await a4.signMessage(sigHash));

        let beforeFors = (await gov.proposals(proposalId)).forVotes;
        await mineBlock(provider);
        console.log(a4.address);
        const tx = await gov.castVoteBySig(proposalId, true, sig.v, utils.arrayify(sig.r), utils.arrayify(sig.s), {gasLimit: 100000});
        const receipt = await tx.wait(1);
        expect(receipt.gasUsed).to.be.below(80000);

        await mineBlock(provider);
        await mineBlock(provider);
        console.log(await gov.getReceipt(proposalId, a4.address));
        let proposal = (await gov.proposals(proposalId));
        let afterFors = proposal.forVotes;

        expect(BigNumber.from(afterFors)).to.be.eq(BigNumber.from(beforeFors).add(400001).mul(BigNumber.from(10).pow(24)));
      });
    });
  });
});
