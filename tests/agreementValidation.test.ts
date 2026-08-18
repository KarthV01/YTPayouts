import { describe, expect, it } from "vitest";
import { createAgreementSchema } from "../src/domain/validation.js";

const validAgreement = {
  deliverableDescription: "Creator publishes one sponsored integration.",
  deadline: "2026-09-30T00:00:00.000Z",
  totalCapAmount: "2500000000",
  participants: {
    brand: {
      walletAddress: "0x1111111111111111111111111111111111111111",
    },
    creator: {
      walletAddress: "0x2222222222222222222222222222222222222222",
    },
  },
  payouts: [
    {
      kind: "base",
      label: "Base payout",
      amount: "2000000000",
    },
    {
      kind: "bonus",
      label: "100k views",
      amount: "500000000",
      condition: {
        metricKey: "youtube.video.views",
        operator: "gte",
        threshold: "100000",
      },
    },
  ],
};

describe("agreement validation", () => {
  it("accepts integer metric thresholds and token-unit payout amounts", () => {
    expect(() => createAgreementSchema.parse(validAgreement)).not.toThrow();
  });

  it("rejects abbreviated metric thresholds", () => {
    expect(() =>
      createAgreementSchema.parse({
        ...validAgreement,
        payouts: [
          validAgreement.payouts[0],
          {
            ...validAgreement.payouts[1],
            condition: {
              metricKey: "youtube.video.views",
              operator: "gte",
              threshold: "100K",
            },
          },
        ],
      }),
    ).toThrow();
  });

  it("requires the total cap to cover all defined payouts", () => {
    expect(() =>
      createAgreementSchema.parse({
        ...validAgreement,
        totalCapAmount: "1000000000",
      }),
    ).toThrow();
  });
});
