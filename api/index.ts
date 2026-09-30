import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DEFAULT_POSTGRES_URL = "postgresql://neondb_owner:npg_Rz8XNPvL2exq@ep-icy-shadow-axama5il-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

let dbUrl = (process.env.DATABASE_URL || DEFAULT_POSTGRES_URL).trim();
if ((dbUrl.startsWith('"') && dbUrl.endsWith('"')) || (dbUrl.startsWith("'") && dbUrl.endsWith("'"))) {
  dbUrl = dbUrl.slice(1, -1).trim();
}
if (!dbUrl.startsWith('postgres://') && !dbUrl.startsWith('postgresql://')) {
  dbUrl = DEFAULT_POSTGRES_URL;
}
process.env.DATABASE_URL = dbUrl;

import app from '../src/app';

export default app;
