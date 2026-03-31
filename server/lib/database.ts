import { Pool } from 'pg';

/**
 * PostgreSQL Connection Pool for Neon
 * Manages connections to Neon PostgreSQL database
 */
let pool: Pool | null = null;
let isConnected = false;

export function isDBConnected(): boolean {
  return isConnected;
}

export function initializeDatabase(): Pool {
  if (pool) {
    return pool;
  }

  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    console.warn('[DB] ⚠️  DATABASE_URL not set - database features disabled');
    isConnected = false;
    return new Pool({ connectionString: '' });
  }

  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 10,
    min: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    statement_timeout: 30000,
    query_timeout: 30000,
  });

  // Test connection asynchronously
  pool.query('SELECT NOW()', (err) => {
    if (err) {
      console.error('[DB] ❌ Connection test failed:', err.message);
      isConnected = false;
      return;
    }
    console.log('[DB] ✅ Connected to Neon PostgreSQL');
    isConnected = true;
  });

  // Error handling for pool with graceful recovery
  pool.on('error', (err) => {
    console.error('[DB] ⚠️ Pool error:', err.message);
    // Don't immediately mark as disconnected; allow reconnection
  });

  pool.on('connect', () => {
    console.log('[DB] ℹ️ New connection established');
  });

  return pool;
}

export async function queryDatabase(
  query: string,
  params: any[] = []
): Promise<any[]> {
  try {
    if (!pool) {
      pool = initializeDatabase();
    }

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error: any) {
    console.error('[DB] Query failed:', error.message);
    console.error('[DB] Query:', query);
    throw error;
  }
}

export async function queryDatabaseSingle(
  query: string,
  params: any[] = []
): Promise<any> {
  const rows = await queryDatabase(query, params);
  return rows[0] || null;
}

export async function executeDatabase(
  query: string,
  params: any[] = []
): Promise<void> {
  await queryDatabase(query, params);
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[DB] Connection pool closed');
  }
}

export { Pool };
