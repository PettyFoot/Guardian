import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';
import { fileURLToPath } from "url";

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}


// Get __dirname equivalent in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__fiame);

// Read your SSL cert
const caCert = fs.readFileSync(path.resolve(__dirname, "../certs/global-bundle.pem"), "utf-8");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    ca: caCert,             // ✅ Use the trusted root cert
    rejectUnauthorized: true // ✅ Enforce cert validation
  },
});

export const db = drizzle(pool, { schema });