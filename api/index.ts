import path from 'path';
import fs from 'fs';

try {
  if (process.env.DATABASE_URL) {
    let dbUrl = process.env.DATABASE_URL.trim();
    if ((dbUrl.startsWith('"') && dbUrl.endsWith('"')) || (dbUrl.startsWith("'") && dbUrl.endsWith("'"))) {
      dbUrl = dbUrl.slice(1, -1).trim();
    }
    process.env.DATABASE_URL = dbUrl;
  }

  const dbUrl = process.env.DATABASE_URL || '';
  const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

  if (!isPostgres) {
    const tmpDbPath = path.join('/tmp', 'dev.db');
    const localDbPath = path.join(process.cwd(), 'prisma', 'dev.db');

    if (!fs.existsSync(tmpDbPath) && fs.existsSync(localDbPath)) {
      fs.copyFileSync(localDbPath, tmpDbPath);
    }

    if (fs.existsSync(tmpDbPath)) {
      process.env.DATABASE_URL = `file:${tmpDbPath}`;
    } else if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = `file:${localDbPath}`;
    }
  }
} catch (err) {
  console.error('Error preparing database for serverless execution:', err);
}

import app from '../src/app';

export default app;
