// ============================================================
// config/db.js — Prisma client singleton
// Using a singleton prevents "too many connections" in dev
// ============================================================
const { PrismaClient } = require("@prisma/client");

let prisma;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  // In dev, reuse the instance across hot-reloads
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ["query", "warn", "error"],
    });
  }
  prisma = global.__prisma;
}

module.exports = prisma;
