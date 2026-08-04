const { createPgDatabase } = require('./pg_db');

const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.NEON_URL;

async function initializeDatabase() {
  if (!DATABASE_URL) {
    console.error('DATABASE_URL is required to initialize the PostgreSQL schema.');
    process.exit(1);
  }

  console.error('[Init DB] Connecting to PostgreSQL and ensuring schema exists');
  const db = await createPgDatabase(DATABASE_URL);
  try {
    console.error('[Init DB] PostgreSQL schema verified successfully');
  } finally {
    await db.close();
  }
}

initializeDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[Init DB] Failed to initialize database:', error);
    process.exit(1);
  });
