import { describe, expect, it } from "vitest";
import { conditionIsSatisfied } from "../src/domain/payoutEvaluator.js";

describe("payout evaluator", () => {
  it("marks gte conditions satisfied when the observed metric reaches the threshold", () => {
    expect(conditionIsSatisfied({ operator: "gte", threshold: "100000" }, "100000")).toBe(true);
    expect(conditionIsSatisfied({ operator: "gte", threshold: "100000" }, "250000")).toBe(true);
  });

  it("keeps gte conditions pending below the threshold", () => {
    expect(conditionIsSatisfied({ operator: "gte", threshold: "100000" }, "99999")).toBe(false);
  });
});
