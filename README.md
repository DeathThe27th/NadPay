# NadPay — payroll in one link

One-click recurring crypto payroll on [Monad](https://monad.xyz).

**The problem.** You're a founder paying your Discord mods every week — 10 people, a fixed amount each. Sending 10 separate transactions every week is tedious and easy to fumble.

**The fix.** Preset your team once (address + amount, saved on-chain). Fund the whole payroll with a single transaction. Drop **one claim link** in your team channel. Each member connects their whitelisted wallet and claims their preset share — exactly once. Anything unclaimed after the deadline comes back to you.

This is a transparent, auditable payroll tool — not a mixer or privacy product. Every round, allocation, and claim is public on-chain state.

## Contract

Deployed and verified on **Monad mainnet** (chain id `143`) — the contract is live and can be used by teams on Monad today:

| | |
|---|---|
| Address | [`0x42517273BE74153DF1aF39778f3EfdCf5C80f159`](https://monadscan.com/address/0x42517273BE74153DF1aF39778f3EfdCf5C80f159) |
| Explorers | [MonadScan](https://monadscan.com/address/0x42517273BE74153DF1aF39778f3EfdCf5C80f159) · [MonadVision](https://monadvision.com/address/0x42517273BE74153DF1aF39778f3EfdCf5C80f159) |
| Settlement | Native MON, pull-based claims |

The same contract source is also deployed at the same address on Monad testnet (chain `10143`) for safe demos; set `NEXT_PUBLIC_NETWORK=testnet` to point the app there. The ABI lives in `lib/nadpay.ts`; per-network addresses in `lib/network.ts`.

One contract holds many payout rounds. Key functions:

- `setRecipients(address[], uint256[])` — save your reusable team template on-chain
- `createRound(claimWindowSeconds)` — fund a round with `msg.value` equal to the exact template total
- `createRoundCustom(recipients, amounts, window)` — one-off round without saving a template
- `claim(roundId)` — whitelisted recipients pull their allocation, once
- `reclaim(roundId)` — payer recovers leftovers after the deadline

Checks-effects-interactions ordering, reentrancy guard, exact-funding enforcement. 20 Foundry tests including a reentrancy attack test and fuzzing. Verified live on mainnet with a small-amount end-to-end pass (create → claim MON → claim + swap to USDC → reclaim after deadline).

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

# frontend (defaults to Monad mainnet; NEXT_PUBLIC_NETWORK=testnet for testnet)
npm install
npm run dev
```

Open http://localhost:3000, connect an injected wallet (MetaMask etc.) on Monad, add teammates, and hit **Create payout**. Share the generated `/claim/{roundId}` link; track claims and reclaim leftovers at `/round/{roundId}`.

## Claim as USDC (swap layer)

The claim page has an optional "receive as USDC" toggle: claim MON from NadPay, then swap MON→USDC in a second, explicitly-confirmed frontend transaction through Uniswap — quote preview, price impact, slippage guard, min-received, quote expiry, and simulation before send. Listed tokens are MON and USDC only. The gate logic is pure and unit-tested (`lib/swap.test.ts`).

Live on mainnet against the Uniswap 0.3% WMON/USDC pool (all resolved via monad-crypto/protocols + monskills and verified on-chain, chain 143):

| Contract | Address |
|---|---|
| USDC (Circle) | `0x754704Bc059F8C67012fEd69BC8A327a5aafb603` |
| WMON | `0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A` |
| Uniswap SwapRouter02 | `0xfE31F71C1b106EAc32F1A19239c9a9A72ddfb900` |
| Uniswap QuoterV2 | `0x661E93cca42AfacB172121EF892830cA3b70F08d` |

If price impact exceeds 5% or the quote goes stale, the USDC option is blocked and the claim falls back to plain MON. On testnet (no post-reset Uniswap deployment) the toggle stays hidden.

## Built with

- [Monskills](https://github.com/therealharpaljadeja/monskills) for Monad deployment/verification workflow
- Foundry, Next.js 16, wagmi v3, viem, Tailwind v4

Built for the BuildAnything "Spark" hackathon.
