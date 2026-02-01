import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** Formate une requête SQL pour un log compact (truncate long IN clauses, single line) */
function formatQueryCompact(query: string, maxLength = 120): string {
  // Remplace "IN ($1,$2,...,$650)" par "IN ($1..$650)" pour éviter le spam
  const truncated = query.replace(
    /\bIN\s*\(\s*(\$\d+)(?:,\s*\$\d+)*,\s*(\$\d+)\s*\)/g,
    (_, first, last) => {
      const firstNum = parseInt(first.slice(1), 10);
      const lastNum = parseInt(last.slice(1), 10);
      return firstNum === lastNum ? `IN (${first})` : `IN ($${firstNum}..$${lastNum})`;
    }
  );
  // Remplacer les retours à la ligne par des espaces
  const singleLine = truncated.replace(/\s+/g, " ").trim();
  return singleLine.length <= maxLength
    ? singleLine
    : `${singleLine.slice(0, maxLength - 3)}...`;
}

const isDev = process.env.NODE_ENV === "development";
const logQueries = process.env.PRISMA_LOG_QUERIES;

const disableQueryLog = logQueries === "false" || logQueries === "0";
const useVerboseLogger = isDev && logQueries === "full";
const useCompactLogger =
  isDev && !disableQueryLog && !useVerboseLogger;

const prismaLogConfig: Array<"error" | "warn" | "query" | { emit: "event"; level: "query" }> =
  isDev
    ? disableQueryLog
      ? ["error", "warn"]
      : useVerboseLogger
        ? ["query", "error", "warn"]
        : [
            { emit: "event", level: "query" },
            "error",
            "warn",
          ]
    : ["error"];

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: prismaLogConfig,
  });

if (useCompactLogger) {
  prisma.$on("query" as never, (e: { query: string; duration: number }) => {
    const preview = formatQueryCompact(e.query);
    console.log(`prisma ${e.duration}ms | ${preview}`);
  });
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

