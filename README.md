# 🐷 HAM Protocol 🐷

## The Protocol

Ham is an experimental protocol building upon the most exciting innovations in programmable money and governance. Built by a couple degenerates who prefer meat to [sweet potatoes](https://github.com/yam-finance/yam-protocol), it seeks to answer

* how strong is a meme?
* how quickly can a community bootstrap itself?
* wen moon?

Built by a team of DeFi natives, it seeks to create:

At its core, HAM is an elastic supply cryptocurrency, which expands and contracts its supply in response to market conditions, initially targeting 1 USD per HAM. This stability mechanism includes one key addition to existing elastic supply models such as Ampleforth: a portion of each supply expansion is used to buy yCurve (a high-yield USD-denominated stablecoin) and add it to the Ham treasury, which is controlled via Ham community governance.

We have built Ham to be a minimally viable monetary experiment, and at launch there will be zero value in the HAM token. After deployment, it is entirely dependent upon HAM holders to determine its value and future development. We have employed a fork of the Compound governance module, which will ensure all updates to the Ham protocol happen entirely on-chain through community voting.

## Audits

None. Seriously, look at the commit history, it's just find and replace. You probably shouldn't use this, but not everyone likes sweet potatoes and ham is delicious.

The [original devs](github.com/yam-finance/yam-protocol) and the forking degenerates all encourage governance to fund a bug bounty/security audit. If there's no audit or bounty program, remember, any funds you deposit are basically a bug bounty.

## The Token

The core HAM token uses yCRV as the reserve currency, which is roughly a $1 peg. Each supply expansion (referred to as an inflating rebase), a portion of tokens is minted and used to build up the treasury. This treasury is then in complete ownership of HAM holders via governance.

## Distribution

Rather than allocating a portion of the supply to the founding team, HAM is being distributed in the spirit of Satoshi, and applied by YFI: no premine, no founder shares, no VC interests — simply equal-opportunity staking distribution to attract a broad and vision-aligned community of meat eaters.

The initial distribution of HAM will be oddly distributed across seven staking pools: sETH, BZXR, DAI, LINK, KEEP, SRM, and ETH/WBTC Uniswap v2 LP tokens. These pools were chosen intentionally to reach a broad swath of the overall degenerate community, many of which [don't like sweet potatoes](https://github.com/yam-finance/yam-protocol). Except LINK, of course, which eats [anything and everything](https://coinmarketcap.com/currencies/chainlink/).

Following the launch of the initial distribution pools, a second distribution wave will be incentivized through a HAM/yCRV Uniswap pool. This pool will allow Uniswap's TWAP-based oracle to provide necessary input as the basis for rebase calculations, as well as provide liquidity for the rebase to purchase yCRV for the treasury.

## Rebases

Rebases are controlled by an external contract called the Rebaser. This is comparable to Ampleforth's `monetaryPolicy` contract. It dictates how large the rebase is and what happens on the rebase. The HAM token just changes the supply based on what this contract provides it.

There are a few requirements before rebases are active:

1. Liquid HAM/yCRV market
2. `init_twap()`
3. `activate_rebasing()`

Following the launch of the second pool, rebasing can begin its activation phase. This begins with `init_twap()` on the rebaser contract. Anyone can call this at anytime once there is a HAM/yCRV Uniswap V2 market. The oracle is designed to be 12 hours between checkpoints. Given that, 12 hours after `init_twap()` is called, anyone can call `activate_rebasing()`. This turns rebasing on, permanently. Now anyone can call `rebase()` when `inRebaseWindow() == true;`.

In a rebase, the order of operations are:

1. ensure in rebase window
2. calculate how far off price is from the peg
3. dampen the rebase by the rebaseLag
4. if positive calculate protocol mint amount
5. change scaling factor, (in/de)flating the supply
6. sync uniswap, mint, sell to uniswap, transfer excess HAM and bought yCRV to reserves
7. call any extra functions governance adds in the future (i.e. Balancer gulps)

## Governance

Governance is entirely dictated by HAM holders from the start. Upon deployment, ownership of all HAM protocol contracts was reliquished to the timelocked Governance contract or removed entirely. At the very least, this can be seen as a reference implementation for a truly decentralized meat-farming protocol.

# Development

### Building

This repo uses truffle. Ensure that you have truffle installed. Given the composability aspect of this

Then, to build the contracts run:
```
$ truffle compile
```

To run tests, run against a single test package, i.e.:
```
$ sh startBlockchain.sh
$ truffle migrate --network distribution
$ python scripts/clean.py
$ cd jsLib
$ jest deployment
$ jest token
$ jest rebase
$ jest governance
$ jest governorAlpha
$ jest distribution
```
The need to run one-by-one seems to be a limitation of jest + ganache.

The distribution tests require specific tokens. These are acquired by using the ganache unlock_account function. If you receive fails, the owner likely decreased their ownership of that token. Just replace any instances of that address with another holder of the token.

Note: some governance tests require a different ganache setup. You will encounter a warning (but not a failed test) if the wrong type of ganache is setup. To run the correct one:
```
$ sh startBlockchainMining.sh
$ truffle migrate --network distribution
$ python scripts/clean.py
$ cd jsLib
$ jest governance
```

#### Attributions

Much of this code base is modified from existing works, including:

[YAM](https://yam.finance) - Basically s/YAM/HAM/g

[Compound](https://compound.finance) - Jumping off point for YAM token code and governance

[Ampleforth](https://ampleforth.org) - Initial YAM rebasing mechanism, modified to better suit the YAM protocol

[Synthetix](https://synthetix.io) - Rewards staking contract

[YEarn](https://yearn.finance)/[YFI](https://ygov.finance) - Initial YAM fair distribution implementation
