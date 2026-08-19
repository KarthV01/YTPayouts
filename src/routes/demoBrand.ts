import type { DemoBrand, DemoCreator, PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import type { ChainClient } from "../blockchain/client.js";
import { DEMO_BRAND_ID, DEMO_METRICS, DEMO_TOKEN } from "../demo/constants.js";
import { buildAgreementInputFromDemoContractForm, demoContractFormSchema } from "../demo/contractBuilder.js";
import { PAYOUT_STATUS, PARTICIPANT_ROLE } from "../domain/status.js";
import { notFound, serviceUnavailable } from "../http/errors.js";
import {
  createAgreementFromInput,
  fundAgreementEscrow,
  getAgreement,
  listAgreementsForBrandWallet,
  type AgreementView,
} from "../services/agreementService.js";

type RouteDeps = {
  prisma: PrismaClient;
  chain?: ChainClient;
};

export async function registerDemoBrandRoutes(app: FastifyInstance, deps: RouteDeps) {
  const { prisma } = deps;

  app.get("/demo/brand/dashboard", async () => {
    const brand = await getDemoBrand(prisma);
    const creators = await listDemoCreators(prisma);
    const agreements = await listAgreementsForBrandWallet(prisma, brand.walletAddress);
    const summaries = agreements.map((agreement) => summarizeAgreement(agreement, brand, creators));

    return {
      brand,
      totals: buildDashboardTotals(agreements),
      contracts: summaries,
    };
  });

  app.get("/demo/brand/contract-builder", async () => {
    const brand = await getDemoBrand(prisma);
    const creators = await listDemoCreators(prisma);

    return {
      brand,
      creators,
      metrics: DEMO_METRICS,
      token: {
        ...DEMO_TOKEN,
        address: deps.chain?.defaultTokenAddress ?? null,
      },
      defaults: {
        measurementWindowDays: 30,
        viewMilestones: [
          { views: "100000", bonusAmount: "500000000" },
          { views: "250000", bonusAmount: "1000000000" },
          { views: "500000", bonusAmount: "2000000000" },
        ],
      },
    };
  });

  app.get("/demo/brand/contracts", async () => {
    const brand = await getDemoBrand(prisma);
    const creators = await listDemoCreators(prisma);
    const agreements = await listAgreementsForBrandWallet(prisma, brand.walletAddress);

    return agreements.map((agreement) => enrichAgreement(agreement, brand, creators));
  });

  app.get<{ Params: { id: string } }>("/demo/brand/contracts/:id", async (request) => {
    const brand = await getDemoBrand(prisma);
    const creators = await listDemoCreators(prisma);
    const agreement = await getAgreement(prisma, request.params.id);
    const brandParticipant = agreement.participants.find(
      (participant) =>
        participant.role === PARTICIPANT_ROLE.brand &&
        participant.walletAddress.toLowerCase() === brand.walletAddress.toLowerCase(),
    );

    if (!brandParticipant) {
      throw notFound("Demo brand contract not found");
    }

    return enrichAgreement(agreement, brand, creators);
  });

  app.post("/demo/brand/contracts", async (request, reply) => {
    const chain = requireChain(deps.chain);
    if (!chain.defaultTokenAddress) {
      throw serviceUnavailable("No mock USDC token address is configured");
    }

    const input = demoContractFormSchema.parse(request.body);
    const brand = await getDemoBrand(prisma);
    const creators = await listDemoCreators(prisma);
    const creator = creators.find((candidate) => candidate.id === input.creatorId);

    if (!creator) {
      throw notFound("Demo creator not found");
    }

    const agreementInput = buildAgreementInputFromDemoContractForm(input, brand, creator, chain.defaultTokenAddress);
    const draft = await createAgreementFromInput(prisma, agreementInput);
    const funded = await fundAgreementEscrow(prisma, chain, draft.id);

    return reply.code(201).send(enrichAgreement(funded, brand, creators));
  });
}

async function getDemoBrand(prisma: PrismaClient): Promise<DemoBrand> {
  const brand = await prisma.demoBrand.findUnique({
    where: { id: DEMO_BRAND_ID },
  });

  if (!brand) {
    throw notFound("Demo brand not found. Run npm run seed:demo first.");
  }

  return brand;
}

async function listDemoCreators(prisma: PrismaClient): Promise<DemoCreator[]> {
  return prisma.demoCreator.findMany({
    orderBy: {
      displayName: "asc",
    },
  });
}

function buildDashboardTotals(agreements: AgreementView[]) {
  const byStatus = agreements.reduce<Record<string, number>>((acc, agreement) => {
    acc[agreement.status] = (acc[agreement.status] ?? 0) + 1;
    return acc;
  }, {});

  return {
    totalContracts: agreements.length,
    byStatus,
    escrowedCapAmount: sumAmounts(
      agreements
        .filter((agreement) => agreement.blockchainRecord)
        .map((agreement) => agreement.blockchainRecord!.totalCapAmount),
    ),
    releasedPayoutAmount: sumAmounts(
      agreements.flatMap((agreement) =>
        agreement.payouts
          .filter((payout) => payout.status === PAYOUT_STATUS.released)
          .map((payout) => payout.amount),
      ),
    ),
    pendingPayoutAmount: sumAmounts(
      agreements.flatMap((agreement) =>
        agreement.payouts
          .filter((payout) => payout.status === PAYOUT_STATUS.pending)
          .map((payout) => payout.amount),
      ),
    ),
  };
}

function enrichAgreement(agreement: AgreementView, brand: DemoBrand, creators: DemoCreator[]) {
  return {
    ...agreement,
    demoBrand: brand,
    demoCreator: findAgreementCreator(agreement, creators),
    financials: buildAgreementFinancials(agreement),
  };
}

function summarizeAgreement(agreement: AgreementView, brand: DemoBrand, creators: DemoCreator[]) {
  return {
    id: agreement.id,
    title: agreement.title,
    status: agreement.status,
    deadline: agreement.deadline,
    measurementWindowDays: agreement.measurementWindowDays,
    totalCapAmount: agreement.totalCapAmount,
    termsHash: agreement.termsHash,
    blockchainRecord: agreement.blockchainRecord,
    demoBrand: {
      id: brand.id,
      name: brand.name,
      handle: brand.handle,
    },
    demoCreator: findAgreementCreator(agreement, creators),
    financials: buildAgreementFinancials(agreement),
  };
}

function buildAgreementFinancials(agreement: AgreementView) {
  return {
    totalCapAmount: agreement.totalCapAmount,
    releasedPayoutAmount: sumAmounts(
      agreement.payouts
        .filter((payout) => payout.status === PAYOUT_STATUS.released)
        .map((payout) => payout.amount),
    ),
    pendingPayoutAmount: sumAmounts(
      agreement.payouts
        .filter((payout) => payout.status === PAYOUT_STATUS.pending)
        .map((payout) => payout.amount),
    ),
  };
}

function findAgreementCreator(agreement: AgreementView, creators: DemoCreator[]) {
  const participant = agreement.participants.find((candidate) => candidate.role === PARTICIPANT_ROLE.creator);
  if (!participant) {
    return null;
  }

  return (
    creators.find((creator) => creator.walletAddress.toLowerCase() === participant.walletAddress.toLowerCase()) ?? {
      id: null,
      handle: participant.handle,
      displayName: participant.displayName,
      walletAddress: participant.walletAddress,
    }
  );
}

function sumAmounts(amounts: string[]): string {
  return amounts.reduce((sum, amount) => sum + BigInt(amount), 0n).toString();
}

function requireChain(chain: ChainClient | undefined): ChainClient {
  if (!chain) {
    throw serviceUnavailable(
      "Blockchain client is not configured. Run Anvil, deploy local contracts, then set .env or keep deployments/local.json.",
    );
  }

  return chain;
}
