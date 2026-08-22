import type { DemoBrand, DemoCreator, PrismaClient } from "@prisma/client";
import type { ChainClient } from "../blockchain/client.js";
import { DEMO_BRAND_ID } from "./constants.js";
import { ensureDemoProfiles } from "./seedData.js";
import { notFound, serviceUnavailable } from "../http/errors.js";

export async function getDemoBrand(prisma: PrismaClient): Promise<DemoBrand> {
  await ensureDemoProfiles(prisma);
  const brand = await prisma.demoBrand.findUnique({
    where: { id: DEMO_BRAND_ID },
  });

  if (!brand) {
    throw notFound("Demo brand not found. Run npm run seed:demo first.");
  }

  return brand;
}

export async function listDemoBrands(prisma: PrismaClient): Promise<DemoBrand[]> {
  await ensureDemoProfiles(prisma);
  return prisma.demoBrand.findMany({
    orderBy: {
      name: "asc",
    },
  });
}

export async function getDemoCreator(prisma: PrismaClient, creatorId: string): Promise<DemoCreator> {
  await ensureDemoProfiles(prisma);
  const creator = await prisma.demoCreator.findUnique({
    where: { id: creatorId },
  });

  if (!creator) {
    throw notFound("Demo creator not found");
  }

  return creator;
}

export async function listDemoCreators(prisma: PrismaClient): Promise<DemoCreator[]> {
  await ensureDemoProfiles(prisma);
  return prisma.demoCreator.findMany({
    orderBy: {
      displayName: "asc",
    },
  });
}

export function requireChain(chain: ChainClient | undefined): ChainClient {
  if (!chain) {
    throw serviceUnavailable(
      "Blockchain client is not configured. Run Anvil, deploy local contracts, then set .env or keep deployments/local.json.",
    );
  }

  return chain;
}
