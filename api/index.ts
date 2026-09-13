import path from 'path';
import fs from 'fs';

try {
  const isPostgres = process.env.DATABASE_URL?.startsWith('postgres') || process.env.DATABASE_URL?.startsWith('postgresql');
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
  console.error('Error preparing SQLite database for serverless execution:', err);
}

import app from '../src/app';

export default app;
