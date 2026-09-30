import path from 'path';
import fs from 'fs';

const DEFAULT_POSTGRES_URL = "postgresql://neondb_owner:npg_Rz8XNPvL2exq@ep-icy-shadow-axama5il-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

try {
  let dbUrl = (process.env.DATABASE_URL || '').trim();
  if ((dbUrl.startsWith('"') && dbUrl.endsWith('"')) || (dbUrl.startsWith("'") && dbUrl.endsWith("'"))) {
    dbUrl = dbUrl.slice(1, -1).trim();
  }

  const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');
  if (!isPostgres) {
    process.env.DATABASE_URL = DEFAULT_POSTGRES_URL;
  } else {
    process.env.DATABASE_URL = dbUrl;
  }
} catch (err) {
  console.error('Error preparing database for serverless execution:', err);
}

import app from '../src/app';

export default app;
