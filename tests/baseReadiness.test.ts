import { describe, expect, it } from "vitest";
import type { Address, Hex } from "viem";
import { checkBaseReadiness, type ReadinessReader } from "../src/blockchain/readiness.js";

const escrowAddress = "0x1111111111111111111111111111111111111111" as Address;
const usdcAddress = "0x2222222222222222222222222222222222222222" as Address;
const backendAddress = "0x3333333333333333333333333333333333333333" as Address;
const sponsorAddress = "0x4444444444444444444444444444444444444444" as Address;

class FakeReadinessReader implements ReadinessReader {
  chainId = 84532;
  code: Hex | undefined = "0x01";
  operator = true;
  balance = 10n;
  allowance = 10n;

  async getChainId() {
    return this.chainId;
  }

  async getCode() {
    return this.code;
  }

  async isOperator() {
    return this.operator;
  }

  async getTokenBalance() {
    return this.balance;
  }

  async getTokenAllowance() {
    return this.allowance;
  }
}

describe("Base readiness checks", () => {
  it("passes when chain, contracts, operator, balance, and allowance are ready", async () => {
    const reader = new FakeReadinessReader();
    const report = await checkBaseReadiness(reader, baseConfig());

    expect(report.ok).toBe(true);
    expect(report.checks.every((check) => check.ok)).toBe(true);
  });

  it("fails on chain ID mismatch", async () => {
    const reader = new FakeReadinessReader();
    reader.chainId = 8453;

    const report = await checkBaseReadiness(reader, baseConfig());
    const chainCheck = report.checks.find((check) => check.name === "rpc-chain-id");

    expect(report.ok).toBe(false);
    expect(chainCheck?.ok).toBe(false);
  });

  it("fails when backend is not operator or sponsor cannot cover the cap", async () => {
    const reader = new FakeReadinessReader();
    reader.operator = false;
    reader.balance = 5n;
    reader.allowance = 3n;

    const report = await checkBaseReadiness(reader, baseConfig());
    const checks = new Map(report.checks.map((check) => [check.name, check.ok]));

    expect(report.ok).toBe(false);
    expect(checks.get("backend-operator")).toBe(false);
    expect(checks.get("sponsor-usdc-balance")).toBe(false);
    expect(checks.get("sponsor-usdc-allowance")).toBe(false);
  });

  it("fails when escrow or USDC addresses do not have contract code", async () => {
    const reader = new FakeReadinessReader();
    reader.code = "0x";

    const report = await checkBaseReadiness(reader, baseConfig());
    const checks = new Map(report.checks.map((check) => [check.name, check.ok]));

    expect(report.ok).toBe(false);
    expect(checks.get("escrow-contract-code")).toBe(false);
    expect(checks.get("usdc-contract-code")).toBe(false);
  });
});

function baseConfig() {
  return {
    expectedChainId: 84532,
    escrowAddress,
    usdcAddress,
    backendAddress,
    sponsorAddress,
    totalCapAmount: 10n,
  };
}
