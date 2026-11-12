# Upgrade notes: the legacy Effisend Starknet Expo app

This document covers only this repository's legacy app. The Starknet updates are in [STARKNET_UPDATES.md](STARKNET_UPDATES.md), and the proposal for Effisend is in [EFFISEND_STARKNET_PROPOSAL.md](EFFISEND_STARKNET_PROPOSAL.md).

- **Date:** 2026-11-12
- **Status:** Decisions D1 to D7 recorded on 2026-11-12. Nothing is applied: no code, dependency, script, or configuration has changed. Nothing is committed.
- **Platform:** web only (D2).
- **Scope:** this repository only (D7). Effisend is the main product and is not changed by this work.
- **Visibility:** public (D6). This document contains no secret values, personal data, or internal hostnames. It names RPC parameters; see D6.
- **Out of scope:** backend services (agent, FaceID, wallets, payments, rewards), cloud infrastructure, and contracts. Not reviewed. Decisions that depend on them are listed as dependencies.
- **References:** `README.md:N` is the root README. Paths without a prefix are relative to `effisend-starknet/`.

**Status of each claim.** *Confirmed*: verified in this repository's code, or in the starknet 10.8.0 typings of the installed package. *Checked*: verified against an external source on 2026-11-12 (npm registry, AWS documentation). *Report*: a claim from the Starknet document uploaded for this review, not verified against primary sources. *Pending*: needs a fact or a decision.

## 1. Summary

- Decisions D1 to D7 are recorded in section 7. Nothing has been applied.
- The app becomes web only (D2). Native Android and iOS targets are dropped from the plan.
- The version upgrades come in two steps, each verified before the next: starknet.js 7.6.4 to 10.8.0 with `specVersion` pinned (D1), then Expo 54 to 57 and React Native 0.81 to 0.86 (D2).
- The Starknet RPC layer follows the design Effisend runs in production (D3): keyless public endpoints in the client, timeouts, failover, and cooldown. Paid RPC stays server-side.
- Wallets are custodial, server-side, and managed with AWS KMS (D4). AWS KMS does not offer the STARK curve, so the backend needs a Starknet key design. That design is open.
- No face image is stored; face recognition uses AWS Rekognition (D5). The meaning of "stored" is still open.
- Three confirmed risks come first: the RPC key in the bundle (R1), the client API key (R3), and the plaintext storage fallback (R5). On web, the R5 fallback is the active storage path (code path; browser run pending).
- The new features (N1 to N8) are proposals only. Under D4, transfer confirmation (N2) is a server-side step-up, not a user-held signature.

## 2. Current state

### 2.1 Versions

| Package | App (`package.json` / lock) | Effisend (production) | Newer version on npm (published) | Proposal |
|---|---|---|---|---|
| starknet | `^7.6.4` / 7.6.4 | `^10.8.0` (installed 10.8.0) | `latest`: 10.8.0 (2026-09-10). `next`: 11.6.2 (2026-11-11) | 10.8.0 (D1) |
| ethers | `^6.15.0` / 6.15.0 | `^6.16.0` | 6.17.0 (2026-06-18) | 6.17.0, after changelog review |
| expo | `~54.0.25` / 54.0.25 | 57.0.19 (2026-09-01) | 58.0.25 (2026-11-12) | 57.0.19 (D2) |
| expo-router | `~6.0.15` / 6.0.15 | 57.0.18 (2026-09-01) | 58.0.31 (2026-11-11) | 57.0.18 |
| react | `19.1.0` | 19.2.3 (2025-12-11) | 19.3.1 (2026-10-14) | 19.2.3 (the version Effisend declares); confirm with `npx expo install --check` |
| react-native | `0.81.5` | 0.86.3 (2026-08-24) | 0.88.1 (2026-10-27) | 0.86.3 |
| react-native-reanimated | `~4.1.1` / 4.1.5 | 4.5.1 (2026-07-02) | 4.7.1 (2026-10-02) | 4.5.1 |
| react-native-worklets | `0.5.1` | 0.10.1 (2026-07-01) | 0.13.1 (2026-10-26) | 0.10.1 |

For starknet, `latest` is 10.8.0, the version Effisend installs. 11.5.1 is published (2026-11-04) with no dist-tag, and 11.6.2 is under `next` (2026-11-11). Neither is evaluated here (D1).

Minimum release age: the npm configuration used for this review enforces a 7-day minimum release age. Every proposed version was published before 2026-11-05. Expo 58.0.25 becomes eligible on 2026-11-19, and expo-router 58.0.31 on 2026-11-18.

### 2.2 Starknet usage in the app (Confirmed)

- `setupProvider` (`src/core/utils.js:185-189`) creates an `RpcProvider` with only `nodeUrl`. It sets no `specVersion`, no timeout, and no `blockIdentifier`. Callers: `tab1.js:56`, `tab2.js:106`, `tab3.js:65`.
- Reads use `Contract` with the ERC-20 ABI in `src/contracts/erc20.js`: `balanceOf` in `tab1.js:156-164` and `tab2.js:233-240`, and `allowance` in `tab3.js:66-73`.
- The app does not construct `Account` or sign and send transactions. A search of `src/` finds no `Account`, `signer`, `.execute(`, or `invoke` use outside `src/core/constants.js`. In that file the matches are the names `ozAccountClassHash` (line 43) and `CloudAccountController` (line 123), and a comment (line 122). Writes go through the backend (*Pending*: confirm in the backend).
- No `setInterval` appears in `src/`. The two `setTimeout` calls in `tab1.js` (`:75` and `:99`) are one-shot. A balance refresh runs only when at least `refreshTime` (1 minute, `constants.js:19`) has passed since the last one (`tab1.js:86`).
- The RPC URL is in `constants.js:42` (`blockchains[0].rpc`). It embeds a provider key and the `rpc/v0_8` path. The key value is not published in this document.

### 2.3 Backend and root README

- The root README documents the original flow. Two examples read private keys from the database (`README.md:63`, `:427`). The account examples use the positional constructor, for example `new Account(provider, address, privateKey)` (`README.md:64`, `:120`, `:428`). The legacy note at `README.md:85` and the `Legacy:` label at `README.md:424` mark the original flow.
- The agent tools include fund transfers: `transfer_tokens` (`README.md:235`, `:261`) and `fund_metamask_card` (`README.md:388`, `:413`).
- The biometric example uses DeepFace (`README.md:167`, `:205`). It saves the image as `{nonce}.jpg` in `DB_DIR` (`README.md:178`) after writing a temporary copy that it deletes (`:161`, `:173`). This conflicts with D5.
- *Pending*: confirm what the production backend does today.

## 3. Starknet updates

The table includes the updates from the Starknet report and those confirmed by the starknet.js 10.8.0 typings. *Both* means the report and the typings mention the topic. No action has been executed.

| # | Topic | Status | What the source says | Impact on Effisend | Proposed action |
|---|---|---|---|---|---|
| 1 | `Account` constructor by options | Confirmed (typings) | The 10.8.0 `Account` constructor takes an options object: `constructor(options: AccountOptions)` (typings line 5940). `AccountOptions` (line 2375) has `provider`, `address`, `signer`, and optional `cairoVersion`, `transactionVersion`, `paymaster`, `deployer`, and `defaultTipType`. The root README uses the positional form (`README.md:64`, `:120`). | The app does not use it. The root README examples, and the backend if it uses starknet.js, do. | Update the README examples (Phase 6). The backend change is outside this repository. |
| 2 | RPC spec version | Confirmed (typings) | `RpcProviderOptions.specVersion?` (typings line 3011). `setUpSpecVersion()` returns a promise of 0.9.0, 0.10.0, 0.10.2, 0.10.3, or 0.10.4, with no 0.8.x value. Its JSDoc reads "fetch if undefined else just return this.specVersion" (typings lines 4549-4552). The app uses the `rpc/v0_8` path and does not set `specVersion`. | The default may change with the upgrade. The app's `rpc/v0_8` path is not among the listed values. | Pin `specVersion` and use an endpoint that serves that version (D1, D3). Behavior with a v0_8 endpoint: *Pending*. Phase 2. |
| 3 | Outside execution | Confirmed (typings) | `OutsideExecution`, `OutsideExecutionOptions`, `OutsideExecutionVersion`, `OutsideExecutionTypedData`, and `OutsideExecutionCallerAny` are present. The report does not name SNIP-9. Its off-chain execution text describes proof-based execution, a different mechanism. | Types for calls that an account pre-authorizes and a third party submits. Not needed when the server holds the signing key. | Not used (D4, custodial). N2 is re-scoped. |
| 4 | Paymaster | Confirmed (typings) | `PaymasterRpc`, `estimatePaymasterTransactionFee`, `executePaymasterTransaction`, `buildPaymasterTransaction`, and `assertPaymasterTransactionSafety` are present. `paymaster` is an `AccountOptions` field. Not in the report. | Sponsored transactions, so the user does not need to hold gas. | Basis for N1. Server side only (D4). |
| 5 | Typed data | Confirmed (typings) | `typedData`, `getTypedData`, `validateTypedData`, and `typedDataToHash` are present. Not in the report (its only use of "typed" is Cairo's type system). | Lets a readable message be shown before the server signs. | Basis for N3. Signing stays server side (D4). |
| 6 | STRK20 (privacy) | Both | Report: notes, viewing keys, audit mechanisms for AML and Travel Rule compliance, and the pipeline `SetViewingKey -> OpenChannel -> OpenSubchannel -> Deposit -> UseNote -> CreateNote -> Withdraw`. Typings: `strk20PrepareInvoke`, `strk20InvokeTransaction`, `strk20Balances`, and `STRK20_*` types (for example `STRK20_DEPOSIT_ACTION`). `SetViewingKey`, `OpenChannel`, `UseNote`, and `CreateNote` do not appear. | None today. A private mode is a product and legal decision. | Do not implement. See N7. |
| 7 | Shadow accounts | Both | Report: `account.strk20ShadowAccountCommitment("<dApp name>")` with Wallet API 0.10.4 and starknet ^10.8.0. Shadow accounts are deterministic addresses, specific to each dApp and nonce, with no provable on-chain link to the funding wallet. Typings: `strk20ShadowAccountCommitment` and `STRK20_SHADOW_ACCOUNT_INVOKE_ACTION`. | None today. | See N8. The Wallet API version is not verified. |
| 8 | Open notes and collect policy | Both (with a difference) | Report: a collect policy with `all`, `diff`, and `exact` (which takes an amount). Typings: `STRK20_COLLECT_POLICY`, and `collect_policy` in JSDoc examples with `all` and `diff`. `exact` does not appear. | None today. | Do not implement. Verify `exact` before any use. |
| 9 | SNIP-36: proofs in transactions | Both | Report: Starknet v0.14.2; INVOKE v3 gains optional `proof` and `proof_facts` fields; `get_execution_info_v3_syscall` exposes `proof_facts`. Typings: `snip36RequiresRPC010`, `proofFacts`, and `includeProofFacts`; `proof` and `proofFacts` are marked RPC 0.10.1+. | Protocol and RPC level. No app change today. Possible basis for N6. | Monitor. No app action. |
| 10 | SNIP-37 and Volition (fees and data availability) | Report; typings in part | Report: SNIP-37 reconfigures fee mechanics. Volition lets developers choose a data-availability mode: Rollup uses `L1_DA_Tree` (Ethereum blobs or calldata); Validium uses `L2_DA_Tree`, with a DAC committee and costs reduced by up to 95% (report figure, not checked). The report is inconsistent on granularity: one passage says per transaction, and another says per storage variable. `state_root = hash(L1_DA_Tree.root, L2_DA_Tree.root)`. Typings: `nonceDataAvailabilityMode` and `feeDataAvailabilityMode` on `V3TransactionDetails` (typings lines 785-786). SNIP-37 and Volition do not appear in the typings. | Low for the app. | No action. |
| 11 | Stwo prover, M31, and Circle STARKs | Report | Report: the Stwo prover, on the M31 field with Circle STARKs. The report also gives performance figures; not checked. | None for the client. | Do not use its figures. |
| 12 | Cairo 2.x, Sierra, Starknet Foundry, and Lean 4 | Report | Report: names Cairo 2.x, Sierra, and Starknet Foundry as the development ecosystem, and says StarkWare has integrated formal verification based on Lean 4. Not checked. | None. No Cairo files are tracked in this repository. | If contracts are added, test them with Starknet Foundry. Do not attribute formal verification to an Effisend contract without evidence. |
| 13 | Agents: ZKML (Giza/Orion) and AgentSTARK | Report | Report: ZKML tooling (Giza and Orion are named) and AgentSTARK. An AgentSTARK agent requires no human supervision after deployment. Its parenthetical refers to external signing keys, and the agent processes a constant flow of financial data. | Under D4 the backend holds the keys. An agent without limits could move funds. | Do not use for transfers until the limits decision (D7-A) and server-side confirmation (N2) exist. |
| 14 | strkBTC, BitVM, S-TWO dual settlement, OP_CAT, ColliderVM | Report | Bitcoin-side designs. The report says practical STARK verification on Bitcoin depends on the eventual activation of OP_CAT and on innovations such as ColliderVM. | None today. | None. |
| 15 | Staking and Bitcoin delegation | Report | Report: primary block validators will be required to lock a minimum of 20,000 STRK. The report also describes Bitcoin staking through Babylon-like infrastructure. | None, unless staking is added. | None. |
| 16 | Post-quantum (Falcon-512; 2027 target) | Report | Report: researchers ran successful transfers on mainnet with Falcon-512 (claimed). The report names a 2027 post-quantum target. | A new signature scheme needs a different account class (`ozAccountClassHash`, `constants.js:43`). | Monitor. |

The report's claims are not checked against primary sources. Before deciding anything based on them, check the official Starknet documentation and the published SNIPs. *Pending*.

## 4. Findings

Each finding lists severity and status. Paths refer to the app unless noted otherwise.

**R1. RPC URL with an embedded key.** High. *Confirmed.*
- Evidence: `src/core/constants.js:42`. The key is in a tracked file and in git history.
- Risk: anyone can use the key, run up charges, or exhaust the quota.
- Proposal: rotate the key (owner action, before any commit of this document). Removing the key from history does not make it safe. The client uses keyless public endpoints with timeouts and failover (D3, Phase 3). Calls that cost money run server-side only, as a last resort.

**R2. Key custody in the backend.** High. Direction decided (D4); design pending.
- Evidence: the legacy flow in `README.md:63` and `:427` reads private keys from the database.
- Risk: anyone who can read that database can sign for users.
- Proposal: custodial, KMS-managed, server-side (D4). No key is stored in the database in plaintext. AWS KMS does not offer the STARK curve (*Checked*, 2026-11-12), so KMS cannot sign for Starknet. Effisend's backend stores the Starknet key encrypted with KMS and decrypts it in function memory to sign as a normal account (see the proposal, section 2.1). This legacy app's backend must be checked for the same design.

**R3. `X-API-Key` sent from the client.** Medium. *Confirmed.*
- Evidence: `src/api/chatWithAgent.js:3`, `src/api/createOrFetchFace.js:5`, and `src/api/fetchFaceID.js:5`. `EXPO_PUBLIC_AI_URL_API_KEY` is compiled into the bundle.
- Risk: anyone who downloads the app can extract the key and call those endpoints.
- Proposal: rotate the key together with the backend change. The backend issues a session token after verification, and the client sends that token instead.

**R4. User data sent to the agent.** Medium. Confirmed in the client; contents of the `user` object pending.
- Evidence: `src/app/(screens)/tabs/tab4.js:83` reads the `user` object, and `:85-88` send `{ message, context: { user, address } }`. The `user` object is stored in secure storage (`src/app/(screens)/create.js:49` and `:68`).
- Risk: the agent receives the `user` object and the wallet address with every message, without data minimization.
- Proposal: send only the message. The backend resolves identity from the session token (R3). *Pending*: review the contents of the `user` object.

**R5. Plaintext storage fallback, active on web.** High on web. Confirmed by code path; browser run pending.
- Evidence: `src/core/utils.js:74` reads `GeneralBackup` from AsyncStorage when secure storage throws. Lines `:98-104` write it without encryption. The wallet address is also written to AsyncStorage in plaintext (`create.js:50` and `:69`).
- Web behavior: `expo-secure-store` 15.0.7 has no web implementation: its web module is `export default {};`. The sync `getItem` and `setItem` call `ExpoSecureStore.getValueWithKeySync` and `setValueWithKeySync`, which the stub does not define, so they throw a TypeError. They do not return `null` or fail silently, so `src/core/utils.js` takes its `catch` path and uses `GeneralBackup` (code-path reasoning from the package source; browser run pending). AsyncStorage 2.2.0 uses `window.localStorage` on web.
- Risk: the `user` object and the address sit in plaintext in the browser's localStorage.
- Proposal: remove the `GeneralBackup` path, and delete it on startup. Keep no wallet or key material in browser storage (D4). Store only a server-issued session identifier with an expiry, and only if it is needed. The browser storage design is a Phase 1 decision.

**R6. Retries on POST.** Medium. Confirmed.
- Evidence: `src/core/fetchWithRetry.js:3` (`fetchWithRetries`) makes 3 attempts in total (2 retries, waiting 1 s and then 2 s). It retries any non-OK response and any network error. It is used by `src/api/createOrFetchFace.js:15` and `src/api/fetchFaceID.js:17`. All eight modules in `src/api/` send POST requests, including ones whose names suggest reads, such as `fetchFaceID`.
- Risk: retrying a non-idempotent operation can duplicate records or charges.
- Proposal: decide per operation. Retry only if the backend accepts an idempotency key; otherwise do not retry.

**R7. Biometric images.** High. Direction decided (D5); definition pending.
- Evidence: the app sends face images. `src/app/(screens)/create.js:39` passes `{ image, nonce }` to `createOrFetchFace`, and `src/app/(screens)/tabs/tab2.js:427` passes `{ image }` to `fetchFaceID`. In `src/components/camFace.js`, the captured photo (`uri`, line 60) is resized into a new file on the device (line 65, `ImageResizer.createResizedImage`) and read as base64 (line 72, `RNFS.readFile`). Neither the captured photo nor the resized copy is deleted in that function. The root README backend example saves `{nonce}.jpg` in `DB_DIR` (`README.md:178`), which conflicts with D5. Its temporary copy is deleted (`README.md:173`).
- Risk: biometric data with no defined retention, and no deletion flow in this repository.
- Proposal: no face image is stored (D5). The replacement capture path (R9) must keep the image in memory only. Verify that the app keeps no captured image in any storage (AsyncStorage, localStorage, IndexedDB, caches) and in no logs. The owner must define "stored" (section 7, D5). N4 covers deletion.

**R8. Agent tools that move funds.** High. Confirmed in the README; actual backend behavior pending.
- Evidence: `README.md:235-261` (`transfer_tokens`) and `README.md:388-413` (`fund_metamask_card`). The README mentions no transfer limit and no confirmation step.
- Risk: if the backend runs these tools without limits or confirmation, the model can move funds.
- Proposal: per-transaction and daily limits in the backend (D7-A, open). A server-side confirmation step before every transfer (D7-B, re-scoped under D4; N2). An optional recipient allowlist (D7-C, open).

**R9. Native-only packages in a web-only app.** Medium. Pending verification.
- Evidence: packages that target native platforms are imported in `src/`: `react-native-camera-kit` in `src/components/camQR.js:8` and `src/components/camFace.js:10`; `@bam.tech/react-native-image-resizer` (`camFace.js:1`) and `react-native-fs` (`camFace.js:11`); `react-native-linear-gradient` in `src/app/(screens)/tabs/tab4.js:19`; `@react-native-clipboard/clipboard` in `src/app/(screens)/tabs/tab1.js:1`.
- Risk: the web build fails, or these features do nothing in a browser.
- Proposal: for each import, use an Expo module already listed in `package.json` (`expo-camera`, `expo-image-manipulator`, and `expo-linear-gradient` are listed), after checking its web support. Or use a browser API, or remove the feature. Web support of each package is not checked in this review.

**R10. Unused exported code.** Low. Confirmed.
- Evidence: `src/core/constants.js:123` (`CloudAccountController`) and `:125` (`CloudPublicKeyEncryption`) have no references outside the file. `scripts/increase-version.js` is not referenced by `package.json` or the READMEs.
- Proposal: confirm they are leftovers from an earlier flow, then remove them. Run `npx depcheck`.

**R11. Build and native scripts.** Low. Confirmed.
- Evidence: `package.json` defines native scripts (`android`, `ios`, `rec`, `prebuild`, `prebuildc`, `build`, `clean`, `deploy`, `installapp`). `reset-project` points to `scripts/reset-project.js`, which does not exist. `build`, `clean`, and `deploy` call `gradlew` without `./`. `app.json:29` references the config plugin `./scripts/withAndroidBuildFixes.js`. There are no tracked `android/` or `ios/` folders. `playbuild` runs `scripts/update-and-build.js`, which exists and was not reviewed.
- Proposal (D2): remove the native scripts, the plugin reference, and `scripts/withAndroidBuildFixes.js`. Remove `reset-project` or add its script. Review `playbuild` and remove it if it only supports native builds.

**R12. No automated tests.** Medium. Confirmed.
- Evidence: there are no test files and no `test` script in `package.json`.
- Proposal: Phase 5.

**R13. Patch on a dependency.** Medium for the upgrade. Confirmed.
- Evidence: `patches/react-native-virtual-keyboard+1.2.2.patch`, applied in `postinstall`. The package is imported at `src/app/(screens)/tabs/tab2.js:15` and used at `:293`.
- Risk: the patch may stop applying with React Native 0.86, or may not apply to the web build.
- Proposal: validate in Phase 4. If it fails, replace the component or rewrite the patch.

**R14. Provider without timeout or pinned version.** Medium. Confirmed.
- Evidence: `src/core/utils.js:185-189`.
- Risk: an RPC call can wait with no limit. A change in the library's default spec version may break balance reads.
- Proposal: explicit timeout and `specVersion` (D1, D3), in Phase 2 and Phase 3.

## 5. Phased plan

No phase is executed by this document. Each phase needs owner approval, its own branch, and one change per commit. Nothing is committed without approval.

**Acceptance criteria (every phase):** zero lint errors and zero lint warnings (`npx expo lint`); no unused dependencies reported by `npx depcheck`; `npx expo export -p web` succeeds; zero `npm audit` findings and zero Dependabot alerts; each new version meets the 7-day minimum release age (`npm view <package> time`).

**Phase 0. Owner actions (before any commit).**
- Rotate the RPC key (R1) and `EXPO_PUBLIC_AI_URL_API_KEY` (R3), coordinated with the backend.
- Define "stored" in D5 (section 7).
- Confirm the Starknet key design with the backend owner (D4).
- Confirm that the 11.x evaluation stays deferred (D1).

**Phase 1. Web-only cleanup and client security (no version upgrades).**
- R11 and R10: remove the native scripts, the plugin reference, and the broken script entries. Remove unused exports after confirming them.
- R9: replace or remove the native-only imports, using modules already installed where possible.
- R5: remove the `GeneralBackup` path and delete it on startup. Keep no key material in browser storage.
- R6: set the retry policy per operation.
- R4: send only the message to the agent (depends on R3 and the backend).
- R14: check the starknet.js 7.6.4 typings for a timeout option. If there is none, the timeout moves to Phase 3.
- Verification: a headless-browser check that secure-store calls throw on web and the fallback writes localStorage, run before and after the R5 change.

**Phase 2. starknet.js 7.6.4 to 10.8.0 (D1).**
- Pin `specVersion` and move the endpoint to one that serves the same version (section 3, row 2). Verify with a live call before switching.
- Review `setupProvider`, the `Contract` construction (not compared with v7 in this review), and the three reads (`balanceOf` twice, `allowance`).
- Review the lock file diff for transitive changes.

**Phase 3. RPC client (D3).**
- Replace `setupProvider` with an RPC client that provides: a 5 s timeout through `baseFetch` and `AbortController`; `blockIdentifier: "latest"`; an endpoint pool with failover; a second endpoint started after 700 ms if the first has not answered (hedging); a cooldown for failing endpoints; and quorum for critical reads.
- Endpoint list: static in the app by default. A runtime registry served by a backend function is an open decision (section 7, D3).
- Remove the key from `constants.js:42` after rotation (R1). Paid RPC stays server-side.
- Verification: a headless-browser run with one endpoint blocked, to confirm failover.

**Phase 4. Expo 57 and React Native 0.86, web only (D2).**
- Expo 54 to 57.0.19; expo-router 6 to 57.0.18; React Native 0.81.5 to 0.86.3; React 19.1.0 to 19.2.3 (the version Effisend declares); react-dom 19.1.0 to 19.2.3 (also declared by Effisend); reanimated 4.1 to 4.5.1; worklets 0.5.1 to 0.10.1; react-native-web confirmed at ~0.21.0 or updated as Expo 57 requires.
- Review the migration notes for Expo 55 and 56, which are not yet reviewed.
- Align versions with `npx expo install --check`.
- ethers 6.15.0 to 6.17.0, after changelog review.
- Revalidate the patch (R13).

**Phase 5. Tests (none exist today).**
- Unit tests with Jest and jest-expo: storage and backup logic, `fetchWithRetries`, the RPC client (timeouts and failover with mocked endpoints), and balance formatting.
- Integration tests against Starknet testnet: `balanceOf` and `allowance` reads through the RPC client.
- Tests that move funds: only with a test account designated by the owner, kept outside this repository.
- UI: Playwright in headless mode on the web build. Camera and QR flows need a manual test in a real browser.

**Phase 6. Documentation.** Update both READMEs as each phase lands: stack, scripts, environment table, known issues, and status.

**Phase 7. New features.** Only after D1, D3, D4, D5, and D7-A are decided, and each feature is approved on its own. See section 6.

## 6. New integrations and features (proposed, not executed)

| # | Feature | Basis | Requirements | Risk | Priority |
|---|---|---|---|---|---|
| N1 | Sponsored transactions (paymaster) | Typings (Confirmed) | Server side only (D4). Per-user limits. `assertPaymasterTransactionSafety` before submission. | Paymaster abuse and cost | Medium |
| N2 | Server-side step-up confirmation for each transfer | D4 and D7-B (re-scoped). Outside execution (typings) is not used, because there is no user-held signer. | A verified user confirmation before the backend signs. The method is the owner's choice. Limits from D7-A (open). | A compromised session can approve transfers | High |
| N3 | Readable transfer summary before confirmation | The backend returns the amount, token, recipient, and fee. The app displays them. Typed-data typings apply only if the backend signs typed data. | N2 | Low | High |
| N4 | Face data deletion | R7 and D5 definition (ii) | A backend deletion endpoint (not in this repository). Rekognition deletion behavior to verify. Under D7, this repository lists it as a dependency only; the backend that holds the data is outside this repository. | Low | High (R7). Scope set by D5. |
| N5 | Transaction history | RPC `getEvents` (typings) | Pagination. RPC cost. Reads through the RPC client (D3) or the backend. | Low | Medium |
| N6 | Biometric verification with an on-chain proof | Report; SNIP-36 typings (section 3, row 9) | D5 definition. Biometric-derived data must never be published on-chain. Third-party tooling. | High | Exploratory |
| N7 | STRK20 private mode | Report; typings (section 3, row 6) | Legal and product decision. Custody model (D4) first. | High | Not recommended now |
| N8 | Shadow accounts per dApp | `strk20ShadowAccountCommitment` (typings) | Wallet API 0.10.4 (report claim, not verified). A product need for per-dApp accounts. | Medium | Not recommended now |

Recommended order: N2 and N3 together, once D7-A is decided; then N4 (scope per D7); then N1 and N5.

## 7. Decisions

Decided by the owner on 2026-11-12. Open items are listed under each decision. The consequences apply to sections 3 to 6.

**D1. starknet.js: update.** Decided by the owner. Proposed target: 10.8.0, the npm `latest` version (published 2026-09-10, meets the 7-day rule), with `specVersion` pinned.
- Consequences: the endpoint version changes with the pin (section 3, row 2). The `Account` constructor changes (section 3, row 1), which matters for backend code and the README examples.
- Open: npm's `latest` tag is 10.8.0, but 11.x releases exist. `next` is 11.6.2 (published 2026-11-11, eligible 2026-11-18). 11.5.1 (published 2026-11-04) is already eligible. 11.x is not evaluated here. Recommendation: 10.8.0 for this step, and a separate evaluation of 11.x.

**D2. Platform: web only, on the Expo 57 line.** Decided. The app is a web app. The Android and iOS targets are dropped.
- Working target, to confirm with `npx expo install --check` before installing: Expo 57.0.19, expo-router 57.0.18, React 19.2.3, React Native 0.86.3, reanimated 4.5.1, worklets 0.10.1, react-native-web ~0.21.0.
- Consequences: native scripts and the config plugin are removed (R11). Native-only imports are replaced (R9). The patch is validated on web (R13). Browser storage is redesigned (R5).
- Open: moving to Expo 58, which is eligible on 2026-11-19. Recommendation: stay on 57 for this step, and reassess after that date.

**D3. RPC design: Effisend's production implementation as the reference.** Decided. Effisend's RPC implementation is the reference, and this layer follows its design: a 5 s timeout through `baseFetch`; an explicit `blockIdentifier: "latest"`; failover across endpoints; hedged requests; a cooldown for failing endpoints; quorum for critical reads; and a backend fallback as the last resort.
- Consequences: the client uses keyless public endpoints only (R1). Paid RPC is server-side only, as a last resort. Phase 3 implements the client side.
- Open: whether the endpoint list stays static in the app or comes from a runtime registry served by a backend function. The registry needs backend work outside this repository.

**D4. Custody: custodial, server-side, KMS-managed.** Decided. Wallets are custodial. Keys are created, stored, and used on the server, managed with AWS KMS. The app never holds signing material.
- Consequences: no key material or recovery credential in the app or in browser storage (R5). Signing happens only on the server. The client sends intents and confirmations (N2, N3). Outside execution is not used. Paymaster and typed-data signing run on the server (N1, N3).
- Gap (*Checked*, 2026-11-12): AWS KMS does not offer the STARK curve. Effisend encrypts the key with KMS and decrypts it in the backend to sign, which avoids the gap. The plaintext key exists in function memory during each send.
- Open: account recovery and key rotation procedures (a backend decision). Non-custodial mode is out of scope.

**D5. Biometrics: the face is never stored; AWS Rekognition.** Decided by the owner: the face is never stored. Face verification uses AWS Rekognition.
- Open: define "stored". There are two readings:
  - (i) No face image is stored anywhere: app, backend, logs, or backups. Rekognition collections store face vectors, not images (*Checked*, 2026-11-12), so the vectors may be kept.
  - (ii) No face data is stored, including Rekognition vectors and face IDs. Consequences: N4 deletion is required, and the enrollment design needs review, because face verification compares against stored reference data (the current README example uses `DB_DIR` this way).
- Under both readings, the app must not keep a captured image on the device (R7). Legal review is required before the definition is final.

**D6. Publication: public.** Decided. This repository and this document are to be public, because the plan for it is shared openly.
- Consequences: nothing published may contain secret values, personal data, test-user identifiers, or internal hostnames. The key rotations in Phase 0 come before any commit.
- Open: pushing to the remote. The commit is local and not pushed. The document names RPC parameters (D3). Confirm before publishing that this detail may be public.

**D7. Scope: Effisend is the main product.** Decided. Effisend is the main and core project. This repository is for Starknet interest and updates only.
- Consequences: this work changes only this repository. Effisend's code is read-only. Features here are Starknet features. Core-product features are listed as dependencies only (N4).

**D7 open item: transfer limits.** Not decided. Options: A) per-transaction and daily limits in the backend; B) server-side confirmation for each transfer (N2, re-scoped under D4); C) a recipient allowlist. Recommendation: A and B, with C optional.

## 8. Risks and dependencies

- Without the backend, R2, R4, R7, and R8 stay open.
- Expo 54 to 57 crosses versions 55 and 56. Their migration notes are not reviewed yet.
- starknet.js 10.8.0 changes the `Account` constructor and may change the default RPC version. Pinning `specVersion` removes the second risk, but the endpoint must match the pin.
- The current `rpc/v0_8` endpoint path is not among 10.8.0's spec-version values. A mismatch may break balance reads.
- On web, the `expo-secure-store` web module default-exports an empty object, so its calls throw and the plaintext fallback runs (code-path reasoning; browser run pending). Until R5 is fixed, browser storage holds user data in plaintext on web.
- Camera capture and QR scanning cannot be fully tested headless. They need a manual browser test.
- The Starknet report's claims are not verified against primary sources.
- This review had no Android SDK, no Xcode, and no display. UI checks use headless browser runs only.

## 9. Items to verify

- Backend: the Starknet key design for signing (D4); the contents of the `user` object (R4); image handling and retention (D5); whether writes go through the backend as assumed (section 2.2).
- AWS Rekognition: whether face deletion removes the vectors. Not verified; the managing-faces documentation was not fetched.
- Endpoints: which spec version each candidate public Starknet RPC serves. Effisend's Starknet configuration lists public RPC endpoints; their roles and spec versions are not verified.
- starknet.js 10.8.0: runtime behavior with a pinned `specVersion`, against a v0_8 endpoint and against a supported endpoint. `Contract` behavior compared with current usage.
- Expo 57: migration notes for versions 55 and 56. The web build with the removed native modules.
- Patch: the `react-native-virtual-keyboard` patch on React Native 0.86 and on web (R13).
- Web storage: a headless-browser run confirming that the secure-store calls throw and that the fallback writes localStorage (R5).
- Native-only packages: web support of each package listed under R9.
- Starknet report: each claim against the official documentation.

## 10. Sources

- This repository: app code, root README, `effisend-starknet/README.md`, `package.json`, `package-lock.json`, and `app.json`.
- starknet 10.8.0 typings (`index.d.ts` of the installed package), read-only.
- Effisend's production source code, read-only.
- expo-secure-store 15.0.7 and @react-native-async-storage/async-storage 2.2.0 package sources, obtained with `npm pack` into a scratch directory and read there. Not installed in this repository.
- npm registry, queried on 2026-11-12 for dist-tags and publish times. Nothing was installed.
- AWS KMS key specifications and AWS Rekognition collection storage documentation, checked on 2026-11-12.
- The Starknet report uploaded for this review. Not verified against primary sources.
