import { z } from "zod";
import { CONDITION_OPERATOR, PAYOUT_KIND } from "../domain/status.js";
import { createAgreementSchema, type CreateAgreementInput } from "../domain/validation.js";

const positiveIntegerValue = z.union([
  z.string().regex(/^[1-9]\d*$/, "Must be a positive integer"),
  z.number().int().positive().safe(),
]);

function toIntegerString(value: string | number): string {
  return String(value);
}

const viewMilestoneSchema = z.object({
  views: positiveIntegerValue.transform(toIntegerString),
  bonusAmount: positiveIntegerValue.transform(toIntegerString),
});

const metricBonusSchema = z.object({
  metricKey: z
    .string()
    .regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/, "Use dotted metric keys like youtube.video.views"),
  label: z.string().min(1),
  threshold: positiveIntegerValue.transform(toIntegerString),
  bonusAmount: positiveIntegerValue.transform(toIntegerString),
});

export const demoContractFormSchema = z.object({
  creatorId: z.string().min(1),
  title: z.string().min(1),
  deliverableDescription: z.string().min(1),
  deadline: z.string().datetime(),
  measurementWindowDays: z.number().int().positive().default(30),
  basePayoutAmount: positiveIntegerValue.transform(toIntegerString),
  totalCapAmount: positiveIntegerValue.transform(toIntegerString),
  viewMilestones: z.array(viewMilestoneSchema).default([]),
  metricBonuses: z.array(metricBonusSchema).default([]),
});

export type DemoContractFormInput = z.infer<typeof demoContractFormSchema>;

type DemoBrandLike = {
  walletAddress: string;
  handle: string;
  name: string;
};

type DemoCreatorLike = {
  walletAddress: string;
  handle: string;
  displayName: string;
};

export function buildAgreementInputFromDemoContractForm(
  input: DemoContractFormInput,
  brand: DemoBrandLike,
  creator: DemoCreatorLike,
  tokenAddress?: string,
): CreateAgreementInput {
  return createAgreementSchema.parse({
    title: input.title,
    deliverableDescription: input.deliverableDescription,
    deadline: input.deadline,
    measurementWindowDays: input.measurementWindowDays,
    totalCapAmount: input.totalCapAmount,
    tokenAddress,
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
        amount: input.basePayoutAmount,
      },
      ...input.viewMilestones.map((milestone) => ({
        kind: PAYOUT_KIND.bonus,
        label: `${milestone.views} views milestone`,
        amount: milestone.bonusAmount,
        condition: {
          metricKey: "youtube.video.views",
          operator: CONDITION_OPERATOR.gte,
          threshold: milestone.views,
        },
      })),
      ...input.metricBonuses.map((bonus) => ({
        kind: PAYOUT_KIND.bonus,
        label: bonus.label,
        amount: bonus.bonusAmount,
        condition: {
          metricKey: bonus.metricKey,
          operator: CONDITION_OPERATOR.gte,
          threshold: bonus.threshold,
        },
      })),
    ],
  });
}
