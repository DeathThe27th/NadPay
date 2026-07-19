# NadPay — hackathon submission info

## Title
nadpay

## Description (≤2000 chars)
NadPay is one-click recurring payroll on Monad mainnet. A payer saves their team once on-chain (addresses + amounts), funds an entire payroll round with a single transaction of native MON, and drops one claim link in the team chat. Each whitelisted teammate connects their wallet and pulls their preset share exactly once — optionally as USDC via an atomic in-claim Uniswap swap: `claimAndSwap` routes the MON from the contract straight into the pool inside the claim transaction, so the recipient's wallet only ever receives USDC and only ever pays gas. If the pool can't meet min-received, the whole claim reverts and the allocation stays claimable. Anything unclaimed after the deadline returns to the payer.

What it solves: paying a recurring team on-chain means N manual transfers every payday — tedious, and one mistyped address loses real money. NadPay flips payouts to pull-based: only whitelisted wallets can claim, each exactly once, and leftovers are reclaimable, so funds can't be stranded.

How it's built: a Solidity contract (Foundry, 25 tests — reentrancy attacks on both claim paths, swap-revert rollback, fuzzing, and a mainnet-fork test against the real Uniswap router) deployed and source-verified on Monad mainnet, plus a Next.js + wagmi/viem frontend with live QuoterV2 quotes, a 5% price-impact block, slippage/min-received guards, quote expiry, and pre-sign simulation. Proven with a real-funds end-to-end pass on mainnet: create round → claim as MON → atomic claim-as-USDC → reclaim after deadline.

What we learned: Monad-specific mechanics (gas charged on gas limit, RPC log-range caps that pushed history to multicall view reads instead of event logs), verifying every external address on-chain before wiring it in, and a UX lesson — a two-transaction claim-then-swap breaks for wallets that can't front the claimed amount as msg.value, which is what drove the atomic in-contract swap redesign.

## Project URL
https://nad-pay.vercel.app/

## GitHub repo
https://github.com/DeathThe27th/NadPay

## Category
mainnet (+500 XP · contract address required)

## Contract address
0x07324757Fd67FB597987635E1b7f1B767Bcd9494
(verified on MonadScan: https://monadscan.com/address/0x07324757Fd67FB597987635E1b7f1B767Bcd9494)

## Demo video (optional)
— none yet (must be under 3 minutes if added)

## Social media post URL (optional)
— none yet

## What problem are you trying to solve?
Recurring on-chain payroll is manual and dangerous: paying a 10-person team every week means 10 separate transfers, and a single mistyped address sends real money into the void with no recourse. Batch-sender tools still push funds outward, so the typo risk remains, and nothing brings unclaimed money back.

## How is your project the solution to your problem?
NadPay makes payouts pull-based instead of push-based. The payer presets the team once on-chain, funds the whole round in one transaction, and shares one claim link. Only whitelisted wallets can claim, each exactly once, so a wrong address can never receive funds — and anything unclaimed after the deadline is reclaimable by the payer. Teammates can even receive USDC instead of MON through an atomic in-claim swap that reverts safely if the market moves. It's live and verified on Monad mainnet, usable by any team today.
