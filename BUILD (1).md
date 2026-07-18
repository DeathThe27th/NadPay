# NadPay — Build Spec

One-click recurring crypto payroll on Monad. A founder presets a recipient list (address + amount), funds a payout "round" with one approval, and drops a single one-time claim link into their team chat. Each team member opens the link, connects their whitelisted wallet, and claims their preset allocation. Unclaimed funds are reclaimable by the creator after a deadline.

Built for the BuildAnything "Spark" hackathon (Monad). Uses **Monskills** for Monad deployment — the deploying agent should already have it installed (`npx skills add therealharpaljadeja/monskills`). Follow Monskills for all Monad-specific deploy/verify steps (chain id 10143, RPC, faucet, Sourcify verification).

---

## Core design decisions (locked)

- **One contract, many rounds.** Do NOT deploy a new contract per week. The single deployed contract holds many payout rounds, each with its own id, allocations, and claim window. This is simpler and more secure than redeploying.
- **Native MON** (Monad testnet). No ERC-20, no approve step on the token — funding a round is a payable transaction that sends MON into the contract.
- **Recipient list stored on-chain**, per payer, reusable across rounds.
- **Per-address, one-time claim** within a round. Only whitelisted addresses can claim, each exactly once, exactly their preset amount.
- **Creator reclaim** of unclaimed funds after the round deadline.
- **Amounts in MON**, not USD. (USD-pegging via price feed is explicitly out of scope / future work.)

---

## Smart contract: `NadPay.sol`

Solidity ^0.8.20. Native MON payouts. No external dependencies required (keep it dependency-light for a clean one-shot; OpenZeppelin ReentrancyGuard is fine to include if convenient).

### State

- A **Payer profile**: each payer (msg.sender) can save a reusable recipient template — a list of `(address recipient, uint256 amount)` pairs. This is the on-chain saved list so they don't re-enter it weekly.
- A **Round**: created when a payer funds a payout. Contains:
  - `id` (uint256, globally incrementing)
  - `payer` (address)
  - `totalFunded` (uint256)
  - `totalClaimed` (uint256)
  - `deadline` (uint256 timestamp — after this, payer can reclaim leftovers)
  - `closed` (bool)
  - mapping `allocation[recipient] => uint256` (how much each address may claim)
  - mapping `claimed[recipient] => bool`

### Functions

1. `setRecipients(address[] recipients, uint256[] amounts)`
   - Saves/overwrites the caller's reusable recipient template on-chain.
   - Require equal array lengths, no zero addresses, no zero amounts.

2. `getRecipients(address payer) view returns (address[], uint256[])`
   - Returns a payer's saved template (for the UI to prefill).

3. `createRound(uint256 claimWindowSeconds) payable returns (uint256 roundId)`
   - Reads the caller's saved recipient template.
   - Requires `msg.value == sum(template amounts)` — the payer funds the exact total (e.g. 1000 MON for 10×100).
   - Creates a new round, copies each recipient's amount into `allocation`, sets `deadline = block.timestamp + claimWindowSeconds`.
   - Emits `RoundCreated(roundId, payer, totalFunded, deadline)`.
   - Returns the new roundId (this is what the claim link points to).

4. `createRoundCustom(address[] recipients, uint256[] amounts, uint256 claimWindowSeconds) payable returns (uint256 roundId)`
   - Same as above but with an ad-hoc list passed inline (for one-off payouts without saving a template). `msg.value` must equal the sum.

5. `claim(uint256 roundId)`
   - Caller must have a non-zero `allocation` in that round and not have claimed.
   - Round must not be past deadline and not closed.
   - Marks claimed, increments `totalClaimed`, transfers their MON allocation to `msg.sender` (use call + checks-effects-interactions, guard reentrancy).
   - Emits `Claimed(roundId, recipient, amount)`.

6. `reclaim(uint256 roundId)`
   - Only the round's payer. Only after `deadline`. Transfers `totalFunded - totalClaimed` back to payer, marks `closed`.
   - Emits `Reclaimed(roundId, payer, amount)`.

7. View helpers for the UI:
   - `getRound(uint256 roundId)` → payer, totalFunded, totalClaimed, deadline, closed
   - `allocationOf(uint256 roundId, address who)` → uint256
   - `hasClaimed(uint256 roundId, address who)` → bool

### Security notes for the implementing agent
- Checks-effects-interactions on `claim` and `reclaim`; set `claimed=true` / update totals BEFORE the MON transfer.
- Use `(bool ok,) = payable(to).call{value: amt}(""); require(ok);` for transfers.
- Guard against reentrancy (ReentrancyGuard or a manual lock).
- `createRound` must reject if `msg.value` != exact sum (no over/underfunding).
- Reject empty recipient lists.

---

## Frontend

Next.js (App Router) + wagmi v2 + viem, connected to Monad testnet (chain id 10143, RPC from Monskills). Keep it a single clean app, mobile-friendly (Eric builds/tests from an iPhone). Fit the main view in the viewport — the Spark judging agent penalizes UI that looks like generic AI slop, so give it a distinct, intentional look (see design notes).

### Pages / flows

**1. Dashboard (`/`)** — the payer's home:
   - Connect wallet button.
   - "My team" section: shows the on-chain saved recipient list (from `getRecipients`). Add/edit/remove rows (address + amount in MON). Save writes `setRecipients`.
   - Shows the computed total (e.g. "Total per payout: 1000 MON").
   - Big primary action: **"Create payout"** → sets a claim window (default e.g. 7 days), calls `createRound` with `msg.value = total`. Wallet pops up to confirm + fund.
   - On success: display the generated **one-time claim link** (`/claim/{roundId}`) with a copy button and a "share" affordance. This is the link the founder drops in Discord.

**2. Claim page (`/claim/[roundId]`)** — what recipients open:
   - Connect wallet.
   - Reads `allocationOf(roundId, connectedAddress)`:
     - If > 0 and not claimed and round live → show "You've been allocated X MON" + a **Claim** button → calls `claim(roundId)`.
     - If already claimed → "You've already claimed."
     - If allocation is 0 → "This wallet isn't on the list for this payout."
     - If past deadline / closed → "This payout has closed."
   - Show a simple progress indicator: `totalClaimed / totalFunded` (e.g. "6 of 10 claimed").

**3. Round status (optional, `/round/[roundId]`)** — payer view of a round: who's claimed, how much is left, and a **Reclaim** button (enabled only after deadline) → calls `reclaim`.

### Design notes (avoid AI-slop look)
- Pick a distinct visual identity for "NadPay" — lean into Monad purple, a clean fintech/payroll feel (think a friendly Stripe-payout vibe, not a generic dashboard template).
- One clear primary action per screen. No clutter.
- Show the claim link prominently after creation — that's the hero moment of the demo.
- Consult the `frontend-design` skill if available for tokens/typography.

---

## Framing (for the submission writeup + demo video)

**Pitch it as a payroll / team-payout tool, NOT a privacy tool.**

- Problem (personal): "I'm a founder paying my Discord mods every week — 10 people, a fixed amount each. Sending 10 separate transactions every week is tedious and easy to fumble."
- Solution: "NadPay lets me preset my team once, fund the whole payroll with one approval, and drop a single link in our team channel. Each mod claims their own pay. Fund once, share a link, done."
- Why the pull model is better than a normal disperse/push: fund once, recipients claim themselves (they pay their own claim gas), and anything unclaimed is reclaimable — no funds lost to a typo'd address.
- Honest limitation to state plainly: only whitelisted addresses can claim, each once; this is a transparent, auditable payroll tool, not a mixer or privacy product.

**Monad is meaningful here because:** the recipient template and every payout round + allocation + claim live on-chain in the contract — it's the shared, auditable source of truth for who got paid, not a private database. Native MON is the settlement asset.

---

## Deliverables checklist (Spark submission)

- [ ] `NadPay.sol` deployed + **verified** on Monad testnet (Sourcify via Monskills). Record the contract address.
- [ ] Public GitHub repo with README (what it is, problem, solution, how to run, contract address).
- [ ] Hosted frontend (Vercel).
- [ ] 3-min demo video: create payout (fund) → copy link → 2–3 wallets claim → show progress fill → (optional) reclaim leftover.
- [ ] Social post about it (for the "Most viral" prize) — build-in-public angle fits Eric's CT presence.

## Build order (for the one-shot)
1. Write + compile `NadPay.sol`.
2. Deploy to Monad testnet using Monskills; verify; capture address + ABI.
3. Scaffold Next.js + wagmi wired to chain 10143 and the deployed address/ABI.
4. Build dashboard (recipients + create payout), then claim page, then round/reclaim view.
5. Polish UI to a distinct identity; ensure it fits the viewport and works on mobile.
6. Test end to end on testnet with 2–3 wallets before recording.
