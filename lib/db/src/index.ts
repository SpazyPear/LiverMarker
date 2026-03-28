import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL?.trim();

export const pool: pg.Pool | null =
  databaseUrl && databaseUrl.length > 0 ? new Pool({ connectionString: databaseUrl }) : null;

export const db = pool != null ? drizzle(pool, { schema }) : null;

export * from "./schema";
export { seedProductionData } from "./seed-production";
