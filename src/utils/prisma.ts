const DEFAULT_DATABASE_URL = "postgresql://neondb_owner:npg_Rz8XNPvL2exq@ep-icy-shadow-axama5il-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

let dbUrl = (process.env.DATABASE_URL || DEFAULT_DATABASE_URL).trim();
if ((dbUrl.startsWith('"') && dbUrl.endsWith('"')) || (dbUrl.startsWith("'") && dbUrl.endsWith("'"))) {
  dbUrl = dbUrl.slice(1, -1).trim();
}
if (!dbUrl.startsWith('postgres://') && !dbUrl.startsWith('postgresql://')) {
  dbUrl = DEFAULT_DATABASE_URL;
}
process.env.DATABASE_URL = dbUrl;

// Use require after setting process.env.DATABASE_URL to prevent static ES import hoisting
const { PrismaClient } = require('@prisma/client');

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});
