
# NadPay — Build Spec 4: Mainnet migration

**Apply only after Build Specs 1–3 are complete and fully tested on testnet.** This moves NadPay from Monad testnet to Monad mainnet. It is mostly config + address re-resolution + a fresh deploy — NOT a rewrite. The contract source (`NadPay.sol`) does not change; it is redeployed to mainnet.

**On mainnet the funds are real.** Every address must be re-resolved and verified; a wrong router/token/RPC address loses real MON. Do not carry over any testnet address. Do not take any address (RPC, router, USDC, WMON, explorer) from memory or from web search — resolve them through **Monskills** official sources and verify on-chain.

## Known network facts (still verify via Monskills before use)
- Monad **mainnet chain ID: 143** (hex `0x8f`), native gas token **MON**.
- Resolve the mainnet **RPC URL**, **explorer** (for verification + receipt links), **Uniswap router**, **USDC token address**, and **wrapped-native (WMON)** via Monskills `addresses/` and `tooling-and-infra/`. Verify each contract's code on-chain before wiring it in.

## Step 1 — Make the network config env-driven (if not already)
Refactor so ALL network specifics come from env/config, not hardcoded, so testnet and mainnet are a config switch:
- `CHAIN_ID`, `RPC_URL`, `EXPLORER_URL`
- `NADPAY_CONTRACT_ADDRESS`
- `UNISWAP_ROUTER_ADDRESS`, `USDC_ADDRESS`, `WMON_ADDRESS`
Keep a testnet config and a mainnet config side by side so you can run either without code changes. Default the deployed production app to mainnet; keep testnet available for safe demos.

## Step 2 — Deploy the contract to mainnet
- Deploy the unchanged `NadPay.sol` to Monad mainnet (chain 143) via Monskills. The deployer wallet needs **real MON** for gas (no faucet).
- **Verify** the contract on the mainnet explorer (Sourcify via Monskills).
- Record the mainnet contract address + ABI. Put them in the mainnet config and the README.

## Step 3 — Re-resolve the swap-layer addresses for mainnet
- Via Monskills, get the **mainnet** Uniswap router, USDC, and WMON addresses. Verify code on-chain.
- Update the claim page's swap config with these mainnet values. Do NOT reuse testnet swap addresses.
- Re-check that a real MON↔USDC pool exists with usable liquidity on mainnet. If price impact for realistic claim sizes is high, keep the tight min-received guard (fail-safe revert) and consider disabling the USDC option until liquidity is adequate — never push a bad swap with real funds.

## Step 4 — Point the frontend at mainnet
- Set the active config to mainnet (chain 143, mainnet RPC, mainnet contract address/ABI, mainnet swap addresses).
- Update wallet-connect / network-guard to expect chain 143 and prompt users to switch to Monad mainnet.
- Update all explorer links (tx receipts, contract) to the mainnet explorer.
- Update `.monskills` metadata to reflect mainnet networks/addresses.

## Step 5 — Small-amount end-to-end verification on mainnet (REQUIRED before real use)
Before any real payroll run, do a tiny live pass with real (small) MON:
1. Set a recipient list with one or two addresses and a tiny amount (e.g. 0.1 MON each).
2. Create a round (fund it), confirm the round appears with correct totals and deadline.
3. Claim as **MON** from a second wallet — confirm receipt on the mainnet explorer.
4. Claim as **USDC** with a small amount — confirm the swap executes within slippage, or that it fail-safes if liquidity is thin.
5. Let a round's deadline pass (or test with a short window) and confirm **reclaim** returns unclaimed funds.
6. Confirm history, dashboard totals, and claim-status all read correctly from mainnet.
Only after this passes should any real payroll amounts be used.

## Step 6 — README / framing
- State: "Deployed and verified on Monad mainnet (chain 143) — the contract is live and can be used by teams on Monad today." Include the mainnet contract address + explorer link.
- Keep the framing factual: it demonstrates a working, mainnet-deployed tool. Do not overstate adoption.
- Note the swap layer is a frontend Uniswap integration (two transactions) and lists MON / USDC only.

## Guardrails
- Contract source unchanged from the tested testnet version — only the deployment target differs. If you find yourself editing `NadPay.sol`, stop: that means it needs re-testing, which is out of scope here.
- Every mainnet address resolved via Monskills + verified on-chain. No memorized or web-sourced addresses.
- Keep the tight min-received slippage guard on the swap; real pools carry sandwich/slippage risk.
- Keep testnet config available as a fallback for safe demos.
- Do not combine this migration with new feature work — this step only changes the network and addresses.

## Deliverables
- [ ] Env-driven network config (testnet + mainnet side by side).
- [ ] `NadPay.sol` deployed + verified on Monad mainnet (chain 143); address + ABI recorded.
- [ ] Mainnet Uniswap router / USDC / WMON resolved via Monskills, verified, wired into the swap layer.
- [ ] Frontend pointed at mainnet; network guard + explorer links updated; `.monskills` metadata updated.
- [ ] Small-amount live end-to-end pass completed (create, claim MON, claim USDC, reclaim, history reads).
- [ ] README updated with mainnet address + accurate framing.
