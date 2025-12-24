// Ce fichier est utilisé uniquement en production sur Vercel
// En développement local, Prisma utilise la connexion standard via DATABASE_URL

// Ne jamais créer l'adapter en développement ou lors du build
const isDevelopment = 
  process.env.NODE_ENV === "development" || 
  !process.env.NODE_ENV ||
  process.env.VERCEL_ENV === "development";

let adapter: any = undefined;

if (!isDevelopment && process.env.POSTGRES_PRISMA_URL) {
  try {
    const { PrismaPg } = require("@prisma/adapter-pg");
    const { Pool } = require("pg");

    const connectionString = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        "Missing database connection string. Please set POSTGRES_PRISMA_URL or DATABASE_URL environment variable."
      );
    }

    const pool = new Pool({
      connectionString,
    });

    adapter = new PrismaPg(pool);
  } catch (error) {
    // Si l'import échoue, adapter reste undefined
    // Ignorer silencieusement
  }
}

export { adapter };

// Pour les migrations Prisma, utilisez POSTGRES_URL_NON_POOLING
// Configurez-le via: DATABASE_URL=$POSTGRES_URL_NON_POOLING npx prisma migrate deploy
