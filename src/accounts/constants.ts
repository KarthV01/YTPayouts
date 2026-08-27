export const PROFILE_ROLE = {
  sponsor: "sponsor",
  creator: "creator",
} as const;

export const CONTRACT_INVITE_STATUS = {
  pending: "pending",
  accepted: "accepted",
} as const;

export const DISCOVERY_METRICS = [
  {
    key: "youtube.video.views",
    label: "YouTube video views",
    unit: "views",
    description: "Public view count for a sponsored video.",
  },
  {
    key: "youtube.video.likes",
    label: "YouTube video likes",
    unit: "likes",
    description: "Public like count for a sponsored video.",
  },
  {
    key: "shopify.referral.conversions",
    label: "Referral conversions",
    unit: "conversions",
    description: "Verified purchases from a campaign referral source.",
  },
] as const;

export function tokenForChain(chainId: number | undefined) {
  if (chainId === 8453 || chainId === 84532) {
    return {
      symbol: "USDC",
      decimals: 6,
    };
  }

  return {
    symbol: "mUSDC",
    decimals: 6,
  };
}
