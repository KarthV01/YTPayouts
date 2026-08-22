import cors from "@fastify/cors";
import Fastify from "fastify";
import { ZodError } from "zod";
import type { PrismaClient } from "@prisma/client";
import type { ChainClient } from "./blockchain/client.js";
import { registerDemoBrandRoutes } from "./routes/demoBrand.js";
import { registerDemoCreatorRoutes } from "./routes/demoCreator.js";
import { registerAgreementRoutes } from "./routes/agreements.js";
import { HttpError } from "./http/errors.js";

export type AppDependencies = {
  prisma: PrismaClient;
  chain?: ChainClient;
  logger?: boolean;
};

export async function buildApp(deps: AppDependencies) {
  const app = Fastify({
    logger: deps.logger ?? true,
  });

  await app.register(cors, { origin: true });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: "validation_error",
        details: error.issues,
      });
    }

    if (error instanceof HttpError) {
      return reply.code(error.statusCode).send({
        error: "http_error",
        message: error.message,
      });
    }

    app.log.error(error);
    return reply.code(500).send({
      error: "internal_error",
      message: "Unexpected server error",
    });
  });

  app.get("/health", async () => ({
    ok: true,
  }));

  await app.register(registerAgreementRoutes, deps);
  await app.register(registerDemoBrandRoutes, deps);
  await app.register(registerDemoCreatorRoutes, deps);

  return app;
}
