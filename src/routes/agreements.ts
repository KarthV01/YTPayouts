import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import type { ChainClient } from "../blockchain/client.js";
import { conditionIsSatisfied } from "../domain/payoutEvaluator.js";
import { AGREEMENT_STATUS, PAYOUT_KIND, PAYOUT_STATUS } from "../domain/status.js";
import { createAgreementSchema, metricObservationSchema } from "../domain/validation.js";
import { conflict, notFound, serviceUnavailable } from "../http/errors.js";
import {
  completeIfCapReached,
  createAgreementFromInput,
  fundAgreementEscrow,
  getAgreement,
  releasePayoutAndMark,
  type AgreementView,
} from "../services/agreementService.js";

type RouteDeps = {
  prisma: PrismaClient;
  chain?: ChainClient;
};

export async function registerAgreementRoutes(app: FastifyInstance, deps: RouteDeps) {
  const { prisma } = deps;

  app.post("/agreements", async (request, reply) => {
    const input = createAgreementSchema.parse(request.body);
    return reply.code(201).send(await createAgreementFromInput(prisma, input));
  });

  app.get<{ Params: { id: string } }>("/agreements/:id", async (request) => {
    return getAgreement(prisma, request.params.id);
  });

  app.post<{ Params: { id: string } }>("/agreements/:id/accept", async (request) => {
    const chain = requireChain(deps.chain);
    return fundAgreementEscrow(prisma, chain, request.params.id);
  });

  app.post<{ Params: { id: string } }>("/agreements/:id/approve-delivery", async (request) => {
    const chain = requireChain(deps.chain);
    const agreement = await getAgreement(prisma, request.params.id);

    const basePayout = agreement.payouts.find((payout) => payout.kind === PAYOUT_KIND.base);
    if (!basePayout) {
      throw notFound("Base payout not found");
    }

    if (agreement.status === AGREEMENT_STATUS.completed && basePayout.status === PAYOUT_STATUS.released) {
      return {
        releasedPayoutIds: [],
        agreement,
      };
    }

    requireActiveAgreement(agreement);

    if (basePayout.status === PAYOUT_STATUS.released) {
      return {
        releasedPayoutIds: [],
        agreement,
      };
    }

    await releasePayoutAndMark(prisma, chain, agreement.id, basePayout.id, basePayout.amount);
    await completeIfCapReached(prisma, agreement.id);

    return {
      releasedPayoutIds: [basePayout.id],
      agreement: await getAgreement(prisma, agreement.id),
    };
  });

  app.post<{ Params: { id: string } }>("/agreements/:id/metrics", async (request) => {
    const chain = requireChain(deps.chain);
    const input = metricObservationSchema.parse(request.body);
    const agreement = await getAgreement(prisma, request.params.id);

    if (agreement.status === AGREEMENT_STATUS.completed) {
      return {
        releasedPayoutIds: [],
        agreement,
      };
    }

    requireActiveAgreement(agreement);

    const metric = agreement.metrics.find((candidate) => candidate.key === input.metricKey);
    if (!metric) {
      throw notFound(`Metric ${input.metricKey} is not part of this agreement`);
    }

    await prisma.metricObservation.create({
      data: {
        agreementId: agreement.id,
        metricId: metric.id,
        value: input.value,
        source: input.source,
        observedAt: input.observedAt ? new Date(input.observedAt) : new Date(),
      },
    });

    const eligiblePayouts = agreement.payouts.filter(
      (payout) =>
        payout.kind === PAYOUT_KIND.bonus &&
        payout.status === PAYOUT_STATUS.pending &&
        payout.condition?.metric.key === input.metricKey &&
        conditionIsSatisfied(payout.condition, input.value),
    );

    const releasedPayoutIds: string[] = [];

    for (const payout of eligiblePayouts) {
      await releasePayoutAndMark(prisma, chain, agreement.id, payout.id, payout.amount);
      releasedPayoutIds.push(payout.id);
    }

    await completeIfCapReached(prisma, agreement.id);

    return {
      releasedPayoutIds,
      agreement: await getAgreement(prisma, agreement.id),
    };
  });
}

function requireChain(chain: ChainClient | undefined): ChainClient {
  if (!chain) {
    throw serviceUnavailable("Blockchain client is not configured");
  }

  return chain;
}

function requireActiveAgreement(agreement: AgreementView) {
  if (agreement.status !== AGREEMENT_STATUS.active || !agreement.blockchainRecord) {
    throw conflict("Agreement must be active with an escrow before payouts can be released");
  }
}
