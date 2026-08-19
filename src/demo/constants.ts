export const DEMO_BRAND_ID = "demo_brand_stellar_snacks";

export const DEMO_BRAND = {
  id: DEMO_BRAND_ID,
  name: "Stellar Snacks Co.",
  handle: "stellar-snacks",
  walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  industry: "Consumer packaged goods",
  websiteUrl: "https://example.com/stellar-snacks",
  logoUrl: "https://example.com/assets/stellar-snacks-logo.png",
  monthlyBudgetAmount: "25000000000",
};

export const DEMO_CREATORS = [
  {
    id: "demo_creator_maya",
    handle: "@MayaMakes",
    displayName: "Maya Makes",
    walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    channelUrl: "https://youtube.com/@MayaMakes",
    category: "Food and lifestyle",
    averageViews: 185000,
    audience: "Gen Z snack buyers",
    avatarUrl: "https://example.com/assets/maya-makes.png",
  },
  {
    id: "demo_creator_kevin",
    handle: "@KevinTech",
    displayName: "Kevin Tech",
    walletAddress: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    channelUrl: "https://youtube.com/@KevinTech",
    category: "Tech reviews",
    averageViews: 320000,
    audience: "College students and early adopters",
    avatarUrl: "https://example.com/assets/kevin-tech.png",
  },
  {
    id: "demo_creator_lena",
    handle: "@LenaRuns",
    displayName: "Lena Runs",
    walletAddress: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    channelUrl: "https://youtube.com/@LenaRuns",
    category: "Fitness",
    averageViews: 95000,
    audience: "Health-conscious shoppers",
    avatarUrl: "https://example.com/assets/lena-runs.png",
  },
];

export const DEMO_METRICS = [
  {
    key: "youtube.video.views",
    label: "YouTube video views",
    unit: "views",
    description: "Total views observed for the sponsored video during the measurement window.",
  },
  {
    key: "shopify.referral.conversions",
    label: "Shopify referral conversions",
    unit: "conversions",
    description: "Verified purchases attributed to the creator referral link.",
  },
  {
    key: "youtube.video.likes",
    label: "YouTube video likes",
    unit: "likes",
    description: "Total likes observed for the sponsored video.",
  },
];

export const DEMO_TOKEN = {
  symbol: "mUSDC",
  decimals: 6,
};
