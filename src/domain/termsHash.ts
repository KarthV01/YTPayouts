import { keccak256, toBytes, type Hex } from "viem";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function stable(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(stable);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, stable(nested)]),
    );
  }

  return value;
}

export function stableStringify(value: JsonValue): string {
  return JSON.stringify(stable(value));
}

export function hashTerms(value: JsonValue): Hex {
  return keccak256(toBytes(stableStringify(value)));
}

export type AgreementTermsSource = {
  id: string;
  title: string | null;
  deliverableDescription: string;
  deadline: Date;
  measurementWindowDays: number;
  totalCapAmount: string;
  tokenAddress: string | null;
  participants: Array<{
    role: string;
    walletAddress: string;
    handle: string | null;
    displayName: string | null;
  }>;
  metrics: Array<{
    key: string;
    label: string | null;
  }>;
  payouts: Array<{
    id: string;
    kind: string;
    label: string;
    amount: string;
    condition: null | {
      operator: string;
      threshold: string;
      metric: {
        key: string;
      };
    };
  }>;
};

export function buildTermsSnapshot(agreement: AgreementTermsSource): JsonValue {
  return {
    agreementId: agreement.id,
    title: agreement.title,
    deliverableDescription: agreement.deliverableDescription,
    deadline: agreement.deadline.toISOString(),
    measurementWindowDays: agreement.measurementWindowDays,
    totalCapAmount: agreement.totalCapAmount,
    tokenAddress: agreement.tokenAddress,
    participants: agreement.participants
      .map((participant) => ({
        role: participant.role,
        walletAddress: participant.walletAddress.toLowerCase(),
        handle: participant.handle,
        displayName: participant.displayName,
      }))
      .sort((a, b) => a.role.localeCompare(b.role)),
    metrics: agreement.metrics
      .map((metric) => ({
        key: metric.key,
        label: metric.label,
      }))
      .sort((a, b) => a.key.localeCompare(b.key)),
    payouts: agreement.payouts
      .map((payout) => ({
        id: payout.id,
        kind: payout.kind,
        label: payout.label,
        amount: payout.amount,
        condition: payout.condition
          ? {
              metricKey: payout.condition.metric.key,
              operator: payout.condition.operator,
              threshold: payout.condition.threshold,
            }
          : null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
}
