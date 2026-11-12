# Effisend app

Expo and React Native client for Effisend. It covers wallet creation with face verification, Starknet balances and rewards, payments, and a chat screen with the Effisend agent.

This folder holds only the app. The backend services it calls (face verification, wallets, payments, rewards and the agent) are not in this repository and are not documented here.

Decisions and planned changes are in [docs/UPGRADE_PROPOSAL.md](../docs/UPGRADE_PROPOSAL.md). The app still runs the current stack described below; none of the planned changes is applied yet.

## Stack

- Expo `~54.0.25` and expo-router `~6.0.15`
- React `19.1.0` and React Native `0.81.5`
- react-native-reanimated `~4.1.1` and react-native-worklets `0.5.1`
- starknet.js `^7.6.4` and ethers `^6.15.0`
- expo-secure-store `~15.0.7` for the wallet user object

## Project layout

- `src/app/`: screens, routed by expo-router. `src/app/(screens)/tabs/` holds the main tabs.
- `src/api/`: HTTP clients for the backend. Each reads its URL from an `EXPO_PUBLIC_*` variable.
- `src/core/`: shared code. `constants.js` (networks and tokens), `utils.js` (storage helpers and RPC provider setup), `fetchWithRetry.js`.
- `scripts/`: build helpers. `withAndroidBuildFixes.js` is an Expo config plugin referenced from `app.json`.
- `patches/`: `patch-package` patches, applied on install.

## Setup

Requirements: Node.js and npm. `package.json` does not pin a Node.js version. Android builds need the Android SDK and iOS builds need Xcode. Web runs without either.

```bash
npm ci
npx expo start
```

`npm ci` runs `postinstall`, which applies the patches in `patches/`.

Create a `.env` file in this folder. It is git-ignored. Set the variables below to the values issued by the backend. Do not commit values.

| Variable | Used in |
| --- | --- |
| `EXPO_PUBLIC_AGENT_URL_API` | `src/api/chatWithAgent.js` |
| `EXPO_PUBLIC_AI_URL_API_KEY` | `src/api/chatWithAgent.js`, `src/api/createOrFetchFace.js`, `src/api/fetchFaceID.js` (sent as `X-API-Key`) |
| `EXPO_PUBLIC_FACEID_API` | `src/api/createOrFetchFace.js`, `src/api/fetchFaceID.js` |
| `EXPO_PUBLIC_CREATE_OR_FETCH_WALLET_API` | `src/api/createOrFetchWallet.js` |
| `EXPO_PUBLIC_CREATE_PAYMENT_URL_API` | `src/api/createPayment.js` |
| `EXPO_PUBLIC_EXECUTE_PAYMENT_API` | `src/api/executePayment.js` |
| `EXPO_PUBLIC_FETCH_PAYMENT_URL_API` | `src/api/fetchPayment.js` |
| `EXPO_PUBLIC_CLAIM_REWARDS_API` | `src/api/getRewards.js` |

Every `EXPO_PUBLIC_*` value is compiled into the app bundle, so anyone who downloads the app can read it.

The Starknet RPC URL is not an environment variable. It is defined in `src/core/constants.js` (`blockchains`). The planned change is described in the proposal.

## Scripts

| Script | Command | Notes |
| --- | --- | --- |
| `start` | `expo start` | |
| `web` | `expo start --web` | `app.json` sets `web.output` to `static`. |
| `android` / `ios` | `expo run:android` / `expo run:ios` | Needs the native toolchain. |
| `lint` | `expo lint` | |
| `postinstall` | `patch-package` | Applies the patches in `patches/`. |
| `rec` | `adb reverse tcp:8081 tcp:8081` | Needs `adb`. |
| `depcheck` | `npx depcheck` | |
| `prebuild` / `prebuildc` | `npx expo prebuild` / `npx expo prebuild --clean` | |
| `build` / `clean` / `deploy` | `cd android && gradlew ...` | See known issues. |
| `installapp` | `adb install -r android/app/build/outputs/apk/release/app-release.apk` | |
| `playbuild` | `node scripts/update-and-build.js` | |
| `reset-project` | `node ./scripts/reset-project.js` | See known issues. |

## Known issues

- `reset-project` runs `scripts/reset-project.js`, which is not in the repository.
- `build`, `clean` and `deploy` call `gradlew` without `./`, which POSIX shells cannot resolve. Use `./gradlew`.
- There are no automated tests: no test files and no `test` script.
- Client-side keys, the local storage fallback and the retry policy are tracked in the proposal.
