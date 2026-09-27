import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';
import fs from 'fs';

export const getSqlHost = (): string => {
  const envHost = process.env.SQL_HOST;
  if (envHost && fs.existsSync(envHost)) {
    return envHost;
  }

  // Cloud Run native mount point: /cloudsql/<project:region:instance>
  if (fs.existsSync('/cloudsql')) {
    try {
      const entries = fs.readdirSync('/cloudsql');
      if (entries.length > 0) {
        return `/cloudsql/${entries[0]}`;
      }
    } catch {}
  }

  // Development container mount point: /app/cloudsql/<project:region:instance>
  if (fs.existsSync('/app/cloudsql')) {
    try {
      const entries = fs.readdirSync('/app/cloudsql');
      if (entries.length > 0) {
        return `/app/cloudsql/${entries[0]}`;
      }
    } catch {}
  }

  // Fallback to environment variable or standard localhost
  return envHost || 'localhost';
};

export const createPool = () => {
  return new Pool({
    host: getSqlHost(),
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    connectionTimeoutMillis: 15000,
  });
};

const pool = createPool();

pool.on('error', (err) => {
  console.error('Unexpected error on idle SQL pool client:', err);
});

export const db = drizzle(pool, { schema });
