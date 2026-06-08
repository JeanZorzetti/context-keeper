import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var prisma: PrismaClient | undefined;
}

let _client: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (_client) return _client;
  if (global.prisma) {
    _client = global.prisma;
    return _client;
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  _client = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    log: ["error", "warn"],
  });
  if (process.env.NODE_ENV !== "production") {
    global.prisma = _client;
  }
  return _client;
}

export default getPrisma;
