import { keccak256, toBytes, type Hex } from "viem";

export function agreementKey(agreementId: string): Hex {
  return keccak256(toBytes(`agreement:${agreementId}`));
}

export function payoutKey(agreementId: string, payoutId: string): Hex {
  return keccak256(toBytes(`agreement:${agreementId}:payout:${payoutId}`));
}
