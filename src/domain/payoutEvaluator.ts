import { CONDITION_OPERATOR } from "./status.js";

type ConditionLike = {
  operator: string;
  threshold: string;
};

export function conditionIsSatisfied(condition: ConditionLike, observedValue: string): boolean {
  if (condition.operator !== CONDITION_OPERATOR.gte) {
    return false;
  }

  return BigInt(observedValue) >= BigInt(condition.threshold);
}
