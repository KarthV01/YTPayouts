import type { FastifyInstance } from "fastify";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { Hex } from "viem";
import type { ChainClient } from "../blockchain/client.js";
import { conditionIsSatisfied } from "../domain/payoutEvaluator.js";
import { AGREEMENT_STATUS, PARTICIPANT_ROLE, PAYOUT_KIND, PAYOUT_STATUS } from "../domain/status.js";
import { buildTermsSnapshot, hashTerms, type AgreementTermsSource } from "../domain/termsHash.js";
import { createAgreementSchema, metricObservationSchema } from "../domain/validation.js";
import { conflict, notFound, serviceUnavailable } from "../http/errors.js";

type RouteDeps = {
  prisma: PrismaClient;
  chain?: ChainClient;
};

const agreementInclude = {
  participants: {
    orderBy: {
      role: "asc",
    },
  },
  metrics: {
    orderBy: {
      key: "asc",
    },
  },
  payouts: {
    orderBy: {
      createdAt: "asc",
    },
    include: {
      condition: {
        include: {
          metric: true,
        },
      },
    },
  },
  observations: {
    orderBy: {
      observedAt: "desc",
    },
    include: {
      metric: true,
    },
  },
  blockchainRecord: true,
} satisfies Prisma.AgreementInclude;

type AgreementView = Prisma.AgreementGetPayload<{
  include: typeof agreementInclude;
}>;

export async function registerAgreementRoutes(app: FastifyInstance, deps: RouteDeps) {
  const { prisma } = deps;

  app.post("/agreements", async (request, reply) => {
    const input = createAgreementSchema.parse(request.body);
    const metricKeys = Array.from(
      new Set(input.payouts.flatMap((payout) => (payout.condition ? [payout.condition.metricKey] : []))),
    );

    const agreement = await prisma.$transaction(async (tx) => {
      const created = await tx.agreement.create({
        data: {
          title: input.title,
          deliverableDescription: input.deliverableDescription,
          deadline: new Date(input.deadline),
          measurementWindowDays: input.measurementWindowDays,
          totalCapAmount: input.totalCapAmount,
          tokenAddress: input.tokenAddress,
          status: AGREEMENT_STATUS.draft,
        },
      });

      await tx.participant.createMany({
        data: [
          {
            agreementId: created.id,
            role: PARTICIPANT_ROLE.brand,
            walletAddress: input.participants.brand.walletAddress,
            handle: input.participants.brand.handle,
            displayName: input.participants.brand.displayName,
          },
          {
            agreementId: created.id,
            role: PARTICIPANT_ROLE.creator,
            walletAddress: input.participants.creator.walletAddress,
            handle: input.participants.creator.handle,
            displayName: input.participants.creator.displayName,
          },
        ],
      });

      const metricsByKey = new Map<string, string>();
      for (const key of metricKeys) {
        const metric = await tx.metric.create({
          data: {
            agreementId: created.id,
            key,
          },
        });
        metricsByKey.set(key, metric.id);
      }

      for (const payout of input.payouts) {
        await tx.payout.create({
          data: {
            agreementId: created.id,
            kind: payout.kind,
            label: payout.label,
            amount: payout.amount,
            status: PAYOUT_STATUS.pending,
            condition: payout.condition
              ? {
                  create: {
                    metricId: metricsByKey.get(payout.condition.metricKey)!,
                    operator: payout.condition.operator,
                    threshold: payout.condition.threshold,
                  },
                }
              : undefined,
          },
        });
      }

      return created;
    });

    return reply.code(201).send(await getAgreement(prisma, agreement.id));
  });

  app.get<{ Params: { id: string } }>("/agreements/:id", async (request) => {
    return getAgreement(prisma, request.params.id);
  });

  app.post<{ Params: { id: string } }>("/agreements/:id/accept", async (request) => {
    const chain = requireChain(deps.chain);
    const agreement = await getAgreement(prisma, request.params.id);

    if (agreement.status === AGREEMENT_STATUS.active && agreement.blockchainRecord) {
      return agreement;
    }

    if (agreement.status !== AGREEMENT_STATUS.draft && agreement.status !== AGREEMENT_STATUS.acceptedOffchain) {
      throw conflict(`Agreement cannot be accepted from status ${agreement.status}`);
    }

    const brand = requireParticipant(agreement, PARTICIPANT_ROLE.brand);
    const creator = requireParticipant(agreement, PARTICIPANT_ROLE.creator);
    const tokenAddress = agreement.tokenAddress ?? chain.defaultTokenAddress;

    if (!tokenAddress) {
      throw serviceUnavailable("No token address configured for escrow creation");
    }

    const termsHash = (agreement.termsHash ?? hashTerms(buildTermsSnapshot(agreement as AgreementTermsSource))) as Hex;

    await prisma.agreement.update({
      where: { id: agreement.id },
      data: {
        status: AGREEMENT_STATUS.acceptedOffchain,
        termsHash,
        tokenAddress,
      },
    });

    const escrow = await chain.createEscrow({
      agreementId: agreement.id,
      brand: brand.walletAddress,
      creator: creator.walletAddress,
      token: tokenAddress,
      totalCapAmount: agreement.totalCapAmount,
      termsHash,
    });

    await prisma.$transaction([
      prisma.blockchainRecord.create({
        data: {
          agreementId: agreement.id,
          chainId: escrow.chainId,
          escrowAddress: escrow.escrowAddress,
          agreementKey: escrow.agreementKey,
          tokenAddress,
          totalCapAmount: agreement.totalCapAmount,
          termsHash,
          createTxHash: escrow.txHash,
        },
      }),
      prisma.agreement.update({
        where: { id: agreement.id },
        data: {
          status: AGREEMENT_STATUS.active,
          tokenAddress,
        },
      }),
    ]);

    return getAgreement(prisma, agreement.id);
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

    const result = await chain.releasePayout({
      agreementId: agreement.id,
      payoutId: basePayout.id,
      amount: basePayout.amount,
    });

    await markPayoutReleased(prisma, basePayout.id, result.txHash);
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
      const result = await chain.releasePayout({
        agreementId: agreement.id,
        payoutId: payout.id,
        amount: payout.amount,
      });
      await markPayoutReleased(prisma, payout.id, result.txHash);
      releasedPayoutIds.push(payout.id);
    }

    await completeIfCapReached(prisma, agreement.id);

    return {
      releasedPayoutIds,
      agreement: await getAgreement(prisma, agreement.id),
    };
  });
}

async function getAgreement(prisma: PrismaClient, id: string): Promise<AgreementView> {
  const agreement = await prisma.agreement.findUnique({
    where: { id },
    include: agreementInclude,
  });

  if (!agreement) {
    throw notFound("Agreement not found");
  }

  return agreement;
}

function requireChain(chain: ChainClient | undefined): ChainClient {
  if (!chain) {
    throw serviceUnavailable("Blockchain client is not configured");
  }

  return chain;
}

function requireParticipant(agreement: AgreementView, role: string) {
  const participant = agreement.participants.find((candidate) => candidate.role === role);
  if (!participant) {
    throw notFound(`Agreement is missing ${role} participant`);
  }

  return participant;
}

function requireActiveAgreement(agreement: AgreementView) {
  if (agreement.status !== AGREEMENT_STATUS.active || !agreement.blockchainRecord) {
    throw conflict("Agreement must be active with an escrow before payouts can be released");
  }
}

async function markPayoutReleased(prisma: PrismaClient, payoutId: string, txHash: string) {
  await prisma.payout.update({
    where: { id: payoutId },
    data: {
      status: PAYOUT_STATUS.released,
      releasedAt: new Date(),
      releasedTxHash: txHash,
    },
  });
}

async function completeIfCapReached(prisma: PrismaClient, agreementId: string) {
  const agreement = await prisma.agreement.findUnique({
    where: { id: agreementId },
    include: {
      payouts: true,
    },
  });

  if (!agreement) {
    throw notFound("Agreement not found");
  }

  const releasedTotal = agreement.payouts
    .filter((payout) => payout.status === PAYOUT_STATUS.released)
    .reduce((sum, payout) => sum + BigInt(payout.amount), 0n);

  if (releasedTotal >= BigInt(agreement.totalCapAmount)) {
    await prisma.agreement.update({
      where: { id: agreementId },
      data: {
        status: AGREEMENT_STATUS.completed,
      },
    });
  }
}
