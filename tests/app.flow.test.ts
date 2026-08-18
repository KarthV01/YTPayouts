import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import type { ChainClient, CreateEscrowInput, ReleasePayoutInput } from "../src/blockchain/client.js";

class FakeChainClient implements ChainClient {
  chainId = 31337;
  escrowAddress = "0x3333333333333333333333333333333333333333" as const;
  defaultTokenAddress = "0x4444444444444444444444444444444444444444" as const;
  createdEscrows: CreateEscrowInput[] = [];
  releasedPayouts: ReleasePayoutInput[] = [];

  async createEscrow(input: CreateEscrowInput) {
    this.createdEscrows.push(input);
    return {
      txHash: `0x${"a".repeat(64)}` as const,
      chainId: this.chainId,
      escrowAddress: this.escrowAddress,
      agreementKey: `0x${"b".repeat(64)}` as const,
    };
  }

  async releasePayout(input: ReleasePayoutInput) {
    this.releasedPayouts.push(input);
    return {
      txHash: `0x${"c".repeat(64)}` as const,
    };
  }
}

type AgreementRow = {
  id: string;
  title: string | null;
  deliverableDescription: string;
  deadline: Date;
  measurementWindowDays: number;
  totalCapAmount: string;
  tokenAddress: string | null;
  status: string;
  termsHash: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ParticipantRow = {
  id: string;
  agreementId: string;
  role: string;
  walletAddress: string;
  handle: string | null;
  displayName: string | null;
  createdAt: Date;
};

type MetricRow = {
  id: string;
  agreementId: string;
  key: string;
  label: string | null;
  createdAt: Date;
};

type ConditionRow = {
  id: string;
  payoutId: string;
  metricId: string;
  operator: string;
  threshold: string;
};

type PayoutRow = {
  id: string;
  agreementId: string;
  kind: string;
  label: string;
  amount: string;
  status: string;
  releasedAt: Date | null;
  releasedTxHash: string | null;
  createdAt: Date;
};

type ObservationRow = {
  id: string;
  agreementId: string;
  metricId: string;
  value: string;
  source: string;
  observedAt: Date;
  createdAt: Date;
};

type BlockchainRecordRow = {
  id: string;
  agreementId: string;
  chainId: number;
  escrowAddress: string;
  agreementKey: string;
  tokenAddress: string;
  totalCapAmount: string;
  termsHash: string;
  createTxHash: string;
  createdAt: Date;
};

class FakePrisma {
  private sequence = 0;
  private agreements: AgreementRow[] = [];
  private participants: ParticipantRow[] = [];
  private metrics: MetricRow[] = [];
  private conditions: ConditionRow[] = [];
  private payouts: PayoutRow[] = [];
  private observations: ObservationRow[] = [];
  private blockchainRecords: BlockchainRecordRow[] = [];

  agreement = {
    create: async ({ data }: { data: Partial<AgreementRow> }) => {
      const now = new Date();
      const row: AgreementRow = {
        id: this.id("agreement"),
        title: data.title ?? null,
        deliverableDescription: data.deliverableDescription!,
        deadline: data.deadline!,
        measurementWindowDays: data.measurementWindowDays!,
        totalCapAmount: data.totalCapAmount!,
        tokenAddress: data.tokenAddress ?? null,
        status: data.status ?? "draft",
        termsHash: data.termsHash ?? null,
        createdAt: now,
        updatedAt: now,
      };
      this.agreements.push(row);
      return row;
    },
    findUnique: async ({ where }: { where: { id: string } }) => this.hydrateAgreement(where.id),
    update: async ({ where, data }: { where: { id: string }; data: Partial<AgreementRow> }) => {
      const row = this.agreements.find((agreement) => agreement.id === where.id);
      if (!row) throw new Error("Agreement not found");
      Object.assign(row, data, { updatedAt: new Date() });
      return row;
    },
  };

  participant = {
    createMany: async ({ data }: { data: Array<Partial<ParticipantRow>> }) => {
      for (const input of data) {
        this.participants.push({
          id: this.id("participant"),
          agreementId: input.agreementId!,
          role: input.role!,
          walletAddress: input.walletAddress!,
          handle: input.handle ?? null,
          displayName: input.displayName ?? null,
          createdAt: new Date(),
        });
      }
      return { count: data.length };
    },
  };

  metric = {
    create: async ({ data }: { data: Partial<MetricRow> }) => {
      const row: MetricRow = {
        id: this.id("metric"),
        agreementId: data.agreementId!,
        key: data.key!,
        label: data.label ?? null,
        createdAt: new Date(),
      };
      this.metrics.push(row);
      return row;
    },
  };

  payout = {
    create: async ({ data }: { data: Partial<PayoutRow> & { condition?: { create: Partial<ConditionRow> } } }) => {
      const row: PayoutRow = {
        id: this.id("payout"),
        agreementId: data.agreementId!,
        kind: data.kind!,
        label: data.label!,
        amount: data.amount!,
        status: data.status ?? "pending",
        releasedAt: null,
        releasedTxHash: null,
        createdAt: new Date(),
      };
      this.payouts.push(row);

      if (data.condition) {
        this.conditions.push({
          id: this.id("condition"),
          payoutId: row.id,
          metricId: data.condition.create.metricId!,
          operator: data.condition.create.operator!,
          threshold: data.condition.create.threshold!,
        });
      }

      return row;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<PayoutRow> }) => {
      const row = this.payouts.find((payout) => payout.id === where.id);
      if (!row) throw new Error("Payout not found");
      Object.assign(row, data);
      return row;
    },
  };

  metricObservation = {
    create: async ({ data }: { data: Partial<ObservationRow> }) => {
      const row: ObservationRow = {
        id: this.id("observation"),
        agreementId: data.agreementId!,
        metricId: data.metricId!,
        value: data.value!,
        source: data.source!,
        observedAt: data.observedAt ?? new Date(),
        createdAt: new Date(),
      };
      this.observations.push(row);
      return row;
    },
  };

  blockchainRecord = {
    create: async ({ data }: { data: Partial<BlockchainRecordRow> }) => {
      const row: BlockchainRecordRow = {
        id: this.id("blockchainRecord"),
        agreementId: data.agreementId!,
        chainId: data.chainId!,
        escrowAddress: data.escrowAddress!,
        agreementKey: data.agreementKey!,
        tokenAddress: data.tokenAddress!,
        totalCapAmount: data.totalCapAmount!,
        termsHash: data.termsHash!,
        createTxHash: data.createTxHash!,
        createdAt: new Date(),
      };
      this.blockchainRecords.push(row);
      return row;
    },
  };

  async $transaction<T>(work: ((tx: this) => Promise<T>) | Array<Promise<unknown>>): Promise<T> {
    if (typeof work === "function") {
      return work(this);
    }

    return Promise.all(work) as Promise<T>;
  }

  async $disconnect() {
    return undefined;
  }

  private id(prefix: string): string {
    this.sequence += 1;
    return `${prefix}_${this.sequence}`;
  }

  private hydrateAgreement(id: string) {
    const agreement = this.agreements.find((candidate) => candidate.id === id);
    if (!agreement) return null;

    const metrics = this.metrics
      .filter((metric) => metric.agreementId === id)
      .sort((a, b) => a.key.localeCompare(b.key));

    const payouts = this.payouts
      .filter((payout) => payout.agreementId === id)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((payout) => {
        const condition = this.conditions.find((candidate) => candidate.payoutId === payout.id);
        const metric = condition ? this.metrics.find((candidate) => candidate.id === condition.metricId)! : undefined;
        return {
          ...payout,
          condition: condition
            ? {
                ...condition,
                metric,
              }
            : null,
        };
      });

    const observations = this.observations
      .filter((observation) => observation.agreementId === id)
      .sort((a, b) => b.observedAt.getTime() - a.observedAt.getTime())
      .map((observation) => ({
        ...observation,
        metric: this.metrics.find((metric) => metric.id === observation.metricId)!,
      }));

    return {
      ...agreement,
      participants: this.participants
        .filter((participant) => participant.agreementId === id)
        .sort((a, b) => a.role.localeCompare(b.role)),
      metrics,
      payouts,
      observations,
      blockchainRecord: this.blockchainRecords.find((record) => record.agreementId === id) ?? null,
    };
  }
}

describe("agreement API flow", () => {
  let prisma: FakePrisma;
  let app: Awaited<ReturnType<typeof buildApp>>;
  let chain: FakeChainClient;

  beforeAll(async () => {
    prisma = new FakePrisma();
    chain = new FakeChainClient();
    app = await buildApp({
      prisma: prisma as unknown as PrismaClient,
      chain,
      logger: false,
    });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("creates, accepts, funds, approves delivery, and releases simulated metric bonuses idempotently", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/agreements",
      payload: {
        deliverableDescription: "Creator publishes one sponsored integration.",
        deadline: "2026-09-30T00:00:00.000Z",
        totalCapAmount: "2500000000",
        participants: {
          brand: {
            walletAddress: "0x1111111111111111111111111111111111111111",
          },
          creator: {
            walletAddress: "0x2222222222222222222222222222222222222222",
          },
        },
        payouts: [
          {
            kind: "base",
            label: "Base payout",
            amount: "2000000000",
          },
          {
            kind: "bonus",
            label: "100k views",
            amount: "500000000",
            condition: {
              metricKey: "youtube.video.views",
              operator: "gte",
              threshold: "100000",
            },
          },
        ],
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const created = createResponse.json();
    expect(created.status).toBe("draft");

    const acceptResponse = await app.inject({
      method: "POST",
      url: `/agreements/${created.id}/accept`,
    });

    expect(acceptResponse.statusCode).toBe(200);
    expect(acceptResponse.json().status).toBe("active");
    expect(chain.createdEscrows).toHaveLength(1);

    const deliveryResponse = await app.inject({
      method: "POST",
      url: `/agreements/${created.id}/approve-delivery`,
    });

    expect(deliveryResponse.statusCode).toBe(200);
    expect(deliveryResponse.json().releasedPayoutIds).toHaveLength(1);
    expect(chain.releasedPayouts).toHaveLength(1);

    const metricResponse = await app.inject({
      method: "POST",
      url: `/agreements/${created.id}/metrics`,
      payload: {
        metricKey: "youtube.video.views",
        value: "100000",
      },
    });

    expect(metricResponse.statusCode).toBe(200);
    expect(metricResponse.json().releasedPayoutIds).toHaveLength(1);
    expect(chain.releasedPayouts).toHaveLength(2);

    const repeatedMetricResponse = await app.inject({
      method: "POST",
      url: `/agreements/${created.id}/metrics`,
      payload: {
        metricKey: "youtube.video.views",
        value: "250000",
      },
    });

    expect(repeatedMetricResponse.statusCode).toBe(200);
    expect(repeatedMetricResponse.json().releasedPayoutIds).toHaveLength(0);
    expect(chain.releasedPayouts).toHaveLength(2);
  });
});
