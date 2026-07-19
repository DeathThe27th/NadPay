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
I've been a project manager for several DeFi projects on Ethereum, which meant I was the one handling payments to the informal team — mods, shillers, raiders, etc. The one thing I remember vividly as super inconvenient was payday. Every time payday rolled around, the founder would just send me the pre-defined budget, and I'd spend the whole day manually distributing payments to every single wallet. It was stressful enough that it regularly ate an entire afternoon — sending payouts one by one and confirming each recipient actually got theirs. And if that wasn't bad enough, I had to cover all the gas fees out of my own pocket because they were never included in the budget.

Paying a recurring team on-chain means a pile of manual transfers every single payday. That's not just inconvenient, it's inefficient: it costs you time, it costs extra gas on every transfer, and one mistake — a single mistyped address — loses real money.

## How is your project the solution to your problem?
NadPay flips payouts from push to pull. You input each teammate's wallet and salary amount once, and it's saved on-chain, linked to your sender wallet. From then on, payday is one button: one transaction funds the whole round, and you drop a single claim link in the team chat. Only whitelisted wallets can claim, each exactly once, and claimants pay their own gas — so a mistyped address can never receive funds, nobody fronts gas for the team, and anything unclaimed after the deadline comes back to you. Teammates can even receive USDC instead of MON through an atomic in-claim swap. It's live and verified on Monad mainnet today.
