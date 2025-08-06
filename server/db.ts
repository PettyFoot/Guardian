
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure connection based on database type
const databaseUrl = process.env.DATABASE_URL;
const isAWSRDS = databaseUrl.includes('rds.amazonaws.com');
const isNeon = databaseUrl.includes('neon.tech');

const poolConfig = {
  connectionString: databaseUrl,
  // Add SSL configuration for external databases
  ...(isAWSRDS && {
    ssl: {
      rejectUnauthorized: false,
      require: true
    },
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    max: 10
  }),
  // Keep existing configuration for Neon
  ...(isNeon && {
    max: 10
  })
};

export const pool = new Pool(poolConfig);
export const db = drizzle(pool, { schema });
