import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Utilise POSTGRES_PRISMA_URL pour Vercel Postgres (avec pooler)
// Fallback sur DATABASE_URL pour compatibilité avec d'autres configurations
const connectionString = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Missing database connection string. Please set POSTGRES_PRISMA_URL or DATABASE_URL environment variable."
  );
}

const pool = new Pool({
  connectionString,
});

export const adapter = new PrismaPg(pool);

// Pour les migrations Prisma, utilisez POSTGRES_URL_NON_POOLING
// Configurez-le via: DATABASE_URL=$POSTGRES_URL_NON_POOLING npx prisma migrate deploy
