import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Configuration du client Prisma
// En production sur Vercel, on utilisera l'adapter via prisma/config.ts
// En développement local, on utilise la connexion standard
const clientConfig: any = {
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
};

// Utiliser l'adapter uniquement en production avec POSTGRES_PRISMA_URL (Vercel)
if (process.env.NODE_ENV === "production" && process.env.POSTGRES_PRISMA_URL) {
  // Import dynamique pour éviter les erreurs en développement
  const { adapter } = require("../prisma/config");
  if (adapter) {
    clientConfig.adapter = adapter;
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(clientConfig);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

