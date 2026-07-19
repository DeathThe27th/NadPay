# NadPay — Build Spec 3: Dashboard & History features (frontend, contract untouched)

**This is an ADDITIVE spec. The core NadPay build works end to end and the contract is deployed, verified, and tested. DO NOT modify or redeploy `NadPay.sol`.** Everything here is frontend / read-only work over data the contract already exposes (rounds, allocations, `hasClaimed`, events `RoundCreated` / `Claimed` / `Reclaimed`). No new on-chain logic. Build and test all of this on **testnet first**, before any mainnet move — do not combine these changes with the network switch.

Data sources, in order of preference:
- Use the Monskills `indexer/` module to index the contract's emitted events into queryable history (idiomatic Monad approach).
- Fallback if the indexer is impractical in time: read events directly via RPC `getLogs` filtered by payer / round, and read current state via the existing view functions (`getRound`, `allocationOf`, `hasClaimed`, `getRecipients`).

There is already a working `/round/[id]` page showing per-recipient claim status. Reuse its logic/components where possible rather than rebuilding.

---

## Feature 1 — Surface per-recipient claim status on the main dashboard

Bring the round-detail claim status (which currently lives on `/round/[id]`) into the main dashboard, at the place where the payer creates/disburses payouts, so the payer sees status without navigating away.

- After a payer creates or selects a round, show inline: each recipient address, their allocated amount, and claimed / pending state, plus a progress summary (e.g. "6 of 10 claimed · 400 MON claimed / 1000 MON funded").
- Reuse the existing `/round/[id]` component if possible; keep `/round/[id]` working as the shareable standalone view.
- Live-ish: refetch on load and after any claim/reclaim action, or poll lightly.

## Feature 2 — Payer payout history

A history view listing every round the connected payer has created.

- Query all rounds where `payer == connectedAddress` (via indexer, or `RoundCreated` logs filtered by payer).
- For each round show: round id, date created, total funded, claimed vs pending count, MON claimed / MON remaining, deadline, and status — **Active**, **Fully claimed**, **Reclaimable** (deadline passed with funds unclaimed), or **Closed** (reclaimed).
- Each row links to its `/round/[id]` detail page.
- Sort newest first. Handle the empty state ("No payouts yet").

## Feature 3 — CSV import for the recipient list

Let a payer bulk-load their team instead of typing rows.

- Accept a CSV upload or paste with two columns: `address,amount` (amount in MON). Support an optional header row and ignore it if present.
- Parse client-side, validate each row: valid EVM address, positive numeric amount, no duplicate addresses. Show a clear per-row error list for anything invalid; do not silently drop rows.
- On success, populate the recipient list UI (the same list that feeds `setRecipients` / round creation) so the user reviews before saving/funding. Never auto-submit a transaction straight from a CSV — always show the parsed result for confirmation first.
- Show the computed total (sum of amounts) so the payer sees exactly what a round will cost before funding.
- Provide a downloadable sample CSV / format hint.

## Feature 4 — Dashboard summary totals

A small at-a-glance strip on the dashboard, computed from the payer's rounds (pure reads):

- Total paid all-time (sum of claimed across the payer's rounds).
- Number of rounds created.
- MON currently locked in unclaimed allocations across active rounds.
- Total pending claims (recipients across active rounds who haven't claimed).

Keep it lightweight; derive from the same data feeding history. Handle zero state cleanly.

## Feature 5 — Surface reclaimable rounds

Make it easy to recover unclaimed funds (uses the existing `reclaim` function — no contract change).

- On the dashboard and in history, visually flag rounds where the deadline has passed and funds remain unclaimed as **Reclaimable**.
- Put a **Reclaim** button directly on those rounds; on click, call the existing `reclaim(roundId)`, then refresh status to **Closed**.
- Only show the button to the round's payer and only when `block.timestamp > deadline` and there are unclaimed funds. Confirm before sending.

---

## Guardrails
- No contract changes. If any feature seems to need a contract change, stop and flag it rather than modifying/redeploying — it's out of scope for this spec.
- All reads must handle: wallet not connected, wrong network, payer with zero rounds, and RPC/indexer errors (show a friendly retry state, don't crash).
- Keep the existing MON claim flow and the `/claim/[roundId]` and `/round/[roundId]` pages working exactly as they do now.
- Maintain the existing visual identity; don't regress the design. Mobile-friendly (tested from iPhone).

## Deliverables
- [ ] Per-recipient claim status shown inline on the main dashboard (reusing round-detail logic).
- [ ] Payer history view (all rounds, statuses, links to detail).
- [ ] CSV import with validation, error reporting, total preview, review-before-submit, sample file.
- [ ] Dashboard summary totals strip.
- [ ] Reclaimable flag + inline Reclaim button (existing `reclaim`).
- [ ] Empty/error/wrong-network states handled for all of the above.
- [ ] Everything verified working on testnet before the mainnet move.

## Order
1. History (Feature 2) — establishes the round-querying/data layer the others build on.
2. Summary totals (Feature 4) — derives from the same data.
3. Claim status on dashboard (Feature 1) — reuse `/round/[id]`.
4. Reclaimable surfacing (Feature 5).
5. CSV import (Feature 3) — independent, can slot in anytime.
