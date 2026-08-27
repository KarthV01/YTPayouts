import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { buildGoogleAuthUrl, getCurrentUser, handleGoogleCallback, logout } from "../accounts/auth.js";

type RouteDeps = {
  prisma: PrismaClient;
};

export async function registerAuthRoutes(app: FastifyInstance, deps: RouteDeps) {
  const { prisma } = deps;

  app.get("/api/auth/google/start", async (_request, reply) => {
    return reply.redirect(buildGoogleAuthUrl(reply));
  });

  app.get("/api/auth/google/callback", async (request, reply) => {
    const appUrl = await handleGoogleCallback(prisma, request, reply);
    return reply.redirect(appUrl);
  });

  app.get("/api/auth/me", async (request) => {
    const user = await getCurrentUser(prisma, request);
    return { user };
  });

  app.post("/api/auth/logout", async (request, reply) => {
    await logout(prisma, request, reply);
    return { ok: true };
  });
}
