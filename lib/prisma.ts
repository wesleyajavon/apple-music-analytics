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

// Ne jamais utiliser l'adapter en développement ou lors du build
// L'adapter est uniquement pour la production sur Vercel avec POSTGRES_PRISMA_URL
const isDevelopment = 
  process.env.NODE_ENV === "development" || 
  !process.env.NODE_ENV ||
  process.env.VERCEL_ENV === "development";

if (!isDevelopment && process.env.POSTGRES_PRISMA_URL) {
  try {
    // Import dynamique uniquement en production
    const configModule = require("../prisma/config");
    if (configModule && configModule.adapter) {
      clientConfig.adapter = configModule.adapter;
    }
  } catch (error) {
    // Ignorer silencieusement si l'adapter n'est pas disponible
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(clientConfig);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

