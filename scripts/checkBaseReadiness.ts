import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createPublicClient,
  defineChain,
  getAddress,
  http,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { erc20Abi, sponsorshipEscrowAbi } from "../src/blockchain/abi.js";
import { checkBaseReadiness, type ReadinessReader } from "../src/blockchain/readiness.js";
import { getBaseNetworkConfig, isDefaultLocalPrivateKey } from "../src/blockchain/networks.js";

type DeploymentRecord = {
  chainId?: number;
  rpcUrl?: string;
  escrowAddress?: string;
  tokenAddress?: string;
  backendAddress?: string;
};

async function main() {
  const network = getBaseNetworkConfig(process.argv[2] ?? process.env.BASE_NETWORK);
  const deployment = readDeployment(network.deploymentFile);
  const chainId = Number(envValue("CHAIN_ID") ?? deployment?.chainId ?? network.chainId);

  if (chainId !== network.chainId) {
    throw new Error(`CHAIN_ID ${chainId} does not match ${network.name} (${network.chainId}).`);
  }

  const rpcUrl = envValue("RPC_URL") ?? envValue(network.rpcEnvVar) ?? deployment?.rpcUrl ?? network.defaultRpcUrl;
  const escrowAddress = getRequiredAddress(
    envValue("ESCROW_CONTRACT_ADDRESS") ?? deployment?.escrowAddress,
    "ESCROW_CONTRACT_ADDRESS",
  );
  const usdcAddress = getAddress(envValue("USDC_CONTRACT_ADDRESS") ?? deployment?.tokenAddress ?? network.usdcAddress);
  const backendAddress = resolveBackendAddress(deployment);
  const sponsorAddress = getRequiredAddress(
    envValue("SPONSOR_WALLET_ADDRESS") ?? envValue("DEMO_BRAND_WALLET_ADDRESS"),
    "SPONSOR_WALLET_ADDRESS or DEMO_BRAND_WALLET_ADDRESS",
  );
  const totalCapAmount = parsePositiveInteger(
    envValue("READINESS_TOTAL_CAP_AMOUNT") ?? envValue("TOTAL_CAP_AMOUNT"),
    "READINESS_TOTAL_CAP_AMOUNT",
  );

  const chain = defineChain({
    id: network.chainId,
    name: network.name,
    nativeCurrency: {
      decimals: 18,
      name: "Ether",
      symbol: "ETH",
    },
    rpcUrls: {
      default: {
        http: [rpcUrl],
      },
    },
  });
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
  const reader: ReadinessReader = {
    getChainId: () => publicClient.getChainId(),
    getCode: (address) => publicClient.getCode({ address }),
    isOperator: (address, operator) =>
      publicClient.readContract({
        address,
        abi: sponsorshipEscrowAbi,
        functionName: "operators",
        args: [operator],
      }) as Promise<boolean>,
    getTokenBalance: (address, owner) =>
      publicClient.readContract({
        address,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [owner],
      }) as Promise<bigint>,
    getTokenAllowance: (address, owner, spender) =>
      publicClient.readContract({
        address,
        abi: erc20Abi,
        functionName: "allowance",
        args: [owner, spender],
      }) as Promise<bigint>,
  };

  const report = await checkBaseReadiness(reader, {
    expectedChainId: network.chainId,
    escrowAddress,
    usdcAddress,
    backendAddress,
    sponsorAddress,
    totalCapAmount,
  });

  for (const check of report.checks) {
    console.log(`${check.ok ? "OK" : "FAIL"} ${check.name}: ${check.detail}`);
  }

  if (!report.ok) {
    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log("Ready to create and fund an escrow for this cap amount.");
}

function readDeployment(path: string): DeploymentRecord | undefined {
  const resolved = resolve(path);
  if (!existsSync(resolved)) {
    return undefined;
  }

  return JSON.parse(readFileSync(resolved, "utf8")) as DeploymentRecord;
}

function resolveBackendAddress(deployment: DeploymentRecord | undefined): Address {
  const explicitAddress = envValue("BACKEND_WALLET_ADDRESS");
  if (explicitAddress) {
    return getAddress(explicitAddress);
  }

  const backendPrivateKey = envValue("BACKEND_PRIVATE_KEY");
  if (backendPrivateKey) {
    if (isDefaultLocalPrivateKey(backendPrivateKey)) {
      throw new Error("Refusing to use the default Anvil backend key for Base readiness checks.");
    }

    return privateKeyToAccount(backendPrivateKey as Hex).address;
  }

  if (deployment?.backendAddress) {
    return getAddress(deployment.backendAddress);
  }

  throw new Error("BACKEND_PRIVATE_KEY, BACKEND_WALLET_ADDRESS, or deployment backendAddress is required for readiness checks.");
}

function getRequiredAddress(value: string | undefined, label: string): Address {
  if (!value) {
    throw new Error(`${label} is required.`);
  }

  return getAddress(value);
}

function parsePositiveInteger(value: string | undefined, label: string): bigint {
  if (!value || !/^[1-9]\d*$/.test(value)) {
    throw new Error(`${label} must be a positive integer token-unit amount.`);
  }

  return BigInt(value);
}

function envValue(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

try {
  await main();
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
