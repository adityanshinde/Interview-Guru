import { Pool } from 'pg';
import dns from 'node:dns';

/**
 * PostgreSQL Connection Pool for Neon
 * Manages connections to Neon PostgreSQL database
 */
let pool: Pool | null = null;
let poolInitialization: Promise<Pool> | null = null;
let isConnected = false;

export function isDBConnected(): boolean {
  return isConnected;
}

async function resolveNeonHost(hostname: string): Promise<string> {
  try {
    const resolver = new dns.Resolver();
    resolver.setServers(['8.8.8.8', '1.1.1.1', '9.9.9.9']);

    const addresses = await new Promise<string[]>((resolve, reject) => {
      resolver.resolve4(hostname, (error, resolvedAddresses) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(resolvedAddresses);
      });
    });
    const address = addresses[0];

    if (address) {
      console.log(`[DB] DNS resolved ${hostname} -> ${address}`);
      return address;
    }
  } catch (error: any) {
    console.warn(`[DB] Public DNS lookup failed for ${hostname}: ${error.message}`);
  }

  return hostname;
}

async function ensureDatabaseSchema(databasePool: Pool): Promise<void> {
  const userColumns = await databasePool.query<{ column_name: string }>(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users';
  `);
  const userColumnNames = new Set(userColumns.rows.map((row) => row.column_name));

  if (userColumnNames.has('trials_used') && !userColumnNames.has('trial_used')) {
    await databasePool.query(`
      ALTER TABLE users RENAME COLUMN trials_used TO trial_used;
    `);
    console.log('[DB] ✅ Migrated users.trials_used -> users.trial_used');
  }

  await databasePool.query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      email TEXT NOT NULL DEFAULT '',
      plan TEXT NOT NULL DEFAULT 'free',
      subscription_status TEXT NOT NULL DEFAULT 'trial',
      trial_used BOOLEAN NOT NULL DEFAULT FALSE,
      trial_start_date TIMESTAMP,
      current_month TEXT NOT NULL DEFAULT '',
      voice_minutes_used INTEGER NOT NULL DEFAULT 0,
      chat_messages_used INTEGER NOT NULL DEFAULT 0,
      sessions_used INTEGER NOT NULL DEFAULT 0,
      stripe_customer_id TEXT,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL,
      last_active_at TIMESTAMP
    );
  `);

  await databasePool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP,
      questions_asked INTEGER NOT NULL DEFAULT 0,
      voice_minutes_used INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL,
      notes TEXT
    );
  `);

  await databasePool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP NOT NULL
    );
  `);

  await databasePool.query(`
    CREATE INDEX IF NOT EXISTS idx_sessions_user_status
    ON sessions (user_id, status, start_time DESC);
  `);

  await databasePool.query(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
    ON audit_logs (user_id, created_at DESC);
  `);
}

export async function initializeDatabase(): Promise<Pool> {
  if (pool) {
    return pool;
  }

  if (poolInitialization) {
    return poolInitialization;
  }

  poolInitialization = (async () => {
    const DATABASE_URL = process.env.DATABASE_URL;

    if (!DATABASE_URL) {
      throw new Error('[DB] DATABASE_URL is not set');
    }

    const url = new URL(DATABASE_URL);
    const resolvedHost = await resolveNeonHost(url.hostname);

    pool = new Pool({
      host: resolvedHost,
      port: url.port ? parseInt(url.port, 10) : 5432,
      user: url.username,
      password: url.password,
      database: url.pathname.replace(/^\//, ''),
      ssl: {
        rejectUnauthorized: false,
        servername: url.hostname,
      },
      max: 10,
      min: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      statement_timeout: 30000,
      query_timeout: 30000,
    });

    await ensureDatabaseSchema(pool);
    console.log('[DB] ✅ Database schema ready');

    // Test connection asynchronously, but do not block startup on it.
    void pool.query('SELECT NOW()')
      .then(() => {
        console.log('[DB] ✅ Connected to Neon PostgreSQL');
        isConnected = true;
      })
      .catch((err) => {
        console.error('[DB] ❌ Connection test failed:', err.message);
        isConnected = false;
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
  })();

  return poolInitialization;
}

export async function queryDatabase(
  query: string,
  params: any[] = []
): Promise<any[]> {
  try {
    if (!pool) {
      await initializeDatabase();
    }

    if (!pool) {
      throw new Error('Database pool not initialized');
    }

    const result = await pool.query(query, params);
    isConnected = true;
    return result.rows;
  } catch (error: any) {
    console.error('[DB] Query failed:', error.message);
    console.error('[DB] Query:', query);

    if (['ENOTFOUND', 'ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', '57P01', '57P03'].includes(error?.code)) {
      isConnected = false;
    }

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
