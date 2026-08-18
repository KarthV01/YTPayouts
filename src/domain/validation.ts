import { z } from "zod";
import { CONDITION_OPERATOR, PAYOUT_KIND } from "./status.js";

const positiveIntegerString = z.string().regex(/^[1-9]\d*$/, "Must be a positive integer string");
const nonNegativeIntegerString = z.string().regex(/^(0|[1-9]\d*)$/, "Must be an integer string");
const walletAddress = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Must be an EVM wallet address");
const metricKey = z
  .string()
  .regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/, "Use dotted metric keys like youtube.video.views");

const participantSchema = z.object({
  walletAddress,
  handle: z.string().min(1).optional(),
  displayName: z.string().min(1).optional(),
});

const conditionSchema = z.object({
  metricKey,
  operator: z.literal(CONDITION_OPERATOR.gte),
  threshold: nonNegativeIntegerString,
});

const payoutSchema = z
  .object({
    kind: z.enum([PAYOUT_KIND.base, PAYOUT_KIND.bonus]),
    label: z.string().min(1),
    amount: positiveIntegerString,
    condition: conditionSchema.optional(),
  })
  .superRefine((payout, ctx) => {
    if (payout.kind === PAYOUT_KIND.base && payout.condition) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["condition"],
        message: "Base payouts cannot have metric conditions",
      });
    }

    if (payout.kind === PAYOUT_KIND.bonus && !payout.condition) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["condition"],
        message: "Bonus payouts require a metric condition",
      });
    }
  });

export const createAgreementSchema = z
  .object({
    title: z.string().min(1).optional(),
    deliverableDescription: z.string().min(1),
    deadline: z.string().datetime(),
    measurementWindowDays: z.number().int().positive().default(30),
    totalCapAmount: positiveIntegerString,
    tokenAddress: walletAddress.optional(),
    participants: z.object({
      brand: participantSchema,
      creator: participantSchema,
    }),
    payouts: z.array(payoutSchema).min(1),
  })
  .superRefine((agreement, ctx) => {
    const basePayouts = agreement.payouts.filter((payout) => payout.kind === PAYOUT_KIND.base);
    if (basePayouts.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["payouts"],
        message: "Exactly one base payout is required",
      });
    }

    const totalPayouts = agreement.payouts.reduce((sum, payout) => sum + BigInt(payout.amount), 0n);
    if (totalPayouts > BigInt(agreement.totalCapAmount)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["totalCapAmount"],
        message: "Total cap must cover the sum of all defined payouts",
      });
    }
  });

export const metricObservationSchema = z.object({
  metricKey,
  value: nonNegativeIntegerString,
  source: z.string().min(1).default("simulation"),
  observedAt: z.string().datetime().optional(),
});

export type CreateAgreementInput = z.infer<typeof createAgreementSchema>;
export type MetricObservationInput = z.infer<typeof metricObservationSchema>;
