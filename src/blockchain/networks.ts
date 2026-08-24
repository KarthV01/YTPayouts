import { getAddress, type Address, type Hex } from "viem";

export const LOCAL_CHAIN_ID = 31337;
export const DEFAULT_LOCAL_RPC_URL = "http://127.0.0.1:8545";
export const DEFAULT_LOCAL_BACKEND_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as Hex;

export type BaseNetworkKey = "base-sepolia" | "base-mainnet";

export type BaseNetworkConfig = {
  key: BaseNetworkKey;
  name: string;
  chainId: number;
  defaultRpcUrl: string;
  rpcEnvVar: string;
  usdcAddress: Address;
  explorerUrl: string;
  deploymentFile: string;
};

export const BASE_NETWORKS = {
  "base-sepolia": {
    key: "base-sepolia",
    name: "Base Sepolia",
    chainId: 84532,
    defaultRpcUrl: "https://sepolia.base.org",
    rpcEnvVar: "BASE_SEPOLIA_RPC_URL",
    usdcAddress: getAddress("0x036CbD53842c5426634e7929541eC2318f3dCF7e"),
    explorerUrl: "https://sepolia-explorer.base.org",
    deploymentFile: "deployments/base-sepolia.json",
  },
  "base-mainnet": {
    key: "base-mainnet",
    name: "Base Mainnet",
    chainId: 8453,
    defaultRpcUrl: "https://mainnet.base.org",
    rpcEnvVar: "BASE_MAINNET_RPC_URL",
    usdcAddress: getAddress("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"),
    explorerUrl: "https://base.blockscout.com",
    deploymentFile: "deployments/base-mainnet.json",
  },
} satisfies Record<BaseNetworkKey, BaseNetworkConfig>;

export function getBaseNetworkConfig(key: string | undefined): BaseNetworkConfig {
  const networkKey = key ?? "base-sepolia";
  if (networkKey !== "base-sepolia" && networkKey !== "base-mainnet") {
    throw new Error(`Unknown Base network "${networkKey}". Use base-sepolia or base-mainnet.`);
  }

  return BASE_NETWORKS[networkKey];
}

export function isDefaultLocalPrivateKey(privateKey: string | undefined): boolean {
  return privateKey?.toLowerCase() === DEFAULT_LOCAL_BACKEND_PRIVATE_KEY.toLowerCase();
}

export function chainNameForId(chainId: number): string {
  if (chainId === LOCAL_CHAIN_ID) {
    return "Local Sponsorship Chain";
  }

  const baseNetwork = Object.values(BASE_NETWORKS).find((network) => network.chainId === chainId);
  return baseNetwork?.name ?? `EVM Chain ${chainId}`;
}
