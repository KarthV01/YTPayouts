import {
  createPublicClient,
  createWalletClient,
  defineChain,
  getAddress,
  http,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { sponsorshipEscrowAbi } from "./abi.js";
import { agreementKey, payoutKey } from "./ids.js";

const DEFAULT_LOCAL_RPC_URL = "http://127.0.0.1:8545";
const DEFAULT_LOCAL_CHAIN_ID = 31337;
const DEFAULT_LOCAL_BACKEND_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as Hex;

export type CreateEscrowInput = {
  agreementId: string;
  brand: string;
  creator: string;
  token: string;
  totalCapAmount: string;
  termsHash: Hex;
};

export type ReleasePayoutInput = {
  agreementId: string;
  payoutId: string;
  amount: string;
};

export type ChainWriteResult = {
  txHash: Hex;
};

export type CreateEscrowResult = ChainWriteResult & {
  chainId: number;
  escrowAddress: Address;
  agreementKey: Hex;
};

export interface ChainClient {
  chainId: number;
  escrowAddress: Address;
  defaultTokenAddress?: Address;
  createEscrow(input: CreateEscrowInput): Promise<CreateEscrowResult>;
  releasePayout(input: ReleasePayoutInput): Promise<ChainWriteResult>;
}

export type ChainClientConfig = {
  rpcUrl: string;
  chainId: number;
  escrowAddress: Address;
  defaultTokenAddress?: Address;
  backendPrivateKey: Hex;
};

export class ViemChainClient implements ChainClient {
  public readonly chainId: number;
  public readonly escrowAddress: Address;
  public readonly defaultTokenAddress?: Address;

  private readonly publicClient: ReturnType<typeof createPublicClient>;
  // viem's dynamic-chain generics are stricter than this local-dev wrapper needs.
  private readonly walletClient: ReturnType<typeof createWalletClient> & {
    writeContract(args: unknown): Promise<Hex>;
  };

  constructor(config: ChainClientConfig) {
    const chain = defineChain({
      id: config.chainId,
      name: "Local Sponsorship Chain",
      nativeCurrency: {
        decimals: 18,
        name: "Ether",
        symbol: "ETH",
      },
      rpcUrls: {
        default: {
          http: [config.rpcUrl],
        },
      },
    });

    const account = privateKeyToAccount(config.backendPrivateKey);
    this.chainId = config.chainId;
    this.escrowAddress = getAddress(config.escrowAddress);
    this.defaultTokenAddress = config.defaultTokenAddress ? getAddress(config.defaultTokenAddress) : undefined;
    this.publicClient = createPublicClient({
      chain,
      transport: http(config.rpcUrl),
    });
    this.walletClient = createWalletClient({
      account,
      chain,
      transport: http(config.rpcUrl),
    }) as typeof this.walletClient;
  }

  async createEscrow(input: CreateEscrowInput): Promise<CreateEscrowResult> {
    const key = agreementKey(input.agreementId);
    const txHash = await this.walletClient.writeContract({
      address: this.escrowAddress,
      abi: sponsorshipEscrowAbi,
      functionName: "createEscrow",
      args: [
        key,
        getAddress(input.brand),
        getAddress(input.creator),
        getAddress(input.token),
        BigInt(input.totalCapAmount),
        input.termsHash,
      ],
    });

    await this.publicClient.waitForTransactionReceipt({ hash: txHash });
    return {
      txHash,
      chainId: this.chainId,
      escrowAddress: this.escrowAddress,
      agreementKey: key,
    };
  }

  async releasePayout(input: ReleasePayoutInput): Promise<ChainWriteResult> {
    const txHash = await this.walletClient.writeContract({
      address: this.escrowAddress,
      abi: sponsorshipEscrowAbi,
      functionName: "releasePayout",
      args: [agreementKey(input.agreementId), payoutKey(input.agreementId, input.payoutId), BigInt(input.amount)],
    });

    await this.publicClient.waitForTransactionReceipt({ hash: txHash });
    return { txHash };
  }
}

export function createChainClientFromEnv(): ChainClient | undefined {
  const { RPC_URL, CHAIN_ID, ESCROW_CONTRACT_ADDRESS, USDC_CONTRACT_ADDRESS, BACKEND_PRIVATE_KEY } = process.env;
  const localDeployment = readLocalDeployment();

  const rpcUrl = RPC_URL ?? localDeployment?.rpcUrl ?? DEFAULT_LOCAL_RPC_URL;
  const chainId = Number(CHAIN_ID ?? localDeployment?.chainId ?? DEFAULT_LOCAL_CHAIN_ID);
  const escrowAddress = ESCROW_CONTRACT_ADDRESS || localDeployment?.escrowAddress;
  const tokenAddress = USDC_CONTRACT_ADDRESS || localDeployment?.tokenAddress;
  const backendPrivateKey = (BACKEND_PRIVATE_KEY as Hex | undefined) ?? DEFAULT_LOCAL_BACKEND_PRIVATE_KEY;

  if (!escrowAddress || !tokenAddress) {
    return undefined;
  }

  return new ViemChainClient({
    rpcUrl,
    chainId,
    escrowAddress: getAddress(escrowAddress),
    defaultTokenAddress: getAddress(tokenAddress),
    backendPrivateKey,
  });
}

type LocalDeployment = {
  rpcUrl?: string;
  chainId?: number;
  escrowAddress?: string;
  tokenAddress?: string;
};

function readLocalDeployment(): LocalDeployment | undefined {
  const path = resolve("deployments/local.json");
  if (!existsSync(path)) {
    return undefined;
  }

  try {
    return JSON.parse(readFileSync(path, "utf8")) as LocalDeployment;
  } catch {
    return undefined;
  }
}
