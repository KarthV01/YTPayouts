import { describe, expect, it } from "vitest";
import { resolveChainClientConfig, type LocalDeployment } from "../src/blockchain/client.js";
import { DEFAULT_LOCAL_BACKEND_PRIVATE_KEY } from "../src/blockchain/networks.js";

const escrowAddress = "0x1111111111111111111111111111111111111111";
const tokenAddress = "0x2222222222222222222222222222222222222222";
const backendPrivateKey = `0x${"1".repeat(64)}`;

describe("chain client config", () => {
  it("returns undefined when local escrow addresses are not configured", () => {
    expect(resolveChainClientConfig({})).toBeUndefined();
  });

  it("resolves local deployments with local defaults", () => {
    const localDeployment: LocalDeployment = {
      chainId: 31337,
      rpcUrl: "http://127.0.0.1:8545",
      escrowAddress,
      tokenAddress,
    };

    const config = resolveChainClientConfig({}, localDeployment);

    expect(config?.chainId).toBe(31337);
    expect(config?.backendPrivateKey).toBe(DEFAULT_LOCAL_BACKEND_PRIVATE_KEY);
    expect(config?.escrowAddress.toLowerCase()).toBe(escrowAddress);
  });

  it("requires explicit env config for non-local chains", () => {
    expect(() =>
      resolveChainClientConfig({
        CHAIN_ID: "8453",
        RPC_URL: "https://mainnet.base.org",
        ESCROW_CONTRACT_ADDRESS: escrowAddress,
        USDC_CONTRACT_ADDRESS: tokenAddress,
      }),
    ).toThrow(/BACKEND_PRIVATE_KEY/);
  });

  it("rejects the default Anvil key outside the local chain", () => {
    expect(() =>
      resolveChainClientConfig({
        CHAIN_ID: "8453",
        RPC_URL: "https://mainnet.base.org",
        ESCROW_CONTRACT_ADDRESS: escrowAddress,
        USDC_CONTRACT_ADDRESS: tokenAddress,
        BACKEND_PRIVATE_KEY: DEFAULT_LOCAL_BACKEND_PRIVATE_KEY,
      }),
    ).toThrow(/default Anvil private key/);
  });

  it("resolves explicit Base mainnet config", () => {
    const config = resolveChainClientConfig({
      CHAIN_ID: "8453",
      RPC_URL: "https://mainnet.base.org",
      ESCROW_CONTRACT_ADDRESS: escrowAddress,
      USDC_CONTRACT_ADDRESS: tokenAddress,
      BACKEND_PRIVATE_KEY: backendPrivateKey,
    });

    expect(config?.chainId).toBe(8453);
    expect(config?.rpcUrl).toBe("https://mainnet.base.org");
    expect(config?.defaultTokenAddress?.toLowerCase()).toBe(tokenAddress);
  });
});
