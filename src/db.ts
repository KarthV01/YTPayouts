import { PrismaClient } from "@prisma/client";

process.env.DATABASE_URL ||= "file:./dev.db";

export const prisma = new PrismaClient();
