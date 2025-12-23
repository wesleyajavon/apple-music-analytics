import { PrismaClient } from "@prisma/client";
import { adapter } from "../prisma/config";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Utiliser l'adapter uniquement si disponible (pour Vercel Postgres avec pooler)
// Sinon, utiliser la connexion standard
const clientConfig: any = {
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
};

// Ajouter l'adapter seulement si on est dans un environnement qui le nécessite
// (par exemple, Vercel avec POSTGRES_PRISMA_URL)
if (process.env.POSTGRES_PRISMA_URL && adapter) {
  clientConfig.adapter = adapter;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(clientConfig);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

