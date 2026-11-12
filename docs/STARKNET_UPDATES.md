# Starknet updates since the last Effisend Starknet update

- **Date:** 2026-11-12
- **Baseline:** 2026-03-11, the date of the last two commits in this repository (`git log`). The app locks starknet.js 7.6.4 (`package-lock.json`); npm `latest` for starknet was 9.4.2 (published 2026-03-06).
- **Purpose:** record what changed in Starknet and its tooling after the baseline, and what Effisend already uses. The proposal built on these updates is in [EFFISEND_STARKNET_PROPOSAL.md](EFFISEND_STARKNET_PROPOSAL.md).
- **Nothing is applied.** No code, dependency, or configuration changed. This repository is documentation only for this step.
- **Visibility:** no secret values, personal data, or internal hostnames.

**Status of each claim.** *Confirmed*: read in the starknet 10.8.0 typings (`index.d.ts` of the installed package), in repository code, or in `git log`. *Checked*: read from the npm registry on 2026-11-12. *Report*: stated in the Starknet document supplied for this review; not verified against primary sources. *Pending*: not verified.

## 1. starknet.js releases (Checked)

Source: npm registry publish times, queried 2026-11-12.

| Version | Published | Note |
|---|---|---|
| 9.4.2 | 2026-03-06 | `latest` at the baseline |
| 10.0.0 | 2026-04-19 | First major after the baseline |
| 10.8.0 | 2026-09-10 | Current npm `latest`. Last 10.x release. Effisend declares `^10.8.0` |
| 11.0.0 | 2026-09-14 | Second major |
| 11.5.1 | 2026-11-04 | No dist-tag |
| 11.6.2 | 2026-11-11 | Current `next` |

- 49 releases were published after 2026-03-11 (51 since 2026-03-01, minus 9.4.1 and 9.4.2).
- Release notes and breaking changes of 10.0.0 and 11.0.0 were not read. *Pending*.
- A new version is adopted only after the 7-day minimum release age. 11.6.2 becomes eligible on 2026-11-18.

## 2. What the 10.8.0 typings show (Confirmed)

| Area | Present in the typings | Used by Effisend today |
|---|---|---|
| Account construction | `Account` takes one options object: `constructor(options: AccountOptions)`. `AccountOptions` has `provider`, `address`, `signer`, and optional `cairoVersion`, `transactionVersion`, `paymaster`, `deployer`, `defaultTipType`. | No `Account` in the app. The root README examples still use the positional form. |
| RPC spec version | `RpcProviderOptions.specVersion?`. `setUpSpecVersion()` returns one of 0.9.0, 0.10.0, 0.10.2, 0.10.3, 0.10.4. | Effisend pins no spec version. The legacy app does not set it. |
| Outside execution | `OutsideExecution`, `OutsideExecutionOptions`, `OutsideExecutionVersion`, `OutsideExecutionTypedData`, `OutsideExecutionCallerAny`. | No |
| Paymaster | `PaymasterRpc`, `estimatePaymasterTransactionFee`, `executePaymasterTransaction`, `buildPaymasterTransaction`, `assertPaymasterTransactionSafety`; `paymaster` is an `AccountOptions` field. | No |
| Typed data | `typedData`, `getTypedData`, `validateTypedData`, `typedDataToHash`. | No |
| Privacy (STRK20) | `strk20PrepareInvoke`, `strk20InvokeTransaction`, `strk20Balances`, `STRK20_DEPOSIT_ACTION`, `strk20ShadowAccountCommitment`, `STRK20_SHADOW_ACCOUNT_INVOKE_ACTION`, `STRK20_COLLECT_POLICY`; `collect_policy` appears in JSDoc with `all` and `diff`. | No |
| Proofs in transactions | `proofFacts` and `proof` on `V3TransactionDetails`, marked RPC 0.10.1+; `snip36RequiresRPC010`; `includeProofFacts`; `executeWithProof`. | No |
| Data availability | `nonceDataAvailabilityMode` and `feeDataAvailabilityMode` on `V3TransactionDetails`. | Defaults only |
| Events | `getEvents` | Yes. Effisend reads token `Transfer` events to confirm Starknet Pay payments. |

Not found in the typings (case-insensitive): SNIP-37, Volition, `SetViewingKey`, `OpenChannel`, `OpenSubchannel`, `UseNote`, `CreateNote`, and the collect-policy value `exact`.

## 3. Protocol and ecosystem updates (Report)

These come from the supplied Starknet document. None is verified against primary sources. Check the official documentation and the published SNIPs before any decision.

| # | Topic | What the report says | Relevance to payments |
|---|---|---|---|
| 1 | STRK20 privacy | Private transfers with notes and viewing keys, and audit mechanisms for AML and Travel Rule compliance. Sequence: SetViewingKey, OpenChannel, OpenSubchannel, Deposit, UseNote, CreateNote, Withdraw. | Private payments; compliance path |
| 2 | Shadow accounts | `account.strk20ShadowAccountCommitment("<dApp name>")` with Wallet API 0.10.4. Deterministic addresses per dApp and nonce, with no provable on-chain link to the funding wallet. | One address per order |
| 3 | Collect policy | `all`, `diff`, and `exact` (with an amount). | A merchant collects exactly the requested amount |
| 4 | SNIP-36 | Starknet v0.14.2. INVOKE v3 gains optional `proof` and `proof_facts`; a syscall exposes `proof_facts`. | Verifiable claims inside a transaction |
| 5 | SNIP-37 and Volition | A new fee model. Data availability chosen as Rollup (Ethereum blobs or calldata) or Validium (a committee), with costs reduced by up to 95% (figure not checked). The report states the granularity two ways: per transaction, and per storage variable. | Lower fees for small payments, if confirmed |
| 6 | Stwo prover | Circle STARKs on the M31 field. | None for the client |
| 7 | Development stack | Cairo 2.x, Sierra, Starknet Foundry; formal verification with Lean 4 attributed to StarkWare. | Tooling for a payment contract |
| 8 | Agents | ZKML (Giza, Orion) and AgentSTARK, an agent that runs without human supervision after deployment. | Agent payments; needs spending limits |
| 9 | Bitcoin | strkBTC, BitVM, OP_CAT, ColliderVM. | Future BTC-denominated payments |
| 10 | Staking | Block validators lock a minimum of 20,000 STRK; Bitcoin staking through Babylon-like infrastructure. | None |
| 11 | Post-quantum | Falcon-512 transfers on mainnet (claimed) and a 2027 target. | A new account class would be needed |

The report does not mention SNIP-9 (outside execution) or paymasters. Those two come from the typings only.

## 4. Tooling updates (Checked)

| Package | Legacy app | Effisend (production) | Newer on npm |
|---|---|---|---|
| expo | `~54.0.25` | 57.0.19 (2026-09-01) | 58.0.25 (2026-11-12) |
| react-native | `0.81.5` | 0.86.3 (2026-08-24) | 0.88.1 (2026-10-27) |
| react | `19.1.0` | 19.2.3 | 19.3.1 (2026-10-14) |
| ethers | `^6.15.0` | `^6.16.0` | 6.17.0 (2026-06-18) |

Expo 58.0.25 becomes eligible on 2026-11-19 under the 7-day rule.

## 5. What Effisend already adopted (Confirmed)

- starknet.js 10.8.0, with the RPC timeout kept.
- `StarknetChain` builds one `RpcProvider` per endpoint with `blockIdentifier: "latest"` and a 5 s timeout through `baseFetch`. Balance reads fall back endpoint by endpoint, then to the server. A failed read is never shown as zero.
- Starknet Pay confirmation reads token `Transfer` events through `getEvents`, with a quorum across RPC operators.

## 6. Not verified

- Release notes and breaking changes for starknet.js 10.0.0, 11.0.0, and later.
- Every item in section 3, against the official Starknet documentation.
- Which RPC spec version each public Starknet endpoint serves.
- Whether Wallet API 0.10.4 is released and what it contains.
