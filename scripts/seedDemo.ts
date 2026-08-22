import "dotenv/config";
import { createChainClientFromEnv } from "../src/blockchain/client.js";
import { ensureDemoProfiles, seedDemoData } from "../src/demo/seedData.js";
import { prisma } from "../src/db.js";

const chain = createChainClientFromEnv();

try {
  if (!chain) {
    const { brand, creators } = await ensureDemoProfiles(prisma);
    console.log(
      JSON.stringify(
        {
          brandId: brand.id,
          creatorCount: creators.length,
          createdAgreementIds: [],
          skippedAgreementIds: [],
          note: "Seeded demo accounts only. Start Anvil, deploy local contracts, then rerun seed:demo to create funded deals.",
        },
        null,
        2,
      ),
    );
  } else {
    const result = await seedDemoData(prisma, chain);
    console.log(JSON.stringify(result, null, 2));
  }
} finally {
  await prisma.$disconnect();
}
