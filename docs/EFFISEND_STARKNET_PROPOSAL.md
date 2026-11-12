# Effisend on Starknet: integration proposal

- **Date:** 2026-11-12
- **Status:** Proposal. Nothing is implemented, installed, or deployed.
- **Axis:** Starknet Pay, the Starknet branch of Effisend's "<Network> Pay" payment requests.
- **Companion:** the Starknet changes behind this proposal are in [STARKNET_UPDATES.md](STARKNET_UPDATES.md).
- **Visibility:** public. No secret values, personal data, test-user identifiers, or internal hostnames.
- **Decisions already taken by the owner (2026-11-12):** wallets are custodial, server-side, and managed with AWS KMS; no face image is ever stored and AWS Rekognition is used; everything is public; Effisend is the main project.

**Status of each claim.** *Confirmed*: read in Effisend's code or in the starknet.js 10.8.0 typings. *Checked*: read from an external source on 2026-11-12. *Report*: stated in the Starknet document supplied for this review, not verified. *Design*: a proposal, not yet verified to work. *Pending*: needs a fact or a decision.

## 1. Summary

Effisend already accepts and confirms payments on Starknet. A merchant or a chat request names a recipient, a token, and an amount; the payer sends a transfer; the server counts `Transfer` events to the recipient across several RPC operators and marks the request paid.

This proposal extends that path in six steps, each shippable on its own:

1. Attribute every payment to one order, not to an amount.
2. Settle through a Cairo checkout contract that emits an order event.
3. Let a payer without gas token pay (sponsored fees).
4. Offer private payments for customers and merchants.
5. Add spending limits at the account level, and safe agent tools.
6. Package it as a merchant SDK: simple private payments, simple onboarding, and multichain payment rules that settle on Starknet.

Each step uses a capability present in starknet.js 10.8.0 or named in the Starknet report, and each has its own acceptance test on testnet before any mainnet use.

## 2. Starting point (Confirmed)

| Area | What exists today |
|---|---|
| Network | Starknet is one of Effisend's networks. Seven tokens are configured: ETH, STRK, WBTC, USDC, USDT, DAIv0, DAI. Explorer: Voyager. |
| Balances | Browser-first reads through `StarknetChain`: starknet.js 10.8.0, one provider per endpoint, `blockIdentifier: "latest"`, 5 s timeout, per-token fallback to the next endpoint, then to the server. A failed read never shows as zero. |
| Payment request | The chat agent creates a request (`create_payment_request`) for EVM, Hedera, and Starknet. A widget shows it and polls for payment. |
| Payment detection | A stateless server route sums `Transfer` events to the recipient since the request was created (`starknet_getEvents`), reads several operators, and takes a quorum. The widget decides "paid" by comparing the received amount with the requested one, within a few cents. |
| Point of sale | `/pos` serves receive-only master wallets, including one on Starknet. |
| Send and receive | Send detects the network from the address, with a native-token reserve for fees. Receive shows the Starknet address. |
| Analytics | A public `/analytics` page built from verified on-chain data. |
| Analogue on other chains | Solana Pay (a public route with a URL and a reference). On Robinhood Chain, a Checkout contract with an operator-signed order; the server route only forwards `prepare`, `pay`, and `status`. |
| Networks | Ten: Base, Monad, Hedera, Solana, Starknet, Ethereum, Polygon, Avalanche, Arc, and Robinhood Chain. Four chain types: EVM, Solana, Hedera, Starknet. |
| Product surface | A wallet (send, receive, swap, bridge, cards), a chat agent, a point of sale (`/pos`), public analytics, receipts, event passes (NFTs on eight networks), and 23 server routes that mostly forward to separate backend services. |
| Key custody | Custodial and server-side. The client keeps only a session identifier. Wallet keys are stored encrypted with AWS KMS, and a backend function decrypts them to sign (documented in the project's engineering notes; the function's code is not in the app). Sending asks for a PIN first. |
| Request security | Every `/api` call is checked for an HMAC signature and an allowed origin. The signing secret ships in the client bundle, so it slows casual abuse only. Authorization per user is the backend's job. No rate limiting was found in the app layer. |
| Tests | The app has no automated tests. The EVM Checkout contract has Hardhat tests and has not been audited (documented). |

A Starknet send is an ordinary account transaction (see section 2.1). The send screen keeps a 0.05 STRK reserve for fees, so today the user pays the gas.

### 2.1 How a Starknet send runs today (Confirmed in the backend source)

1. The app checks the PIN, then calls the execute-transaction backend function with the user, chain type, token, amount, and recipient.
2. The function loads the user's record, finds the chain and token in its own configuration, and rejects unknown tokens.
3. The user's Starknet private key is stored KMS-encrypted. The function decrypts it with a direct KMS decrypt call, keeps it in memory for that invocation, and uses it as the signer of a starknet.js 10.8.0 `Account`.
4. It builds one ERC-20 `transfer` call and sends it with `account.execute`, with fee options `maxBlocks` and `minTxsNecessary` (both exist in the 10.8.0 typings).
5. It reads the account nonce once, from the first endpoint that answers, and reuses that nonce on every retry. If an endpoint accepted the transfer but its reply was lost, a retry through the next endpoint cannot produce a second payment: the chain includes only one. This guard exists in the main function; a second KMS variant of the function does not contain it. *Pending*: which of the two is live.
6. Endpoints come from the central health-checked registry. A paid provider is appended last and is reached only if all free endpoints failed.
7. The function returns the transaction hash. The app then waits for the receipt.

Observations: no paymaster, outside execution, or typed data is used; fees are paid by the user's own account. The function takes the user identifier from the request body, so its protection depends on who can invoke it and on the PIN check upstream. *Pending*: the function's invocation policy.

## 3. The gap

- **Attribution.** The payment is recognized by recipient, token, and amount. Two customers who pay the same amount to the same address within the same window cannot be told apart. A refund or a receipt cannot be tied to one order.
- **Fee friction.** A payer needs STRK for gas even when paying in USDC.
- **Public payments.** Every Starknet Pay transfer exposes the payer, the merchant, and the amount on a public explorer.
- **Weak guard on funds movement.** Limits and confirmations for agent-initiated transfers live in server code only.

## 4. Proposed integrations

### P1. Per-order attribution (first step)

- **What:** every Starknet Pay request carries a unique order reference that the confirmation matches exactly.
- **Design A (no contract):** a unique receiving address per order, derived from the merchant account and an order counter, and swept to the merchant after confirmation. The confirmation then matches by address instead of by amount.
- **Design B (contract):** see P2. This is the stronger option.
- **Design C (private):** a shadow account per order, if confirmed. See P4.
- **Acceptance:** two concurrent requests for the same amount and the same merchant are each marked paid by their own payment only. Tested on testnet.
- **Status:** Design.

### P2. Starknet Checkout contract (Cairo)

- **What:** a small Cairo contract that receives the payment for an order and emits an event with the order identifier, token, amount, payer, and merchant. The server confirms by reading that event.
- **Model:** the Checkout contract Effisend runs on Robinhood Chain. The server signs the order, and the contract checks that the balance rises by the exact amount. Whether replaying a settled order is a no-op in that contract is not verified; the Starknet contract must make it so and prove it with tests.
- **Tooling:** Cairo 2.x and Starknet Foundry (Report) for tests. Account and order signatures use Starknet typed data (`typedData`, `getTypedData`, `validateTypedData`; Confirmed in the typings).
- **Why:** a single event per order removes the amount-matching heuristic and gives an auditable receipt (link to the transaction and the event).
- **Acceptance:** unit tests for double settlement, wrong token, wrong amount, and expired order; a testnet deployment; a quorum read of the event across operators.
- **Status:** Design. Audit before mainnet.

### P3. Sponsored fees for the payer

- **What:** the payer pays in a stablecoin without holding STRK. The fee is sponsored.
- **Basis:** the 10.8.0 typings include `PaymasterRpc`, `estimatePaymasterTransactionFee`, `buildPaymasterTransaction`, `executePaymasterTransaction`, and `assertPaymasterTransactionSafety`. Outside-execution types (`OutsideExecution*`) let a third party submit a call that an account pre-authorized.
- **Custody fit:** Effisend wallets are custodial and the server signs, but the user pays gas today (the send screen reserves STRK for fees). Sponsorship is therefore a new feature, not an existing capability. It also matters for external Starknet wallets that pay a Starknet Pay QR.
- **Where it fits:** the signer is an `Account` built by the backend function, and `AccountOptions` accepts a `paymaster` (typings), so sponsorship is a change in how that account is constructed. *Design*: not tested.
- **Controls:** per-user and per-day sponsorship caps, `assertPaymasterTransactionSafety` before every submission, and an allowlist of the checkout contract and tokens.
- **Acceptance:** an account with no STRK completes a USDC payment on testnet; abuse tests hit the caps.
- **Pending:** a paymaster provider, its cost, and the RPC spec version it needs.

### P4. Private payments (exploratory)

- **What:** a customer pays privately, and the merchant receives without exposing the customer's wallet.
- **Basis:** `strk20PrepareInvoke`, `strk20InvokeTransaction`, `strk20Balances`, and `strk20ShadowAccountCommitment` are in the 10.8.0 typings. The report describes notes, viewing keys, audit mechanisms for AML and the Travel Rule, and shadow accounts that are deterministic per dApp and nonce with no provable link to the funding wallet. A shadow account per order also solves P1 attribution.
- **Constraints:** the report describes `SetViewingKey`, `OpenChannel`, `UseNote`, and `CreateNote`, which do not appear in the typings. The collect-policy value `exact` is also absent from the typings. Wallet API 0.10.4 is not verified.
- **Needs:** a legal and product decision first, and a read of the official STRK20 documentation.
- **Acceptance:** a private payment on testnet that the merchant can confirm and audit with a viewing key.
- **Status:** Not for implementation until the documentation is read.

### P5. Account-level spending limits and agent safety

- **What:** a second guard for funds movement, independent of server code.
- **Design:** Starknet accounts are contracts, so a per-user account class can enforce a per-transaction cap and a daily cap on-chain, besides the server limits. *Design*: needs an account contract, an audit, and a migration path from the current account class.
- **Agent:** the chat agent runs in a separate backend service, so its tools and money guards were not reviewed here (*Pending*). The app only receives payment requests and orders from it. The proposal is that the agent keeps its Starknet tools to request creation and status. Any tool that moves funds sits behind code-level guards (limits, a confirmed user step, no automatic retry with different amounts or networks), not behind the prompt.
- **Not recommended now:** AgentSTARK or ZKML agents that run without human supervision (Report).
- **Acceptance:** a transfer above the cap is rejected by the contract even if the server asks for it.
- **Status:** Design.

### P6. Receipts and public metrics

- **What:** a receipt page for each Starknet Pay order with the order event, the transaction, and the finality state. A public metrics block for Starknet Pay volume on `/analytics`, from verified on-chain data only.
- **Dependency:** P2 (the order event).
- **Pending:** the finality states the RPC reports for the pinned spec version, and which one to wait for per amount.

### P7. Merchant SDK: private payments, onboarding, and multichain rules

- **What:** a public SDK and documentation so a merchant can accept Effisend payments without the chat agent, in three parts.
- **Basis:** the same RPC client design as the wallet (timeouts, failover, quorum), the checkout contract (P2), sponsored fees (P3), private payments (P4), and the existing bridge route to Starknet.

**P7.1 Simple private payments**
- A merchant calls one function to create an order and receives a payment link and a QR. The customer chooses "private" or "public" in the payment screen; the merchant does not handle notes, channels, or viewing keys.
- The SDK hides the STRK20 steps behind the order. The merchant receives the confirmation event and, if enabled, a viewing key scoped to that merchant for accounting and audit.
- Private mode is off until P4 is cleared (legal review and the official STRK20 documentation). Public mode works from P2.
- *Acceptance:* a sample merchant page takes a testnet payment in both modes; the merchant never sees the customer's wallet in private mode.

**P7.2 Simple onboarding**
- A merchant registers with a name, a payout preference (token and network), and a receiving account. No seed phrase and no key handling: accounts are custodial and server-side (decided), and KMS-managed.
- The merchant gets a test mode first (testnet, test keys) and a live mode after an explicit switch.
- Business identity checks (KYB) are a legal and product decision. *Pending*: the minimum required per jurisdiction.
- Face verification is for customers who pay in the Effisend app, not for merchant onboarding. No face image is stored (decided).
- *Acceptance:* a new merchant reaches a first testnet payment in a few steps, without reading Starknet documentation.

**P7.3 Multichain payment rules that settle on Starknet**
- The merchant sets rules once: accepted networks and tokens, the settlement token, a minimum and maximum per order, and what happens when the customer pays from another chain.
- The customer pays from any supported chain. The route converts and bridges the funds, and the order settles on Starknet through the checkout contract. The merchant sees one confirmation, one order, and one settlement.
- Effisend already supports Starknet in its bridge flow (a bridge route to `STARKNET_MAINNET` in the quote code), and its payment requests cover EVM chains, Solana, Hedera, and Starknet. *Pending*: bridge fees, route availability, and settlement time per source chain. These must be measured before the rules promise anything.
- Rules are enforced in code and in the contract, not in a prompt. A payment that matches no rule is refused with a clear reason, and funds are not left in transit: either the order settles or the route returns them.
- *Acceptance:* a testnet order paid from a second chain settles on Starknet; a payment outside the rules is refused; an interrupted bridge never leaves the order marked paid.

**SDK shape (Design)**
- A small TypeScript or JavaScript package: `createOrder`, `getOrder`, `onPaid`, `setRules`. A hosted payment page and a QR for merchants who do not want to write code.
- Server-side calls need a merchant API key kept on the merchant's server. The browser never receives it. Effisend has no per-merchant or per-user authentication in its app layer today (it uses a shared signing secret that ships in the client), so merchant authentication, key issuing and revocation, and rate limits must be designed as part of this SDK.
- The package follows the 7-day release age, ships with tests and typings, and has zero known `npm audit` findings.

### P8. Watchlist (no action now)

- **strkBTC and Bitcoin designs (BitVM, OP_CAT, ColliderVM):** possible BTC-denominated payments. WBTC is already a configured token. (Report)
- **SNIP-36 proofs in transactions:** a possible way to prove a claim inside a transaction. Needs RPC 0.10.1 or later (typings). (Report)
- **SNIP-37 and Volition:** possible lower fees for small payments; the report states the granularity inconsistently. (Report)
- **Post-quantum signatures (Falcon-512, 2027 target):** a new account class would be needed. (Report)
- **starknet.js 11.x:** published; not evaluated. `latest` is 10.8.0.

## 5. Order of work

| Phase | Content | Needs first |
|---|---|---|
| A | P1 attribution (Design A) and P6 receipts without the order event | Nothing |
| B | P2 checkout contract on testnet, then audit | Phase A tests |
| C | P3 sponsored fees | A paymaster provider; Phase B contract allowlisted |
| D | P7.1 and P7.3 merchant SDK (public mode, multichain rules) | Phases A and B; bridge measurements |
| D2 | P7.2 onboarding | Legal decision on merchant checks |
| E | P5 limits and agent guards | An account-contract design and audit |
| F | P4 private payments, then P7.1 private mode | Legal review; official STRK20 documentation |

Every phase: its own branch and review, testnet first, zero lint errors and warnings, zero `npm audit` findings, new versions only after the 7-day release age, and no commit without owner approval. Tests that move funds use only the owner's designated test account and wallets.

## 6. Constraints

- **Custody:** AWS KMS does not offer the STARK curve (*Checked*, 2026-11-12). Effisend does not use KMS to sign. It stores each wallet key encrypted with KMS and decrypts it inside the backend function (section 2.1), so the missing STARK curve is not a blocker: Starknet signs as a normal account. The tradeoff is that the plaintext key exists in function memory during each send. Moving signing into a hardware-backed signer with STARK-curve support would remove that, and is a separate decision.
- **Biometrics:** the owner's decision is that no face image is stored and AWS Rekognition is used. The app calls a separate face service, and the word Rekognition does not appear in the app code, so this was not verified in code. Rekognition collections store face vectors, not images (*Checked*, 2026-11-12). Whether vectors count as "stored" is open and needs legal review.
- **RPC:** paid RPC providers stay server-side and are used only after free ones fail.
- **Secrets:** no key, token, or credential appears in this repository or its documents.

## 7. Risks and open items

- The Starknet report's claims are unverified (see [STARKNET_UPDATES.md](STARKNET_UPDATES.md), section 6).
- A checkout contract holds or routes funds. It needs tests, an independent audit, and a pause or upgrade policy before mainnet.
- Sponsored fees invite abuse without caps.
- Multichain settlement depends on the bridge and on the swap price at the time. A rule that promises a settlement amount needs a quote, a slippage limit, and a return path.
- A merchant SDK exposes Effisend to merchant misuse (fraud, sanctioned parties). Merchant checks and a revocation process are needed before live mode.
- Private payments carry legal exposure that depends on the jurisdiction.
- The public RPC endpoints' spec versions are not verified; a pinned spec version must match the endpoint.
- The signing function and the chat agent live outside the app and were not reviewed.
- The app layer has no automated tests and no rate limiting that this review found. Both matter before an SDK exposes it to merchants.
- Starknet Pay is not named in the code. This document uses the name for the Starknet branch of the "<Network> Pay" request flow. Confirm that the name matches the product.

## 8. Sources

- Effisend's production source code (web app and backend functions), read-only.
- starknet.js 10.8.0 typings (`index.d.ts` of the installed package), read-only.
- npm registry, queried 2026-11-12.
- AWS KMS key specifications and AWS Rekognition collection documentation, checked 2026-11-12.
- The Starknet report supplied for this review. Not verified against primary sources.
