import "dotenv/config";
import { buildApp } from "./app.js";
import { createChainClientFromEnv } from "./blockchain/client.js";
import { prisma } from "./db.js";

const port = Number(process.env.PORT ?? 3000);
const chain = createChainClientFromEnv();
const app = await buildApp({
  prisma,
  chain,
});

try {
  await app.listen({
    port,
    host: "0.0.0.0",
  });
} catch (error) {
  app.log.error(error);
  await prisma.$disconnect();
  process.exit(1);
}
