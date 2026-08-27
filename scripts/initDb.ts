import "dotenv/config";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

function sqlitePathFromDatabaseUrl(url: string): string {
  if (!url.startsWith("file:")) {
    throw new Error("db:init only supports SQLite DATABASE_URL values starting with file:");
  }

  const withoutScheme = url.slice("file:".length).split("?")[0];
  if (isAbsolute(withoutScheme)) {
    return withoutScheme;
  }

  return resolve("prisma", withoutScheme);
}

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const databasePath = sqlitePathFromDatabaseUrl(databaseUrl);

mkdirSync(dirname(databasePath), { recursive: true });

const db = new DatabaseSync(databasePath);
db.exec(`
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "Agreement" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT,
  "deliverableDescription" TEXT NOT NULL,
  "deadline" DATETIME NOT NULL,
  "measurementWindowDays" INTEGER NOT NULL,
  "totalCapAmount" TEXT NOT NULL,
  "tokenAddress" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "termsHash" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Participant" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "agreementId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "walletAddress" TEXT NOT NULL,
  "handle" TEXT,
  "displayName" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Participant_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Participant_agreementId_role_key" ON "Participant"("agreementId", "role");

CREATE TABLE IF NOT EXISTS "Metric" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "agreementId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Metric_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Metric_agreementId_key_key" ON "Metric"("agreementId", "key");

CREATE TABLE IF NOT EXISTS "Payout" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "agreementId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "amount" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "releasedAt" DATETIME,
  "releasedTxHash" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payout_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Condition" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "payoutId" TEXT NOT NULL,
  "metricId" TEXT NOT NULL,
  "operator" TEXT NOT NULL,
  "threshold" TEXT NOT NULL,
  CONSTRAINT "Condition_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Condition_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "Metric" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Condition_payoutId_key" ON "Condition"("payoutId");

CREATE TABLE IF NOT EXISTS "MetricObservation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "agreementId" TEXT NOT NULL,
  "metricId" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "observedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetricObservation_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MetricObservation_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "Metric" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "BlockchainRecord" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "agreementId" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL,
  "escrowAddress" TEXT NOT NULL,
  "agreementKey" TEXT NOT NULL,
  "tokenAddress" TEXT NOT NULL,
  "totalCapAmount" TEXT NOT NULL,
  "termsHash" TEXT NOT NULL,
  "createTxHash" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BlockchainRecord_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "BlockchainRecord_agreementId_key" ON "BlockchainRecord"("agreementId");

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "googleSub" TEXT,
  "name" TEXT,
  "avatarUrl" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "User_googleSub_key" ON "User"("googleSub");

CREATE TABLE IF NOT EXISTS "AuthSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");

CREATE TABLE IF NOT EXISTS "SponsorProfile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "handle" TEXT NOT NULL,
  "walletAddress" TEXT NOT NULL,
  "industry" TEXT NOT NULL,
  "websiteUrl" TEXT,
  "logoUrl" TEXT,
  "monthlyBudgetAmount" TEXT NOT NULL DEFAULT '0',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SponsorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "SponsorProfile_handle_key" ON "SponsorProfile"("handle");
CREATE UNIQUE INDEX IF NOT EXISTS "SponsorProfile_walletAddress_key" ON "SponsorProfile"("walletAddress");

CREATE TABLE IF NOT EXISTS "CreatorProfile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "handle" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "walletAddress" TEXT NOT NULL,
  "channelUrl" TEXT,
  "category" TEXT NOT NULL,
  "averageViews" INTEGER NOT NULL DEFAULT 0,
  "audience" TEXT,
  "avatarUrl" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreatorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CreatorProfile_handle_key" ON "CreatorProfile"("handle");
CREATE UNIQUE INDEX IF NOT EXISTS "CreatorProfile_walletAddress_key" ON "CreatorProfile"("walletAddress");

CREATE TABLE IF NOT EXISTS "ProfileWallet" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "profileType" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "walletAddress" TEXT NOT NULL,
  "privateKey" TEXT NOT NULL,
  "provisionedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProfileWallet_walletAddress_key" ON "ProfileWallet"("walletAddress");
CREATE UNIQUE INDEX IF NOT EXISTS "ProfileWallet_profileType_profileId_key" ON "ProfileWallet"("profileType", "profileId");

CREATE TABLE IF NOT EXISTS "ContractInvite" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sponsorProfileId" TEXT NOT NULL,
  "creatorProfileId" TEXT NOT NULL,
  "agreementId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "acceptedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContractInvite_sponsorProfileId_fkey" FOREIGN KEY ("sponsorProfileId") REFERENCES "SponsorProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ContractInvite_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ContractInvite_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ContractInvite_agreementId_key" ON "ContractInvite"("agreementId");
`);

db.close();
console.log(`SQLite database initialized at ${databasePath}`);
