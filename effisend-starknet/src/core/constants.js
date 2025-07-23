import { Dimensions, Image, PixelRatio, Platform } from "react-native";
// Blockchain
import ETH from "../assets/logos/eth.png";
import STRK from "../assets/logos/strk.png";
import DAI from "../assets/logos/dai.png";
import USDC from "../assets/logos/usdc.png";
import USDT from "../assets/logos/usdt.png";

const normalizeFontSize = (size) => {
  let { width, height } = Dimensions.get("window");
  if (Platform.OS === "web" && height / width < 1) {
    width /= 2.3179;
    height *= 0.7668;
  }
  const scale = Math.min(width / 375, height / 667); // Based on a standard screen size
  return PixelRatio.roundToNearestPixel(size * scale);
};

const w = normalizeFontSize(50);
const h = normalizeFontSize(50);

export const refreshTime = 1000 * 60 * 1;

export const iconsBlockchain = {
  eth: <Image source={ETH} style={{ width: w, height: h, borderRadius: 10 }} />,
  strk: (
    <Image source={STRK} style={{ width: w, height: h, borderRadius: 10 }} />
  ),
  dai: <Image source={DAI} style={{ width: w, height: h, borderRadius: 10 }} />,
  usdc: (
    <Image source={USDC} style={{ width: w, height: h, borderRadius: 10 }} />
  ),
  usdt: (
    <Image source={USDT} style={{ width: w, height: h, borderRadius: 10 }} />
  ),
};

export const blockchains = [
  {
    network: "Starknet",
    blockExplorer: "https://voyager.online/",
    rpc: "https://starknet-mainnet.public.blastapi.io",
    ozAccountClassHash:
      "0x0540d7f5ec7ecf317e68d48564934cb99259781b1ee3cedbbc37ec5337f8e688",
    batchBalancesAddress: "0xcf4902BC621E97B8d574f1E91c342f0c44C8baE5",
    rewardsContract: "0x04A4e03a1F879DE1F03D3bBBccd9CB9500d6A7e8",
    tokens: [
      {
        name: "Ether",
        color: "#28A0F0",
        symbol: "ETH",
        address:
          "0x049D36570D4e46f48e99674bd3fcc84644DdD6b96F7C741B1562B82f9e004dC7",
        decimals: 18,
        icon: iconsBlockchain.eth,
        coingecko: "ethereum",
      },
      {
        name: "Starknet Token",
        color: "#29296e",
        symbol: "STRK",
        address:
          "0x04718f5a0Fc34cC1AF16A1cdee98fFB20C31f5cD61D6Ab07201858f4287c938D",
        decimals: 18,
        icon: iconsBlockchain.strk,
        coingecko: "starknet",
      },
      {
        name: "DAI",
        color: "#fab932",
        symbol: "DAI",
        address:
          "0x00dA114221cb83fa859DBdb4C44bEeaa0BB37C7537ad5ae66Fe5e0efD20E6eB3",
        decimals: 18,
        icon: iconsBlockchain.dai,
        coingecko: "dai",
      },
      {
        name: "USD Coin",
        color: "#2775ca",
        symbol: "USDC",
        address:
          "0x053C91253BC9682c04929cA02ED00b3E423f6710D2ee7e0D5EBB06F3eCF368A8",
        decimals: 6,
        icon: iconsBlockchain.usdc,
        coingecko: "usd-coin",
      },
      {
        name: "Tether USD",
        color: "#008e8e",
        symbol: "USDT",
        address:
          "0x068F5c6a61780768455de69077E07e89787839bf8166dEcfBf92B645209c0fB8",
        decimals: 6,
        icon: iconsBlockchain.usdt,
        coingecko: "tether",
      },
    ],
  },
];

export const chains = blockchains.filter((_, index) => index !== 1); // Remove Ethereum, high fees

export const baseWallets = Object.fromEntries(
  blockchains.map((x) => [x.apiname, { id: "", address: "" }])
);

// Cloud Account Credentials
export const CloudAccountController =
  "0x72b9EB24BFf9897faD10B3100D35CEE8eDF8E43b";
export const CloudPublicKeyEncryption = `
-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEAtflt9yF4G1bPqTHtOch47UW9hkSi4u2EZDHYLLSKhGMwvHjajTM+
wcgxV8dlaTh1av/2dWb1EE3UMK0KF3CB3TZ4t/p+aQGhyfsGtBbXZuwZAd8CotTn
BLRckt6s3jPqDNR3XR9KbfXzFObNafXYzP9vCGQPdJQzuTSdx5mWcPpK147QfQbR
K0gmiDABYJMMUos8qaiKVQmSAwyg6Lce8x+mWvFAZD0PvaTNwYqcY6maIztT6h/W
mfQHzt9Z0nwQ7gv31KCw0Tlh7n7rMnDbr70+QVd8e3qMEgDYnx7Jm4BzHjr56IvC
g5atj1oLBlgH6N/9aUIlP5gkw89O3hYJ0QIDAQAB
-----END RSA PUBLIC KEY-----
`;
