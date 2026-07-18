# NadPay — Build Spec 2: "Claim as USDC" (frontend swap layer)

**This is an ADDITIVE spec. Apply it only after the core NadPay build (BUILD.md) is complete, deployed, verified, and tested end-to-end with native MON claims working.** Do not modify `NadPay.sol`. Do not block or regress the core MON claim flow. If anything here risks the core flow shipping, skip it — Tier 0 (claim native MON) is the guaranteed deliverable; this is a stretch feature.

## Goal

On the claim page, let a recipient choose to receive their payout **as MON (default)** or **swap to USDC** on Monad in one extra click. The swap happens entirely in the **frontend** via Uniswap on Monad — the NadPay contract is untouched and still just releases native MON.

## Why frontend, not in-contract

The NadPay contract stays clean and auditable: it releases MON to the claimant, exactly as already built. The optional swap is a **separate second transaction** initiated from the claim page, routing the just-claimed MON through Uniswap's router to USDC, with the claimant's address as the swap recipient. This keeps all swap/slippage/liquidity risk out of the contract's security surface.

Trade-off (state honestly in UI/writeup): "claim as USDC" is **two transactions** — (1) claim MON from NadPay, (2) swap MON→USDC on Uniswap. Not atomic. That's the safe design.

## Token scope — LOCKED

- Claimants may receive **MON** (native, default, no swap) or **USDC** (via one swap).
- **Do NOT offer arbitrary token choice.** Testnet liquidity is thin; only a verified MON↔USDC pool is supported. Offering "any token" risks empty-pool failures and bad rates.
- Before enabling the USDC option, **verify a working MON↔USDC pool exists on Monad testnet with usable liquidity** (via Monskills `addresses/` + `tooling-and-infra/`). If no usable pool is found, ship WITHOUT the swap toggle and note it as roadmap. Never invent a token address or pool.

## Infrastructure (confirmed available)

- **Uniswap is live on Monad** (testnet and mainnet), with swap, LP, and a Trading API.
- Use Monskills to resolve the correct Monad-testnet Uniswap **router address**, **USDC address**, and **WMON/wrapped-native** address. Fetch `addresses/` and verify code on-chain for every address before use. Do NOT hardcode addresses from memory or from this doc — resolve them through Monskills' official sources.
- Uniswap's 7702 delegation contracts are live on Monad if a one-click UX is desired later, but for this build keep it as a plain second transaction.

## Claim page changes

Extend the existing `/claim/[roundId]` page:

1. After the claimant connects and their allocation is confirmed claimable, show a receive-as choice:
   - **MON** (default) → existing flow: call `claim(roundId)`, done. One transaction.
   - **USDC** → two-step flow below.

2. **USDC flow:**
   a. Call `claim(roundId)` — claimant receives their MON allocation to their own wallet (unchanged contract call).
   b. Then present a **swap preview** BEFORE the second transaction, showing: amount in (MON), estimated USDC out, price impact, slippage tolerance (default e.g. 0.5–1%, user-adjustable), minimum received, Uniswap router address, recipient = claimant's own address, and quote expiry.
   c. On explicit confirmation, execute the swap via Uniswap's router (exact-input MON→USDC, native-in handled via wrapped-native as the router requires), with the min-received slippage guard, recipient = claimant.
   d. Show status: submitted → confirmed → received, with the finality labels from Monskills `concepts/` (quoted, submitted, source confirmed, received, safe, finalized, failed).

3. If the swap quote can't be fetched, liquidity is insufficient, or price impact exceeds a safe threshold (e.g. > some cap), **disable the USDC option and tell the user to claim as MON** — do not push a bad swap.

## Safety rails (required)

- Fetch `gas/` — show gas cost for both the claim tx and the swap tx; warn if the swap gas + price impact makes USDC net worse than just taking MON.
- Slippage protection with a sane default and a hard minimum-received; reject if actual out < min.
- Simulate the swap where possible before sending.
- Request only the minimal approval needed (for native MON→USDC via wrapped-native, follow the router's expected path).
- Reject unknown token contracts; only the Monskills-verified USDC address is allowed as output.
- Explicit user confirmation before the swap transaction. Never auto-swap.
- Recipient of the swap output must be the claimant's own connected address — never a contract or third party.

## Demo framing

"Claim your pay as MON — or swap to USDC in one click, powered by Uniswap on Monad." Show one claimant taking MON, another choosing USDC and watching the swap complete. Keep it honest: it's a frontend swap layer on top of the payroll contract, two transactions, verified MON↔USDC pool only.

## Deliverables (additive)
- [ ] Receive-as toggle (MON / USDC) on the claim page.
- [ ] Uniswap router + USDC + wrapped-native addresses resolved via Monskills and verified on-chain (recorded in README).
- [ ] Swap preview screen (amounts, price impact, slippage, min received, router, recipient, expiry).
- [ ] Swap execution + status tracking with finality labels.
- [ ] Guardrails: liquidity/price-impact check that disables USDC when unsafe; slippage guard; simulation; explicit confirm.
- [ ] `.monskills` metadata updated for any additional Monad addresses used.
- [ ] Tests: no MON↔USDC pool found (option hidden), expired quote, excessive price impact (blocked), slippage failure (reverts cleanly), swap after successful claim, gas-greater-than-benefit warning.

## Hard rule
If adding this destabilizes the core MON payroll flow at any point, revert this layer and ship Tier 0. The core claim-as-MON payroll is the submission; USDC swap is the bonus.
