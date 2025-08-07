import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

// Load the AWS RDS root certificate
const caCert = fs.readFileSync(path.resolve(__dirname, './global-bundle.pem')).toString();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    ca: caCert,             // ✅ Use the trusted root cert
    rejectUnauthorized: true // ✅ Enforce cert validation
  },
});

export const db = drizzle(pool, { schema });