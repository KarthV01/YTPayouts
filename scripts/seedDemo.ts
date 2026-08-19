import "dotenv/config";
import { createChainClientFromEnv } from "../src/blockchain/client.js";
import { seedDemoData } from "../src/demo/seedData.js";
import { prisma } from "../src/db.js";

const chain = createChainClientFromEnv();

if (!chain) {
  console.error(
    "Demo seeding needs local chain config. Run `npm run anvil`, `npm run contracts:build`, `npm run deploy:local`, then keep deployments/local.json or set .env addresses.",
  );
  process.exit(1);
}

try {
  const result = await seedDemoData(prisma, chain);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await prisma.$disconnect();
}
