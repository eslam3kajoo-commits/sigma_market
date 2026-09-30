import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DEFAULT_DATABASE_URL = "postgresql://neondb_owner:npg_Rz8XNPvL2exq@ep-icy-shadow-axama5il-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

let dbUrl = (process.env.DATABASE_URL || DEFAULT_DATABASE_URL).trim();
if ((dbUrl.startsWith('"') && dbUrl.endsWith('"')) || (dbUrl.startsWith("'") && dbUrl.endsWith("'"))) {
  dbUrl = dbUrl.slice(1, -1).trim();
}
if (!dbUrl.startsWith('postgres://') && !dbUrl.startsWith('postgresql://')) {
  dbUrl = DEFAULT_DATABASE_URL;
}
process.env.DATABASE_URL = dbUrl;

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'development_smart_warranty_jwt_secret_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  databaseUrl: dbUrl
};
