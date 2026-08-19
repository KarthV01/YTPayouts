import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { ensureDemoProfiles, seedDemoData } from "../src/demo/seedData.js";
import { FakeChainClient, FakePrisma } from "./support/fakes.js";

describe("demo brand API", () => {
  let prisma: FakePrisma;
  let app: Awaited<ReturnType<typeof buildApp>>;
  let chain: FakeChainClient;

  beforeAll(async () => {
    prisma = new FakePrisma();
    chain = new FakeChainClient();
    await seedDemoData(prisma.asPrisma(), chain);
    app = await buildApp({
      prisma: prisma.asPrisma(),
      chain,
      logger: false,
    });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("returns a dashboard with fake brand profile, money totals, and multiple contract statuses", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/demo/brand/dashboard",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.brand.name).toBe("Stellar Snacks Co.");
    expect(body.totals.totalContracts).toBe(3);
    expect(body.totals.byStatus.draft).toBe(1);
    expect(body.totals.byStatus.active).toBe(1);
    expect(body.totals.byStatus.completed).toBe(1);
    expect(body.totals.escrowedCapAmount).toBe("6500000000");
    expect(body.totals.releasedPayoutAmount).toBe("3000000000");
    expect(body.contracts[0].demoCreator).toBeTruthy();
  });

  it("returns contract-builder metadata for a future frontend", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/demo/brand/contract-builder",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.creators).toHaveLength(3);
    expect(body.metrics.map((metric: { key: string }) => metric.key)).toContain("youtube.video.views");
    expect(body.token.symbol).toBe("mUSDC");
    expect(body.defaults.measurementWindowDays).toBe(30);
  });

  it("creates and funds a new demo contract from brand-friendly form fields", async () => {
    const initialEscrowCount = chain.createdEscrows.length;
    const response = await app.inject({
      method: "POST",
      url: "/demo/brand/contracts",
      payload: {
        creatorId: "demo_creator_maya",
        title: "New crunch challenge",
        deliverableDescription: "Creator records one sponsored snack challenge integration.",
        deadline: "2026-11-01T00:00:00.000Z",
        measurementWindowDays: 30,
        basePayoutAmount: "2000000000",
        totalCapAmount: "3500000000",
        viewMilestones: [
          { views: 100000, bonusAmount: "500000000" },
          { views: 250000, bonusAmount: "1000000000" },
        ],
        metricBonuses: [],
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.status).toBe("active");
    expect(body.blockchainRecord.totalCapAmount).toBe("3500000000");
    expect(body.demoCreator.handle).toBe("@MayaMakes");
    expect(chain.createdEscrows).toHaveLength(initialEscrowCount + 1);
    expect(chain.createdEscrows.at(-1)?.totalCapAmount).toBe("3500000000");
  });

  it("rejects abbreviated builder thresholds", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/demo/brand/contracts",
      payload: {
        creatorId: "demo_creator_maya",
        title: "Bad threshold",
        deliverableDescription: "Creator records one sponsored integration.",
        deadline: "2026-11-01T00:00:00.000Z",
        basePayoutAmount: "2000000000",
        totalCapAmount: "2500000000",
        viewMilestones: [{ views: "100K", bonusAmount: "500000000" }],
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("seeds demo profiles idempotently", async () => {
    const isolatedPrisma = new FakePrisma();
    await ensureDemoProfiles(isolatedPrisma.asPrisma());
    const firstSnapshot = isolatedPrisma.snapshot();
    await ensureDemoProfiles(isolatedPrisma.asPrisma());

    expect(isolatedPrisma.snapshot()).toEqual(firstSnapshot);
  });
});
