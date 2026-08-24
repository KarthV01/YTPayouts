import { describe, expect, it } from "vitest";
import { demoTokenForChain, getDemoBrandSeed, getDemoCreatorSeeds } from "../src/demo/constants.js";

describe("demo overrides", () => {
  it("overrides demo brand and creator wallets from env-style config", () => {
    const brand = getDemoBrandSeed({
      DEMO_BRAND_WALLET_ADDRESS: "0x1111111111111111111111111111111111111111",
    });
    const creators = getDemoCreatorSeeds({
      DEMO_CREATOR_MAYA_WALLET_ADDRESS: "0x2222222222222222222222222222222222222222",
    });

    expect(brand.walletAddress.toLowerCase()).toBe("0x1111111111111111111111111111111111111111");
    expect(creators.find((creator) => creator.id === "demo_creator_maya")?.walletAddress.toLowerCase()).toBe(
      "0x2222222222222222222222222222222222222222",
    );
  });

  it("labels Base token metadata as USDC", () => {
    expect(demoTokenForChain(84532).symbol).toBe("USDC");
    expect(demoTokenForChain(8453).symbol).toBe("USDC");
    expect(demoTokenForChain(31337).symbol).toBe("mUSDC");
  });
});
