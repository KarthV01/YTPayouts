import type { Address, Hex } from "viem";

export type ReadinessReader = {
  getChainId(): Promise<number>;
  getCode(address: Address): Promise<Hex | undefined>;
  isOperator(escrowAddress: Address, backendAddress: Address): Promise<boolean>;
  getTokenBalance(tokenAddress: Address, owner: Address): Promise<bigint>;
  getTokenAllowance(tokenAddress: Address, owner: Address, spender: Address): Promise<bigint>;
};

export type ReadinessConfig = {
  expectedChainId: number;
  escrowAddress: Address;
  usdcAddress: Address;
  backendAddress: Address;
  sponsorAddress: Address;
  totalCapAmount: bigint;
};

export type ReadinessCheck = {
  name: string;
  ok: boolean;
  detail: string;
};

export type ReadinessReport = {
  ok: boolean;
  checks: ReadinessCheck[];
};

export async function checkBaseReadiness(
  reader: ReadinessReader,
  config: ReadinessConfig,
): Promise<ReadinessReport> {
  const checks: ReadinessCheck[] = [];

  const actualChainId = await readOrFail(checks, "rpc-chain-id", () => reader.getChainId());
  checks.push({
    name: "rpc-chain-id",
    ok: actualChainId === config.expectedChainId,
    detail: actualChainId === undefined
      ? `Unable to read chain ID; expected ${config.expectedChainId}.`
      : `Expected ${config.expectedChainId}, got ${actualChainId}.`,
  });

  const escrowCode = await readOrFail(checks, "escrow-contract-code", () => reader.getCode(config.escrowAddress));
  const escrowHasCode = hasContractCode(escrowCode);
  checks.push({
    name: "escrow-contract-code",
    ok: escrowHasCode,
    detail: escrowHasCode
      ? `Escrow contract code found at ${config.escrowAddress}.`
      : `No contract code found at escrow address ${config.escrowAddress}.`,
  });

  const usdcCode = await readOrFail(checks, "usdc-contract-code", () => reader.getCode(config.usdcAddress));
  const usdcHasCode = hasContractCode(usdcCode);
  checks.push({
    name: "usdc-contract-code",
    ok: usdcHasCode,
    detail: usdcHasCode
      ? `USDC contract code found at ${config.usdcAddress}.`
      : `No contract code found at USDC address ${config.usdcAddress}.`,
  });

  if (escrowHasCode) {
    const backendIsOperator = await readOrFail(checks, "backend-operator", () =>
      reader.isOperator(config.escrowAddress, config.backendAddress),
    );
    checks.push({
      name: "backend-operator",
      ok: backendIsOperator === true,
      detail: backendIsOperator
        ? `Backend ${config.backendAddress} is an escrow operator.`
        : `Backend ${config.backendAddress} is not an escrow operator.`,
    });
  }

  if (usdcHasCode) {
    const sponsorBalance = await readOrFail(checks, "sponsor-usdc-balance", () =>
      reader.getTokenBalance(config.usdcAddress, config.sponsorAddress),
    );
    checks.push({
      name: "sponsor-usdc-balance",
      ok: sponsorBalance !== undefined && sponsorBalance >= config.totalCapAmount,
      detail: sponsorBalance === undefined
        ? `Unable to read sponsor balance; need at least ${config.totalCapAmount}.`
        : `Sponsor balance ${sponsorBalance}; required cap ${config.totalCapAmount}.`,
    });

    const sponsorAllowance = await readOrFail(checks, "sponsor-usdc-allowance", () =>
      reader.getTokenAllowance(config.usdcAddress, config.sponsorAddress, config.escrowAddress),
    );
    checks.push({
      name: "sponsor-usdc-allowance",
      ok: sponsorAllowance !== undefined && sponsorAllowance >= config.totalCapAmount,
      detail: sponsorAllowance === undefined
        ? `Unable to read sponsor allowance; need at least ${config.totalCapAmount}.`
        : `Sponsor allowance ${sponsorAllowance}; required cap ${config.totalCapAmount}.`,
    });
  }

  return {
    ok: checks.every((check) => check.ok),
    checks,
  };
}

function hasContractCode(code: Hex | undefined): boolean {
  return Boolean(code && code !== "0x");
}

async function readOrFail<T>(
  checks: ReadinessCheck[],
  name: string,
  read: () => Promise<T>,
): Promise<T | undefined> {
  try {
    return await read();
  } catch (error) {
    checks.push({
      name,
      ok: false,
      detail: (error as Error).message,
    });
    return undefined;
  }
}
