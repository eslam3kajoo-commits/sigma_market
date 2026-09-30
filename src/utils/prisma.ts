import { PrismaClient } from '@prisma/client';

let connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_Rz8XNPvL2exq@ep-icy-shadow-axama5il-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
connectionString = connectionString.trim();
if ((connectionString.startsWith('"') && connectionString.endsWith('"')) || (connectionString.startsWith("'") && connectionString.endsWith("'"))) {
  connectionString = connectionString.slice(1, -1).trim();
}
process.env.DATABASE_URL = connectionString;

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: connectionString
    }
  }
});
