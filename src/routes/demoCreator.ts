import type { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import type { ChainClient } from "../blockchain/client.js";
import { getDemoCreator, listDemoBrands, listDemoCreators, requireChain } from "../demo/lookups.js";
import { buildDashboardTotals, enrichAgreement, summarizeAgreement } from "../demo/presenters.js";
import { PARTICIPANT_ROLE } from "../domain/status.js";
import { metricObservationSchema } from "../domain/validation.js";
import { notFound } from "../http/errors.js";
import {
  getAgreement,
  listAgreementsForCreatorWallet,
  recordMetricObservation,
} from "../services/agreementService.js";

type RouteDeps = {
  prisma: PrismaClient;
  chain?: ChainClient;
};

export async function registerDemoCreatorRoutes(app: FastifyInstance, deps: RouteDeps) {
  const { prisma } = deps;

  app.get("/demo/profiles", async () => {
    const [sponsors, creators] = await Promise.all([listDemoBrands(prisma), listDemoCreators(prisma)]);
    return { sponsors, creators };
  });

  app.get<{ Params: { creatorId: string } }>("/demo/creator/:creatorId/dashboard", async (request) => {
    const creator = await getDemoCreator(prisma, request.params.creatorId);
    const brands = await listDemoBrands(prisma);
    const creators = await listDemoCreators(prisma);
    const agreements = await listAgreementsForCreatorWallet(prisma, creator.walletAddress);

    return {
      creator,
      totals: buildDashboardTotals(agreements),
      contracts: agreements.map((agreement) => summarizeAgreement(agreement, brands, creators)),
    };
  });

  app.get<{ Params: { creatorId: string } }>("/demo/creator/:creatorId/contracts", async (request) => {
    const creator = await getDemoCreator(prisma, request.params.creatorId);
    const brands = await listDemoBrands(prisma);
    const creators = await listDemoCreators(prisma);
    const agreements = await listAgreementsForCreatorWallet(prisma, creator.walletAddress);

    return agreements.map((agreement) => enrichAgreement(agreement, brands, creators));
  });

  app.get<{ Params: { creatorId: string; id: string } }>(
    "/demo/creator/:creatorId/contracts/:id",
    async (request) => {
      const { brands, creators, agreement } = await loadOwnedCreatorContract(
        prisma,
        request.params.creatorId,
        request.params.id,
      );
      return enrichAgreement(agreement, brands, creators);
    },
  );

  app.post<{ Params: { creatorId: string; id: string } }>(
    "/demo/creator/:creatorId/contracts/:id/metrics",
    async (request) => {
      const chain = requireChain(deps.chain);
      const input = metricObservationSchema.parse(request.body);
      const { brands, creators } = await loadOwnedCreatorContract(
        prisma,
        request.params.creatorId,
        request.params.id,
      );
      const result = await recordMetricObservation(prisma, chain, request.params.id, input);
      return {
        releasedPayoutIds: result.releasedPayoutIds,
        agreement: enrichAgreement(result.agreement, brands, creators),
      };
    },
  );
}

async function loadOwnedCreatorContract(prisma: PrismaClient, creatorId: string, agreementId: string) {
  const creator = await getDemoCreator(prisma, creatorId);
  const brands = await listDemoBrands(prisma);
  const creators = await listDemoCreators(prisma);
  const agreement = await getAgreement(prisma, agreementId);
  const creatorParticipant = agreement.participants.find(
    (participant) =>
      participant.role === PARTICIPANT_ROLE.creator &&
      participant.walletAddress.toLowerCase() === creator.walletAddress.toLowerCase(),
  );

  if (!creatorParticipant) {
    throw notFound("Demo creator contract not found");
  }

  return { creator, brands, creators, agreement };
}
