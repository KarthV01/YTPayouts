import type { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import type { ChainClient } from "../blockchain/client.js";
import { DEMO_METRICS, demoTokenForChain } from "../demo/constants.js";
import { buildAgreementInputFromDemoContractForm, demoContractFormSchema } from "../demo/contractBuilder.js";
import { getDemoBrand, listDemoBrands, listDemoCreators, requireChain } from "../demo/lookups.js";
import { enrichAgreement, summarizeAgreement, buildDashboardTotals } from "../demo/presenters.js";
import { PARTICIPANT_ROLE } from "../domain/status.js";
import { metricObservationSchema } from "../domain/validation.js";
import { notFound, serviceUnavailable } from "../http/errors.js";
import {
  approveDelivery,
  createAgreementFromInput,
  fundAgreementEscrow,
  getAgreement,
  listAgreementsForBrandWallet,
  recordMetricObservation,
} from "../services/agreementService.js";

type RouteDeps = {
  prisma: PrismaClient;
  chain?: ChainClient;
};

export async function registerDemoBrandRoutes(app: FastifyInstance, deps: RouteDeps) {
  const { prisma } = deps;

  app.get("/demo/brand/dashboard", async () => {
    const brand = await getDemoBrand(prisma);
    const brands = await listDemoBrands(prisma);
    const creators = await listDemoCreators(prisma);
    const agreements = await listAgreementsForBrandWallet(prisma, brand.walletAddress);
    const summaries = agreements.map((agreement) => summarizeAgreement(agreement, brands, creators));

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
        ...demoTokenForChain(deps.chain?.chainId),
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
    const brands = await listDemoBrands(prisma);
    const creators = await listDemoCreators(prisma);
    const agreements = await listAgreementsForBrandWallet(prisma, brand.walletAddress);

    return agreements.map((agreement) => enrichAgreement(agreement, brands, creators));
  });

  app.get<{ Params: { id: string } }>("/demo/brand/contracts/:id", async (request) => {
    return loadOwnedBrandContract(prisma, request.params.id);
  });

  app.post("/demo/brand/contracts", async (request, reply) => {
    const chain = requireChain(deps.chain);
    if (!chain.defaultTokenAddress) {
      throw serviceUnavailable("No USDC token address is configured");
    }

    const input = demoContractFormSchema.parse(request.body);
    const brand = await getDemoBrand(prisma);
    const brands = await listDemoBrands(prisma);
    const creators = await listDemoCreators(prisma);
    const creator = creators.find((candidate) => candidate.id === input.creatorId);

    if (!creator) {
      throw notFound("Demo creator not found");
    }

    const agreementInput = buildAgreementInputFromDemoContractForm(input, brand, creator, chain.defaultTokenAddress);
    const draft = await createAgreementFromInput(prisma, agreementInput);
    const funded = await fundAgreementEscrow(prisma, chain, draft.id);

    return reply.code(201).send(enrichAgreement(funded, brands, creators));
  });

  app.post<{ Params: { id: string } }>("/demo/brand/contracts/:id/fund", async (request) => {
    const chain = requireChain(deps.chain);
    const { brands, creators } = await loadOwnedBrandContractParts(prisma, request.params.id);
    const funded = await fundAgreementEscrow(prisma, chain, request.params.id);
    return enrichAgreement(funded, brands, creators);
  });

  app.post<{ Params: { id: string } }>("/demo/brand/contracts/:id/approve-delivery", async (request) => {
    const chain = requireChain(deps.chain);
    const { brands, creators } = await loadOwnedBrandContractParts(prisma, request.params.id);
    const result = await approveDelivery(prisma, chain, request.params.id);
    return {
      releasedPayoutIds: result.releasedPayoutIds,
      agreement: enrichAgreement(result.agreement, brands, creators),
    };
  });

  app.post<{ Params: { id: string } }>("/demo/brand/contracts/:id/metrics", async (request) => {
    const chain = requireChain(deps.chain);
    const input = metricObservationSchema.parse(request.body);
    const { brands, creators } = await loadOwnedBrandContractParts(prisma, request.params.id);
    const result = await recordMetricObservation(prisma, chain, request.params.id, input);
    return {
      releasedPayoutIds: result.releasedPayoutIds,
      agreement: enrichAgreement(result.agreement, brands, creators),
    };
  });
}

async function loadOwnedBrandContract(prisma: PrismaClient, agreementId: string) {
  const { agreement, brands, creators } = await loadOwnedBrandContractParts(prisma, agreementId);
  return enrichAgreement(agreement, brands, creators);
}

async function loadOwnedBrandContractParts(prisma: PrismaClient, agreementId: string) {
  const brand = await getDemoBrand(prisma);
  const brands = await listDemoBrands(prisma);
  const creators = await listDemoCreators(prisma);
  const agreement = await getAgreement(prisma, agreementId);
  const brandParticipant = agreement.participants.find(
    (participant) =>
      participant.role === PARTICIPANT_ROLE.brand &&
      participant.walletAddress.toLowerCase() === brand.walletAddress.toLowerCase(),
  );

  if (!brandParticipant) {
    throw notFound("Demo brand contract not found");
  }

  return { agreement, brand, brands, creators };
}
