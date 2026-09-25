# Nads2Pay — company payroll platform build brief

Repository: https://github.com/DeathThe27th/NadPay
Existing app: https://nad-pay.vercel.app/
Prepared: 23 September 2026
Baseline reviewed: commit `0b8bbbe`. Inspect current HEAD before making changes.

## Mission

Implement this brief in the existing repository. Turn Nads2Pay into an employer/employee/contractor payroll platform around its working funded-pot and claim model. Preserve the current design language, MON claims, atomic claim-as-USDC, existing contract addresses, old rounds, and claim URLs. This is an extension, not a rewrite or a generic HR dashboard.

The user wants working software, not just a plan. After the initial configuration intake, work through the phases autonomously, resolve routine choices, and give short progress updates. Keep unrelated work intact. Do not spend time building speculative features. Do not deploy contracts, spend mainnet funds, or replace the production site without existing explicit authorization; prepare a tested, reviewable result first. Local implementation and preview are authorized by this brief.

## 1. First actions: inspect, use MonSkills, collect configuration

1. Read AGENTS.md and inspect current code, git status, deployments, environment-variable names, and existing dependencies. Respect the repo's instruction to consult installed Next.js documentation before writing code against this version.
2. Use **MonSkills**, https://github.com/therealharpaljadeja/monskills. Locate its local installation first. Start with `monskill/SKILL.md`, then read only relevant topics: wallet-integration, indexer, concepts, addresses, gas, tooling-and-infra. Follow its current instructions; do not substitute the unrelated Monadix agent project. Use website fallback only if local skills are unavailable.
3. Verify the baseline inventory below against HEAD; reuse features already present. Record changed assumptions in a short implementation note.
4. BEFORE implementing integrations, ask the user ONCE for all missing configuration in one organized checklist. Discover existing usable settings by presence/name without printing their values. Explain which items are essential and which only gate privacy or fiat. Do not demand unrelated services.
5. Prefer credentials entered directly into ignored `.env.local` or the platform's secret manager. If the user supplies values, write them securely without echoing, quoting, logging, including them in command arguments visible in history, committing them, or repeating them in summaries. Never request a wallet seed phrase or personal private key. Never claim that pasting secrets into chat makes them invisible to the chat service.
6. Supply `.env.example` with names and placeholder descriptions only. Only intentionally public identifiers may have `NEXT_PUBLIC_` prefixes. Keep privileged database, email, jobs, and privacy credentials server-side.

Suggested coherent stack, subject to compatibility checks: existing Next.js/wagmi/viem UI; Para for sign-in and embedded/external wallets following MonSkills; PostgreSQL via Supabase for application records with server-verified identity and tenant authorization; Envio for chain indexing; Resend for transactional email; a durable jobs runner or an authenticated scheduled job plus database-backed outbox. Reuse existing configured equivalents. Do not create two competing identity systems: map the verified identity-provider subject to one internal user ID, and implement/test database access accordingly.

Initial configuration checklist:
- Auth provider project/public configuration and any required server verification credentials; allowed production/preview callback origins.
- Database project/connection and privileged backend credentials through secure configuration; migration access.
- Monad RPC endpoint(s), existing hosting access/configuration, app URL.
- Indexer project/API access and deployment start block after verification.
- Email provider key, verified sending domain/address, DNS access or exact records for the user.
- Jobs service secret or scheduler authentication, depending on selected implementation.
- Privacy: Unlink developer/API access, testnet setup and mainnet access status; alternatives only if supported by evidence.
- Fiat: target countries/currencies and provider sandbox credentials only after provider capability is verified. Fiat must not block core payroll.
Continue independent work if a provider is unavailable. Clearly distinguish a configured working integration from an adapter, mock, or external blocker.

## 2. Existing code to preserve

Reviewed files: `contracts/src/NadPay.sol`, `app/page.tsx`, `app/claim/[roundId]/page.tsx`, `lib/network.ts`, `lib/rounds.ts`, `components/shell.tsx`, `components/history.tsx`, `app/globals.css`.

Existing capabilities:
- `setRecipients`: reusable per-payer wallet/MON-amount template.
- `createRound`: exact MON funding using saved template.
- `createRoundCustom`: exact MON funding with supplied allocations.
- `claim`: one-time wallet-bound native MON claim.
- `claimAndSwap`: atomic MON-to-USDC conversion through configured Uniswap route; failed swap leaves allocation unclaimed.
- `reclaim`: employer recovers unclaimed funds after deadline.
- CSV import, quote/slippage checks, round history, summaries and recipient claim status.
- `/claim/{roundId}` and `/round/{roundId}` pages.

Baseline mainnet address in repository: `0x07324757Fd67FB597987635E1b7f1B767Bcd9494`, chain 143. This is a code-review observation, not fresh deployment verification. Verify chain, bytecode, explorer ABI and deployment details before interactions. Testnet configuration has a separate older contract without the atomic swap. Do not assume the two deployments have identical capabilities.

No company accounts, backend payroll database, employee membership workflow, email system or private salary settlement was found in the reviewed baseline. Recheck HEAD.

The current contract has no upgrade mechanism. Most account-platform work can reuse it unchanged. Privacy or additional token settlement requires a separately designed/deployed path; never silently point existing round IDs at a new contract.

## 3. Product flows and scope

### Identity and onboarding
- Entry offers Sign up / Sign in. Onboarding choices: Company/employer, Employee, Contractor.
- Use one underlying user identity. Membership type is per organization, allowing a contractor to work for multiple companies and an owner to also belong elsewhere. No duplicate credentials required.
- Employer creates company with name, slug, optional logo/domain and linked funding wallet. Prove funding-wallet control. A company display name alone is not verification.
- Employee/contractor verifies email, searches discoverable companies, chooses one, submits join request. Show identifying company details to reduce mistaken joins. Offer invite link/code as a shortcut.
- Search exposes minimal company profiles only; never rosters, emails, salaries, requests or balances. Rate-limit search/join actions.
- Request is pending until owner accepts/rejects. Deduplicate repeated requests. Pending users see status, not company internals.
- Acceptance creates employee/contractor access, never owner/admin access. Owner assigns compensation; employee cannot set their own salary.
- Require verified payout wallet before inclusion in a funded run. Support existing external wallets and chosen embedded-wallet path without breaking current users.
- Wallet-change requests require ownership proof and employer confirmation for future runs. Freeze wallet snapshots for already funded allocations; explain that those claims remain tied to the original wallet.

### Employer payroll
- People view: approved members, status, verified payout wallet and saved compensation; searchable by name/email/username, with CSV import adapted to resolve verified members.
- Employer edits amounts, saves a draft/template, reviews recipient count, total MON, claim deadline and fees, then clicks **Disburse payroll** and signs.
- Database saving is offchain; use `createRoundCustom` for a reviewed draft when appropriate, avoiding an unnecessary template-save transaction. Existing onchain template flow remains compatible.
- Emails/usernames are selection labels. Resolve to stable member IDs and verified wallets server-side; contract inputs are wallets and amounts, never personal identifiers.
- Snapshot recipients, amounts, token, wallets, schedule period and request IDs before signing. Server validates ownership, active membership and amounts. No frontend-submitted company ID can bypass authorization.
- Persist submission intent, track pending transaction, then independently verify a successful receipt, network, contract, payer and allocations before marking funded. Do not trust a browser success callback.
- Recover confirmed submissions even if the browser closes. Deduplicate app submissions with database uniqueness/locking; explain that the existing contract itself permits multiple distinct rounds. A retry after timeout must reconcile first, not blindly fund again.
- A company owner removing an employee cannot revoke their existing onchain entitlement. Removal only affects future drafts/access to company data.

### Employee claim flow
- Employee dashboard shows current company, claimable allocations, deadline, payment history and clear pending/claimed/expired states.
- Clicking a payment opens the existing claim page, preserving MON and atomic USDC options and simulations.
- A shared claim link is not authorization; the funded wallet controls the claim. Account sign-in does not replace wallet authorization. Keep legacy wallet-only claim URLs working.
- Displayed claimable balance is a reconciled sum of valid unclaimed, unexpired allocations; recheck the contract before signing. Database rows cannot create money.
- Employee claims still need wallet signing and gas under the existing public contract. Make funding/gas requirements clear; do not silently add custodial signing.
- Current contract claims one round at a time. Do not advertise a one-signature Claim all without implementing compatible execution.

### Monthly payroll: scheduled preparation, manual funding
- Save pay frequency/date, timezone, next due date and default amounts. Handle month-end dates explicitly.
- Generate one editable draft per company/schedule/period and notify employer. Require deliberate action for an additional supplemental run.
- Employer reviews and signs each period. No unattended debit, session key, expiring spending delegation or custody is needed.
- Call this scheduled payroll/manual disbursement, not automatic money delivery. Missing employer approval leaves the run unfunded.

### Contractor requests
- Approved contractor submits amount/token, reason and optional invoice attachment to a company.
- States: submitted, approved-unfunded, rejected, included-in-draft, funded/claimable, claimed, expired/reclaimed as applicable.
- Owner can use **Approve & fund** for a one-off round or include the request in payroll. Wallet signature remains necessary. Cancelled signatures leave approval separate from funding.
- Prevent the same request from being funded twice through overlapping drafts. Attachments are private, size/type limited, and available only to authorized parties.

### Email, reports and audit
- Send membership decisions, employer payday reminders, payment-ready messages after confirmed funding, claim receipts, and approaching-expiry reminders.
- Funding email says **Your payment is ready to claim**, not money already received. Link to sign-in with safe return path to the relevant claim; never email bearer spending secrets.
- Avoid including salary in email by default. Use a transactional outbox, unique notification keys, retry/backoff and delivery-status tracking.
- Employer sees funded, claimed, outstanding, expired and reclaimed separately, plus payroll periods, employee breakdown and requests. Do not label all funded MON as paid to recipients.
- Record actual USDC output when claimed as USDC; avoid counting both `Claimed` and `ClaimedAsUsdc` as two payments.
- Export authorized CSV and printable/downloadable payment statements with period, funding/claim dates, asset amounts and transaction reference. MON-to-USD estimates must carry valuation timestamp and not masquerade as actual USDC paid.
- Audit owner membership actions, compensation/wallet changes, draft changes, submissions and outcomes. Append-only application audit access; no user-editable audit rows. Do not advertise cryptographic immutability of a normal database log.
- No automatic tax engine or statutory filings. Optional manual adjustment descriptions may be recorded without claiming legal tax compliance.

## 4. Architecture and data rules

Application records live offchain; public round settlement lives in the existing contract. Private settlement, if verified, has its own integration path. Use a settlement interface with explicit capabilities, not a speculative generalized framework.

Minimum records: users, verified wallets, organizations, memberships/join requests, compensation revisions, payroll schedules, payroll runs, immutable funded allocation snapshots, payment requests/attachments, transaction attempts, indexed chain events, notification outbox, audit entries.

- Every company-owned row carries organization ID and is authorized server-side. Employee reads are limited to their own records; pending memberships have no financial access.
- Stable internal IDs are identity keys. Emails can change and are not contract recipients. Validate verified identity tokens; never trust identity headers supplied by clients.
- Amounts use integer base units/decimal-safe parsing, never JS floating-point arithmetic. Distinguish MON (18 decimals) from verified USDC decimals.
- Settlement identity is `(chainId, contractAddress, roundId, wallet)`, not bare round ID. Store transaction hashes and confirmation block references.
- Index events from verified deployment blocks with restartable checkpoints, backfill and reorg handling. Dedupe by chain/transaction/log index. Verify successful receipts and appropriate chain finality before notifications.
- Existing history enumerates all rounds through multicall. Replace dashboard-wide enumeration with indexed queries, retain direct contract reads as verification/fallback where sensible. Do not put private user data in a publicly accessible GraphQL index.
- Keep private salary metadata out of logs, analytics, exception payloads, browser caches shared between accounts and public storage. Apply least-privilege access and backup/recovery practices.
- Keep employer keys in their wallets. Core app jobs do not hold a payroll spending key. Privileged backend credentials never ship to the browser.
- Claim expiry is real: default current UI is seven days with other options. Clearly show it, send reminders, and never count expired allocations as claimable. Expiry is not proof a salary obligation disappeared. Reissued payments need explicit linkage and employer action.

### Monetary scope
Preserve current **MON-denominated** salaries for the initial public payroll release. USDC received depends on conversion at claim time. Never display a guaranteed dollar entitlement backed only by fixed MON.

If product needs fixed-dollar payroll, document a separate USDC-funded contract/path and its MON conversion/claim requirements. Do not replace the existing atomic swap or silently expand contract scope. Privacy prototype can use supported ERC-20 assets, with funding denomination clearly separated from public MON rounds.

## 5. Genuine private payroll: research and prototype early

Privacy is a priority, not an optional cosmetic toggle. Current contract recipients and amounts are public through inputs, getters and events. Solidity `private` storage does not make chain data confidential. Do not route a public salary allocation into a privacy pool afterward and claim the original salary was hidden.

Research starting points, checked 23 September 2026; verify current SDK/deployment facts again:
- https://docs.unlink.xyz/supported-chains — Monad testnet available; mainnet requires access grant.
- https://docs.unlink.xyz/how-unlink-works — internal transfers hide sender/recipient/amount; public deposits and withdrawals expose amounts, public withdrawal destinations are visible; external execution exposes call details.
- https://docs.unlink.xyz/trust-model — browser spending keys can remain client-held; hosted Engine holds viewing/nullifying keys. Privacy from public observers is not secrecy from all providers.
- https://anoma.net/blog/anomapay-is-now-live-on-monad — announces MON/USDC support and private payment/request links. Verify integrator SDK/API availability independently; a live app is not automatically an embeddable payroll SDK.

Use Unlink as first integration candidate, not a foregone final selection. Read SDK and prove supported operations before designing an adapter. Obtain testnet access and identify mainnet access, fees, token support, relay funding, key recovery and trust boundaries.

Target: employer funds a private system, privately allocates to employees, employees see only their entitlement and can claim/withdraw. Do not publish individual salary values, recipients or employer-to-employee mappings in NadPay events or inputs.

Critical proof: does the protocol support our exact funded-pot, delayed-claim, deadline and employer-reclaim semantics? A completed private transfer to an employee is already employee-owned and cannot be assumed reclaimable by the employer. Prototype this distinction; do not fake escrow with a database balance or seize employee keys. If escrow requires new resource logic/contracts, design and test it separately. If unavailable, describe the real alternative as private distribution followed by employee withdrawal and flag the product difference rather than quietly changing the promise.

Produce a short privacy decision document with actual tested results, public data at each step, provider visibility, custody/recovery, pending access gates and recommended architecture. Integrate a working testnet path if feasible. Keep environments unmistakable. Never simulate production privacy or mark it complete without evidence. Preserve existing public contracts and rounds. Prevent retries/dual paths from paying the same payroll twice.

## 6. Fiat scope

Keep fiat out of the core critical path, but investigate the real off-ramp path. Confirm target countries/currencies with user; Nigeria/NGN is a candidate, not an assumed sole market. Verify provider support for actual Monad assets/network, bank payouts, onboarding/KYC, limits, fees, refund behaviour and private-protocol source acceptance.

If a supported sandbox is accessible, implement quote, provider-hosted identity verification, payout initiation, signed webhooks and status tracking. Existing `claimAndSwap` pays the caller; it cannot simply redirect salary to a provider. An initial fiat path may require claim-to-wallet followed by an authorized provider transfer. State this clearly; never imply atomic bank settlement.

Separate crypto claim success from bank payout success. Reconcile webhook duplicates/timeouts and refunds without reopening an already consumed onchain claim. Hide unavailable fiat choices or label limited preview honestly. No pretend bank transfers and no mandatory new bridge without an explicit architecture decision.

## 7. UI/UX: follow existing patterns

Preserve existing branding, landing treatment, Space Grotesk/Geist typography, lavender workspace background, white rounded editor/history cards, dark navy payout console, purple actions, status pills and receipt-ticket claim styling. Reuse `Shell`, existing CSS tokens/components and interactions. Inspect rendered desktop and mobile baseline before changing layout. Do not replace with a generic template, introduce a new color scheme or rebuild the landing for its own sake.

Employer navigation: Overview, People, Payroll, Requests, Reports, Settings. Employee/contractor navigation: My payments, Requests where applicable, Profile. Use the same shell with compact role-appropriate navigation. No separate treasury module, complex finance-role editor or multi-approver workflow in this MVP.

Employer overview: next payday, required MON, wallet balance, latest run progress, pending join requests and payment requests. Employee view: claimable payment cards, deadline, claim action and history. Pending onboarding is a clear dedicated state.

Use person names/emails in normal payroll editing with wallet details available for review. Explain public/private settlement before confirmation. Preserve recognizable claim screen and old URLs. Accessible labels, keyboard focus, readable errors, mobile-friendly tables/cards and explicit loading/empty/error states are required. No demo amounts in real accounts.

## 8. Implementation phases

A. Inspect baseline, read MonSkills, collect configuration, capture UI reference, record architecture decisions. Start privacy feasibility in this phase.
B. Add auth, companies, membership approval, verified wallet linkage and authorization migrations.
C. Add People/compensation, payroll drafts, immutable snapshots, monthly scheduling and employer-signed funding using existing contract. Preserve legacy claims.
D. Add indexer/reconciliation, employee balances/history, email outbox, requests, exports and audits.
E. Finish verified privacy prototype/adapter and testnet flow; report access or semantic blockers explicitly. Implement fiat sandbox only if provider is actually available.
F. Run focused validation, inspect rendered UI, fix defects, prepare deployment instructions/migrations and a concise handoff. Continue core work even if privacy/fiat access is blocked, but never silently drop privacy research.

## 9. Validation and acceptance

Use meaningful tests for money/authorization boundaries, not large suites mirroring trivial UI code. Run existing contract/swap tests and build/type checks. Add focused integration tests for:
- Company A cannot read/change Company B; employee cannot read another employee's salary or self-approve membership.
- Owner approves verified employee; employee sees own payments only. Profile wallet edits cannot rewrite funded allocations.
- Monthly job creates one draft and emails once; no money moves before employer signature.
- Browser close/transaction timeout/retry reconciles confirmed funding without duplicate app disbursement.
- Funding triggers claim-ready email only after valid confirmation. Failed signatures/transactions do not create a fake balance.
- MON claim and USDC claim stay functional, failed swap preserves entitlement, duplicate claim fails.
- Expired/reclaimed funds disappear from claimable totals; removal from company does not revoke a funded claim.
- Dual claim events do not double-count payments; indexer restart/backfill and webhook replay are safe.
- Contractor request is funded once and approval is distinguishable from funded state.
- Public histories remain accessible to legacy wallets; new accounts can explicitly associate historical rounds with verified ownership without exposing other data.
- Real UI smoke test: employer signup → company → employee request → approval → payroll draft → signed test funding → employee claim → email → report.
- Privacy proof uses real testnet settlement and documents observable chain data; fiat, if present, uses actual provider sandbox results.

Use mocks only in tests. Never fund mainnet tests without explicit authority and a stated bounded amount. No broad re-testing once the concrete risks are covered. Inspect desktop/mobile rendered screens and resolve obvious regressions.

## 10. Deliverables and completion report

Deliver implemented code in the repo, migrations/access policies, indexer/jobs configuration, environment template, setup and deployment instructions, privacy decision/prototype, focused validation results, and screenshots or usable preview of key journeys. Keep changes reviewable in an isolated branch if appropriate.

Finish with: what works, what existing behaviour was preserved, commands/tests actually run, what remains blocked by provider access, and exact user actions needed. Distinguish implemented, verified, prototype, and unavailable. Do not claim a security audit, mainnet deployment or successful real payment unless actually performed.

Start by inspecting the repository and giving the single consolidated configuration checklist. Then implement.
