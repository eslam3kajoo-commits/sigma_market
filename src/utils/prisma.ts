import { PrismaClient } from '@prisma/client';

if (process.env.DATABASE_URL) {
  let dbUrl = process.env.DATABASE_URL.trim();
  if ((dbUrl.startsWith('"') && dbUrl.endsWith('"')) || (dbUrl.startsWith("'") && dbUrl.endsWith("'"))) {
    dbUrl = dbUrl.slice(1, -1).trim();
  }
  process.env.DATABASE_URL = dbUrl;
}

export const prisma = new PrismaClient();
