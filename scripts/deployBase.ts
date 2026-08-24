import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  getAddress,
  http,
  type Abi,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sponsorshipEscrowAbi } from "../src/blockchain/abi.js";
import { getBaseNetworkConfig, isDefaultLocalPrivateKey } from "../src/blockchain/networks.js";

type FoundryArtifact = {
  abi: Abi;
  bytecode: {
    object: Hex;
  };
};

type DeploymentRecord = {
  network: string;
  chainId: number;
  rpcUrl: string;
  escrowAddress: Address;
  tokenAddress: Address;
  deployerAddress: Address;
  backendAddress: Address;
  deployTxHash: Hex;
  operatorTxHash?: Hex;
};

async function main() {
  const network = getBaseNetworkConfig(process.argv[2] ?? process.env.BASE_NETWORK);
  const rpcUrl = envValue("RPC_URL") ?? envValue(network.rpcEnvVar) ?? network.defaultRpcUrl;
  const deployerPrivateKey = envValue("DEPLOYER_PRIVATE_KEY") ?? envValue("BACKEND_PRIVATE_KEY");
  const backendPrivateKey = envValue("BACKEND_PRIVATE_KEY") ?? deployerPrivateKey;

  if (!deployerPrivateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY or BACKEND_PRIVATE_KEY is required to deploy the escrow contract.");
  }

  if (!backendPrivateKey) {
    throw new Error("BACKEND_PRIVATE_KEY is required so the deployed escrow has a payout operator.");
  }

  if (isDefaultLocalPrivateKey(deployerPrivateKey) || isDefaultLocalPrivateKey(backendPrivateKey)) {
    throw new Error("Refusing to use the default Anvil private key for Base deployment.");
  }

  const deployerAccount = privateKeyToAccount(deployerPrivateKey as Hex);
  const backendAccount = privateKeyToAccount(backendPrivateKey as Hex);
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
  const deployerClient = createWalletClient({
    account: deployerAccount,
    chain,
    transport: http(rpcUrl),
  });

  const actualChainId = await publicClient.getChainId();
  if (actualChainId !== network.chainId) {
    throw new Error(`RPC chain ID mismatch. Expected ${network.chainId}, got ${actualChainId}.`);
  }

  const escrow = await readArtifact("out/SponsorshipEscrow.sol/SponsorshipEscrow.json");
  const deployTxHash = await deployerClient.deployContract({
    abi: escrow.abi,
    bytecode: escrow.bytecode.object,
  });
  const deployReceipt = await publicClient.waitForTransactionReceipt({ hash: deployTxHash });
  if (!deployReceipt.contractAddress) {
    throw new Error(`Escrow deployment transaction ${deployTxHash} did not return a contract address.`);
  }

  const escrowAddress = getAddress(deployReceipt.contractAddress);
  let operatorTxHash: Hex | undefined;

  if (backendAccount.address.toLowerCase() !== deployerAccount.address.toLowerCase()) {
    operatorTxHash = await deployerClient.writeContract({
      address: escrowAddress,
      abi: sponsorshipEscrowAbi,
      functionName: "setOperator",
      args: [backendAccount.address, true],
    });
    await publicClient.waitForTransactionReceipt({ hash: operatorTxHash });
  }

  const deployment: DeploymentRecord = {
    network: network.key,
    chainId: network.chainId,
    rpcUrl,
    escrowAddress,
    tokenAddress: network.usdcAddress,
    deployerAddress: deployerAccount.address,
    backendAddress: backendAccount.address,
    deployTxHash,
    operatorTxHash,
  };

  const outputPath = resolve(network.deploymentFile);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(deployment, null, 2)}\n`);

  console.log(JSON.stringify(deployment, null, 2));
  console.log("");
  console.log("Add these runtime values to .env before starting the API:");
  console.log(`RPC_URL="${rpcUrl}"`);
  console.log(`CHAIN_ID=${network.chainId}`);
  console.log(`ESCROW_CONTRACT_ADDRESS="${escrowAddress}"`);
  console.log(`USDC_CONTRACT_ADDRESS="${network.usdcAddress}"`);
  console.log('BACKEND_PRIVATE_KEY="<backend operator private key>"');
  console.log("");
  console.log(`Explorer: ${network.explorerUrl}/address/${escrowAddress}`);
}

async function readArtifact(path: string): Promise<FoundryArtifact> {
  return JSON.parse(await readFile(resolve(path), "utf8")) as FoundryArtifact;
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
