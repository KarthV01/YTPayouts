import "dotenv/config";
import { createChainClientFromEnv } from "../src/blockchain/client.js";
import { LOCAL_CHAIN_ID } from "../src/blockchain/networks.js";
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
  } else if (chain.chainId !== LOCAL_CHAIN_ID && process.env.ALLOW_NON_LOCAL_DEMO_SEED !== "true") {
    const { brand, creators } = await ensureDemoProfiles(prisma);
    console.log(
      JSON.stringify(
        {
          brandId: brand.id,
          creatorCount: creators.length,
          createdAgreementIds: [],
          skippedAgreementIds: [],
          note: "Seeded demo accounts only. Refusing to create funded demo deals on a non-local chain unless ALLOW_NON_LOCAL_DEMO_SEED=true.",
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
