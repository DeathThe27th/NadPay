# NadPay — payroll in one link

One-click recurring crypto payroll on [Monad](https://monad.xyz) testnet.

**The problem.** You're a founder paying your Discord mods every week — 10 people, a fixed amount each. Sending 10 separate transactions every week is tedious and easy to fumble.

**The fix.** Preset your team once (address + amount, saved on-chain). Fund the whole payroll with a single transaction. Drop **one claim link** in your team channel. Each member connects their whitelisted wallet and claims their preset share — exactly once. Anything unclaimed after the deadline comes back to you, so a typo'd address never loses funds.

This is a transparent, auditable payroll tool — not a mixer or privacy product. Every round, allocation, and claim is public on-chain state.

## Contract

`NadPay.sol` deployed and verified on **Monad testnet** (chain id `10143`):

| | |
|---|---|
| Address | [`0x42517273BE74153DF1aF39778f3EfdCf5C80f159`](https://testnet.monadscan.com/address/0x42517273BE74153DF1aF39778f3EfdCf5C80f159) |
| Explorers | [MonadScan](https://testnet.monadscan.com/address/0x42517273BE74153DF1aF39778f3EfdCf5C80f159) · [MonadVision](https://testnet.monadvision.com/address/0x42517273BE74153DF1aF39778f3EfdCf5C80f159) |
| Settlement | Native MON, pull-based claims |

One contract holds many payout rounds. Key functions:

- `setRecipients(address[], uint256[])` — save your reusable team template on-chain
- `createRound(claimWindowSeconds)` — fund a round with `msg.value` equal to the exact template total
- `createRoundCustom(recipients, amounts, window)` — one-off round without saving a template
- `claim(roundId)` — whitelisted recipients pull their allocation, once
- `reclaim(roundId)` — payer recovers leftovers after the deadline

Checks-effects-interactions ordering, reentrancy guard, exact-funding enforcement. 20 Foundry tests including a reentrancy attack test and fuzzing.

## Repo layout

```
contracts/   Foundry project — NadPay.sol + tests
app/, lib/, components/
             Next.js (App Router) + wagmi v3 + viem frontend (repo root)
```

## Run it

```bash
# contracts
cd contracts
forge test

# frontend (Monad testnet, contract address is baked into lib/nadpay.ts)
npm install
npm run dev
```

Open http://localhost:3000, connect an injected wallet (MetaMask etc.) on Monad testnet, add teammates, and hit **Create payout**. Share the generated `/claim/{roundId}` link; track claims and reclaim leftovers at `/round/{roundId}`.

## Claim as USDC (swap layer) — built, gated off

The claim page has an optional "receive as USDC" layer (BUILD-2-SWAP.md): claim MON from NadPay, then swap MON→USDC via Uniswap in a second, explicitly-confirmed transaction — quote preview, price impact, slippage guard, min-received, quote expiry, and simulation before send. The gate logic is pure and unit-tested (`lib/swap.test.ts`, 12 tests).

**The toggle is currently hidden** because Monad testnet was reset from genesis on 2025-12-16 and Uniswap has not redeployed there (their official docs list Monad mainnet only). Verified on-chain (chain 10143):

| Contract | Address | Status |
|---|---|---|
| USDC (Circle, official) | `0x534b2f3A21130d7a60830c2Df862319e593943A3` | ✓ live, verified |
| WMON (docs.monad.xyz) | `0xFb8bf4c1CC7a94c73D209a149eA2AbEa852BC541` | ✓ live, verified |
| Uniswap V2/V3 (pre-reset addresses) | — | ✗ no code on live chain |

Per the spec's locked rule ("never invent a token address or pool"), the USDC option renders visibly disabled ("Receive USDC · soon") on the claim page. Filling `SWAP_CONFIG` in `lib/swap.ts` with a verified router/quoter/pool enables the full flow — roadmap item for when Uniswap returns to testnet.

## Built with

- [Monskills](https://github.com/therealharpaljadeja/monskills) for Monad deployment/verification workflow
- Foundry, Next.js 16, wagmi v3, viem, Tailwind v4

Built for the BuildAnything "Spark" hackathon.
