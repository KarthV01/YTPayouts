import type { PrismaClient } from "@prisma/client";
import type { ChainClient } from "../blockchain/client.js";
import { CONDITION_OPERATOR, PAYOUT_KIND, PAYOUT_STATUS, PARTICIPANT_ROLE } from "../domain/status.js";
import { createAgreementSchema } from "../domain/validation.js";
import {
  completeIfCapReached,
  createAgreementFromInput,
  fundAgreementEscrow,
  releasePayoutAndMark,
  type AgreementView,
  agreementInclude,
} from "../services/agreementService.js";
import { getDemoBrandSeed, getDemoCreatorSeeds } from "./constants.js";

type DemoAgreementDefinition = {
  title: string;
  creatorId: string;
  deliverableDescription: string;
  deadline: string;
  measurementWindowDays: number;
  totalCapAmount: string;
  basePayoutAmount: string;
  targetStatus: "draft" | "active" | "completed";
  viewMilestones: Array<{
    views: string;
    bonusAmount: string;
  }>;
  observations?: Array<{
    metricKey: string;
    value: string;
    source: string;
  }>;
};

const DEMO_AGREEMENTS: DemoAgreementDefinition[] = [
  {
    title: "Back-to-school snack box launch",
    creatorId: "demo_creator_maya",
    deliverableDescription: "Dedicated snack box taste-test segment in a back-to-school meal prep video.",
    deadline: "2026-09-15T00:00:00.000Z",
    measurementWindowDays: 30,
    totalCapAmount: "3500000000",
    basePayoutAmount: "2000000000",
    targetStatus: "active",
    viewMilestones: [
      { views: "100000", bonusAmount: "500000000" },
      { views: "250000", bonusAmount: "1000000000" },
    ],
    observations: [
      {
        metricKey: "youtube.video.views",
        value: "85000",
        source: "seed.simulation",
      },
    ],
  },
  {
    title: "Protein crisp creator test",
    creatorId: "demo_creator_lena",
    deliverableDescription: "Short-form workout recovery integration featuring protein crisp samples.",
    deadline: "2026-10-01T00:00:00.000Z",
    measurementWindowDays: 21,
    totalCapAmount: "2500000000",
    basePayoutAmount: "1500000000",
    targetStatus: "draft",
    viewMilestones: [
      { views: "75000", bonusAmount: "500000000" },
      { views: "150000", bonusAmount: "500000000" },
    ],
  },
  {
    title: "Desk snack bundle review",
    creatorId: "demo_creator_kevin",
    deliverableDescription: "Mid-roll integration in a desk setup review with a tracked campaign link.",
    deadline: "2026-08-30T00:00:00.000Z",
    measurementWindowDays: 30,
    totalCapAmount: "3000000000",
    basePayoutAmount: "1500000000",
    targetStatus: "completed",
    viewMilestones: [
      { views: "100000", bonusAmount: "500000000" },
      { views: "250000", bonusAmount: "1000000000" },
    ],
    observations: [
      {
        metricKey: "youtube.video.views",
        value: "311000",
        source: "seed.simulation",
      },
    ],
  },
];

const profileSeedInFlight = new WeakMap<PrismaClient, ReturnType<typeof upsertDemoProfiles>>();

export async function ensureDemoProfiles(prisma: PrismaClient) {
  const existing = profileSeedInFlight.get(prisma);
  if (existing) {
    return existing;
  }

  const work = upsertDemoProfiles(prisma).finally(() => {
    profileSeedInFlight.delete(prisma);
  });
  profileSeedInFlight.set(prisma, work);
  return work;
}

async function upsertDemoProfiles(prisma: PrismaClient) {
  const demoBrand = getDemoBrandSeed();
  const demoCreators = getDemoCreatorSeeds();

  const brand = await prisma.demoBrand.upsert({
    where: { id: demoBrand.id },
    update: {
      name: demoBrand.name,
      handle: demoBrand.handle,
      walletAddress: demoBrand.walletAddress,
      industry: demoBrand.industry,
      websiteUrl: demoBrand.websiteUrl,
      logoUrl: demoBrand.logoUrl,
      monthlyBudgetAmount: demoBrand.monthlyBudgetAmount,
    },
    create: demoBrand,
  });

  const creators = [];
  for (const creator of demoCreators) {
    creators.push(
      await prisma.demoCreator.upsert({
        where: { id: creator.id },
        update: creator,
        create: creator,
      }),
    );
  }

  return { brand, creators };
}

export async function seedDemoData(prisma: PrismaClient, chain: ChainClient) {
  const { brand, creators } = await ensureDemoProfiles(prisma);
  const createdAgreementIds: string[] = [];
  const skippedAgreementIds: string[] = [];

  for (const definition of DEMO_AGREEMENTS) {
    const existing = await findSeededAgreement(prisma, definition.title, brand.walletAddress);
    if (existing) {
      skippedAgreementIds.push(existing.id);
      continue;
    }

    const creator = creators.find((candidate) => candidate.id === definition.creatorId);
    if (!creator) {
      throw new Error(`Missing demo creator ${definition.creatorId}`);
    }

    const agreementInput = createAgreementSchema.parse({
      title: definition.title,
      deliverableDescription: definition.deliverableDescription,
      deadline: definition.deadline,
      measurementWindowDays: definition.measurementWindowDays,
      totalCapAmount: definition.totalCapAmount,
      tokenAddress: chain.defaultTokenAddress,
      participants: {
        brand: {
          walletAddress: brand.walletAddress,
          handle: brand.handle,
          displayName: brand.name,
        },
        creator: {
          walletAddress: creator.walletAddress,
          handle: creator.handle,
          displayName: creator.displayName,
        },
      },
      payouts: [
        {
          kind: PAYOUT_KIND.base,
          label: "Base payout",
          amount: definition.basePayoutAmount,
        },
        ...definition.viewMilestones.map((milestone) => ({
          kind: PAYOUT_KIND.bonus,
          label: `${milestone.views} views milestone`,
          amount: milestone.bonusAmount,
          condition: {
            metricKey: "youtube.video.views",
            operator: CONDITION_OPERATOR.gte,
            threshold: milestone.views,
          },
        })),
      ],
    });

    const draft = await createAgreementFromInput(prisma, agreementInput);
    let agreement = draft;

    if (definition.targetStatus === "active" || definition.targetStatus === "completed") {
      agreement = await fundAgreementEscrow(prisma, chain, draft.id);
    }

    for (const observation of definition.observations ?? []) {
      await recordSeedObservation(prisma, agreement, observation);
    }

    if (definition.targetStatus === "completed") {
      for (const payout of agreement.payouts.filter((candidate) => candidate.status === PAYOUT_STATUS.pending)) {
        await releasePayoutAndMark(prisma, chain, agreement.id, payout.id, payout.amount);
      }
      await completeIfCapReached(prisma, agreement.id);
    }

    createdAgreementIds.push(agreement.id);
  }

  return {
    brandId: brand.id,
    creatorCount: creators.length,
    createdAgreementIds,
    skippedAgreementIds,
  };
}

async function findSeededAgreement(
  prisma: PrismaClient,
  title: string,
  brandWalletAddress: string,
): Promise<AgreementView | null> {
  return prisma.agreement.findFirst({
    where: {
      title,
      participants: {
        some: {
          role: PARTICIPANT_ROLE.brand,
          walletAddress: brandWalletAddress,
        },
      },
    },
    include: agreementInclude,
  });
}

async function recordSeedObservation(
  prisma: PrismaClient,
  agreement: AgreementView,
  observation: { metricKey: string; value: string; source: string },
) {
  const metric = agreement.metrics.find((candidate) => candidate.key === observation.metricKey);
  if (!metric) {
    return;
  }

  await prisma.metricObservation.create({
    data: {
      agreementId: agreement.id,
      metricId: metric.id,
      value: observation.value,
      source: observation.source,
      observedAt: new Date(),
    },
  });
}
