import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { seedDemoData } from "../src/demo/seedData.js";
import { FakeChainClient, FakePrisma } from "./support/fakes.js";

describe("demo creator API", () => {
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

  it("auto-seeds demo profiles when the account picker is empty", async () => {
    const emptyPrisma = new FakePrisma();
    const emptyApp = await buildApp({
      prisma: emptyPrisma.asPrisma(),
      logger: false,
    });

    const response = await emptyApp.inject({
      method: "GET",
      url: "/demo/profiles",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.sponsors).toHaveLength(1);
    expect(body.sponsors[0].name).toBe("Stellar Snacks Co.");
    expect(body.creators).toHaveLength(3);

    await emptyApp.close();
    await emptyPrisma.$disconnect();
  });

  it("lists demo sponsor and creator profiles for the account picker", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/demo/profiles",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.sponsors).toHaveLength(1);
    expect(body.sponsors[0].name).toBe("Stellar Snacks Co.");
    expect(body.creators.map((creator: { id: string }) => creator.id)).toEqual([
      "demo_creator_kevin",
      "demo_creator_lena",
      "demo_creator_maya",
    ]);
  });

  it("returns Maya's dashboard with the active snack-box deal", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/demo/creator/demo_creator_maya/dashboard",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.creator.displayName).toBe("Maya Makes");
    expect(body.totals.totalContracts).toBe(1);
    expect(body.totals.byStatus.active).toBe(1);
    expect(body.contracts[0].title).toBe("Back-to-school snack box launch");
    expect(body.contracts[0].demoBrand.name).toBe("Stellar Snacks Co.");
  });

  it("returns Kevin's dashboard with the completed desk-snack deal", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/demo/creator/demo_creator_kevin/dashboard",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.creator.displayName).toBe("Kevin Tech");
    expect(body.totals.totalContracts).toBe(1);
    expect(body.totals.byStatus.completed).toBe(1);
    expect(body.contracts[0].title).toBe("Desk snack bundle review");
    expect(body.totals.releasedPayoutAmount).toBe("3000000000");
  });

  it("returns 404 for an unknown creator", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/demo/creator/demo_creator_nobody/dashboard",
    });

    expect(response.statusCode).toBe(404);
  });

  it("does not let Maya load Kevin's contract", async () => {
    const kevinContracts = await app.inject({
      method: "GET",
      url: "/demo/creator/demo_creator_kevin/contracts",
    });
    const kevinDeal = kevinContracts.json()[0];

    const response = await app.inject({
      method: "GET",
      url: `/demo/creator/demo_creator_maya/contracts/${kevinDeal.id}`,
    });

    expect(response.statusCode).toBe(404);
  });

  it("records simulated metrics on a creator-owned active contract", async () => {
    const contracts = await app.inject({
      method: "GET",
      url: "/demo/creator/demo_creator_maya/contracts",
    });
    const mayaDeal = contracts.json()[0];

    const response = await app.inject({
      method: "POST",
      url: `/demo/creator/demo_creator_maya/contracts/${mayaDeal.id}/metrics`,
      payload: {
        metricKey: "youtube.video.views",
        value: "100000",
        source: "simulation",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.releasedPayoutIds).toHaveLength(1);
    expect(body.agreement.payouts.some((payout: { status: string; kind: string }) => payout.kind === "bonus" && payout.status === "released")).toBe(
      true,
    );
  });
});

describe("demo brand contract actions", () => {
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

  it("funds a draft demo contract through the brand wrapper", async () => {
    const list = await app.inject({
      method: "GET",
      url: "/demo/brand/contracts",
    });
    const draft = list.json().find((contract: { status: string }) => contract.status === "draft");
    expect(draft).toBeTruthy();

    const response = await app.inject({
      method: "POST",
      url: `/demo/brand/contracts/${draft.id}/fund`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe("active");
    expect(response.json().blockchainRecord).toBeTruthy();
  });

  it("approves delivery on an active brand contract", async () => {
    const list = await app.inject({
      method: "GET",
      url: "/demo/brand/contracts",
    });
    const active = list.json().find((contract: { status: string; title: string }) => contract.title === "Back-to-school snack box launch");

    const response = await app.inject({
      method: "POST",
      url: `/demo/brand/contracts/${active.id}/approve-delivery`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.releasedPayoutIds).toHaveLength(1);
    expect(
      body.agreement.payouts.find((payout: { kind: string }) => payout.kind === "base").status,
    ).toBe("released");
  });
});
