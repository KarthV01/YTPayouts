import type { DemoBrand, DemoCreator } from "@prisma/client";
import { PARTICIPANT_ROLE, PAYOUT_STATUS } from "../domain/status.js";
import type { AgreementView } from "../services/agreementService.js";

export function sumAmounts(amounts: string[]): string {
  return amounts.reduce((sum, amount) => sum + BigInt(amount), 0n).toString();
}

export function buildDashboardTotals(agreements: AgreementView[]) {
  const byStatus = agreements.reduce<Record<string, number>>((acc, agreement) => {
    acc[agreement.status] = (acc[agreement.status] ?? 0) + 1;
    return acc;
  }, {});

  return {
    totalContracts: agreements.length,
    byStatus,
    escrowedCapAmount: sumAmounts(
      agreements
        .filter((agreement) => agreement.blockchainRecord)
        .map((agreement) => agreement.blockchainRecord!.totalCapAmount),
    ),
    releasedPayoutAmount: sumAmounts(
      agreements.flatMap((agreement) =>
        agreement.payouts
          .filter((payout) => payout.status === PAYOUT_STATUS.released)
          .map((payout) => payout.amount),
      ),
    ),
    pendingPayoutAmount: sumAmounts(
      agreements.flatMap((agreement) =>
        agreement.payouts
          .filter((payout) => payout.status === PAYOUT_STATUS.pending)
          .map((payout) => payout.amount),
      ),
    ),
  };
}

export function buildAgreementFinancials(agreement: AgreementView) {
  return {
    totalCapAmount: agreement.totalCapAmount,
    releasedPayoutAmount: sumAmounts(
      agreement.payouts
        .filter((payout) => payout.status === PAYOUT_STATUS.released)
        .map((payout) => payout.amount),
    ),
    pendingPayoutAmount: sumAmounts(
      agreement.payouts
        .filter((payout) => payout.status === PAYOUT_STATUS.pending)
        .map((payout) => payout.amount),
    ),
  };
}

export function findAgreementCreator(agreement: AgreementView, creators: DemoCreator[]) {
  const participant = agreement.participants.find((candidate) => candidate.role === PARTICIPANT_ROLE.creator);
  if (!participant) {
    return null;
  }

  return (
    creators.find((creator) => creator.walletAddress.toLowerCase() === participant.walletAddress.toLowerCase()) ?? {
      id: null,
      handle: participant.handle,
      displayName: participant.displayName,
      walletAddress: participant.walletAddress,
    }
  );
}

export function findAgreementBrand(agreement: AgreementView, brands: DemoBrand[]) {
  const participant = agreement.participants.find((candidate) => candidate.role === PARTICIPANT_ROLE.brand);
  if (!participant) {
    return null;
  }

  return (
    brands.find((brand) => brand.walletAddress.toLowerCase() === participant.walletAddress.toLowerCase()) ?? {
      id: null,
      name: participant.displayName,
      handle: participant.handle,
      walletAddress: participant.walletAddress,
    }
  );
}

export function enrichAgreement(agreement: AgreementView, brands: DemoBrand[], creators: DemoCreator[]) {
  return {
    ...agreement,
    demoBrand: findAgreementBrand(agreement, brands),
    demoCreator: findAgreementCreator(agreement, creators),
    financials: buildAgreementFinancials(agreement),
  };
}

export function summarizeAgreement(agreement: AgreementView, brands: DemoBrand[], creators: DemoCreator[]) {
  const demoBrand = findAgreementBrand(agreement, brands);

  return {
    id: agreement.id,
    title: agreement.title,
    status: agreement.status,
    deadline: agreement.deadline,
    measurementWindowDays: agreement.measurementWindowDays,
    totalCapAmount: agreement.totalCapAmount,
    termsHash: agreement.termsHash,
    blockchainRecord: agreement.blockchainRecord,
    demoBrand: demoBrand
      ? {
          id: demoBrand.id,
          name: demoBrand.name ?? null,
          handle: demoBrand.handle,
        }
      : null,
    demoCreator: findAgreementCreator(agreement, creators),
    financials: buildAgreementFinancials(agreement),
  };
}
