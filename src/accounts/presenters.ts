import type { CreatorProfile, SponsorProfile } from "@prisma/client";
import { PARTICIPANT_ROLE, PAYOUT_STATUS } from "../domain/status.js";
import type { AgreementView } from "../services/agreementService.js";
import { publicCreatorProfile, publicSponsorProfile } from "./profiles.js";

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

export function enrichAgreement(
  agreement: AgreementView,
  sponsors: SponsorProfile[],
  creators: CreatorProfile[],
) {
  return {
    ...agreement,
    sponsorProfile: findAgreementSponsor(agreement, sponsors),
    creatorProfile: findAgreementCreator(agreement, creators),
    financials: buildAgreementFinancials(agreement),
  };
}

export function summarizeAgreement(
  agreement: AgreementView,
  sponsors: SponsorProfile[],
  creators: CreatorProfile[],
) {
  return {
    id: agreement.id,
    title: agreement.title,
    status: agreement.status,
    deadline: agreement.deadline,
    measurementWindowDays: agreement.measurementWindowDays,
    totalCapAmount: agreement.totalCapAmount,
    termsHash: agreement.termsHash,
    blockchainRecord: agreement.blockchainRecord,
    sponsorProfile: findAgreementSponsor(agreement, sponsors),
    creatorProfile: findAgreementCreator(agreement, creators),
    financials: buildAgreementFinancials(agreement),
  };
}

export function presentInvite(invite: {
  id: string;
  status: string;
  createdAt: Date;
  acceptedAt: Date | null;
  sponsorProfile: SponsorProfile;
  creatorProfile: CreatorProfile;
  agreement: AgreementView;
}) {
  return {
    id: invite.id,
    status: invite.status,
    createdAt: invite.createdAt,
    acceptedAt: invite.acceptedAt,
    sponsorProfile: publicSponsorProfile(invite.sponsorProfile),
    creatorProfile: publicCreatorProfile(invite.creatorProfile),
    agreement: enrichAgreement(invite.agreement, [invite.sponsorProfile], [invite.creatorProfile]),
  };
}

function findAgreementCreator(agreement: AgreementView, creators: CreatorProfile[]) {
  const participant = agreement.participants.find((candidate) => candidate.role === PARTICIPANT_ROLE.creator);
  if (!participant) {
    return null;
  }

  const creator = creators.find(
    (candidate) => candidate.walletAddress.toLowerCase() === participant.walletAddress.toLowerCase(),
  );
  return creator
    ? publicCreatorProfile(creator)
    : {
        id: null,
        handle: participant.handle,
        displayName: participant.displayName,
        walletAddress: participant.walletAddress,
        channelUrl: null,
        category: "",
        averageViews: 0,
        audience: null,
        avatarUrl: null,
      };
}

function findAgreementSponsor(agreement: AgreementView, sponsors: SponsorProfile[]) {
  const participant = agreement.participants.find((candidate) => candidate.role === PARTICIPANT_ROLE.brand);
  if (!participant) {
    return null;
  }

  const sponsor = sponsors.find(
    (candidate) => candidate.walletAddress.toLowerCase() === participant.walletAddress.toLowerCase(),
  );
  return sponsor
    ? publicSponsorProfile(sponsor)
    : {
        id: null,
        name: participant.displayName,
        handle: participant.handle,
        walletAddress: participant.walletAddress,
        industry: "",
        websiteUrl: null,
        logoUrl: null,
        monthlyBudgetAmount: "0",
      };
}
