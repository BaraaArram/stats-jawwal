const { Pool } = require('pg');

async function createPgDatabase(connectionString) {
  const pool = new Pool({ connectionString });

  // Ensure tables exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      userId text PRIMARY KEY,
      username text,
      teamId text,
      metadata jsonb,
      createdAt timestamptz DEFAULT now(),
      updatedAt timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS teams (
      teamId text PRIMARY KEY,
      name text,
      metadata jsonb,
      createdAt timestamptz DEFAULT now(),
      updatedAt timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS records (
      recordId text PRIMARY KEY,
      userId text,
      teamId text,
      payload jsonb,
      createdAt timestamptz DEFAULT now(),
      updatedAt timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS teamStats (
      teamId text PRIMARY KEY,
      stats jsonb,
      lastUpdatedAt timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS registrationSummaries (
      generatedAt timestamptz PRIMARY KEY,
      totalRecords integer,
      agents jsonb,
      payload jsonb,
      createdAt timestamptz DEFAULT now(),
      updatedAt timestamptz DEFAULT now()
    );
  `);

  return {
    type: 'pg',
    pool,
    async findItem(collection, key, value) {
      const table = mapCollection(collection);
      const q = `SELECT * FROM ${table} WHERE ${key} = $1 LIMIT 1`;
      const res = await pool.query(q, [value]);
      if (res.rows.length === 0) return null;
      return normalizeRow(collection, res.rows[0]);
    },
    async upsertItem(collection, key, value, item) {
      if (collection === 'users') {
        const q = `INSERT INTO users (userId, username, teamId, metadata, createdAt, updatedAt)
          VALUES ($1,$2,$3,$4,now(),now())
          ON CONFLICT (userId) DO UPDATE SET username = EXCLUDED.username, teamId = EXCLUDED.teamId, metadata = EXCLUDED.metadata, updatedAt = now()
          RETURNING *`;
        const res = await pool.query(q, [String(value), item.username || null, item.teamId || null, item.metadata || null]);
        return normalizeRow('users', res.rows[0]);
      }

      if (collection === 'teams') {
        const q = `INSERT INTO teams (teamId, name, metadata, createdAt, updatedAt)
          VALUES ($1,$2,$3,now(),now())
          ON CONFLICT (teamId) DO UPDATE SET name = EXCLUDED.name, metadata = EXCLUDED.metadata, updatedAt = now()
          RETURNING *`;
        const res = await pool.query(q, [String(value), item.name || null, item.metadata || null]);
        return normalizeRow('teams', res.rows[0]);
      }

      if (collection === 'records') {
        const q = `INSERT INTO records (recordId, userId, teamId, payload, createdAt, updatedAt)
          VALUES ($1,$2,$3,$4,now(),now())
          ON CONFLICT (recordId) DO UPDATE SET userId = EXCLUDED.userId, teamId = EXCLUDED.teamId, payload = EXCLUDED.payload, updatedAt = now()
          RETURNING *`;
        const res = await pool.query(q, [String(value), item.userId || null, item.teamId || null, item.payload || null]);
        return normalizeRow('records', res.rows[0]);
      }

      if (collection === 'teamStats') {
        const q = `INSERT INTO teamStats (teamId, stats, lastUpdatedAt)
          VALUES ($1,$2,$3)
          ON CONFLICT (teamId) DO UPDATE SET stats = EXCLUDED.stats, lastUpdatedAt = EXCLUDED.lastUpdatedAt
          RETURNING *`;
        const res = await pool.query(q, [String(value), item.stats || null, item.lastUpdatedAt || new Date().toISOString()]);
        return normalizeRow('teamStats', res.rows[0]);
      }

      if (collection === 'registrationSummaries') {
        const q = `INSERT INTO registrationSummaries (generatedAt, totalRecords, agents, payload, createdAt, updatedAt)
          VALUES ($1,$2,$3,$4,now(),now())
          ON CONFLICT (generatedAt) DO UPDATE SET totalRecords = EXCLUDED.totalRecords, agents = EXCLUDED.agents, payload = EXCLUDED.payload, updatedAt = now()
          RETURNING *`;
        const res = await pool.query(q, [String(value), item.totalRecords || null, item.agents || null, item.payload || null]);
        return normalizeRow('registrationSummaries', res.rows[0]);
      }

      return null;
    },
    async filterItems(collection, key, value) {
      const table = mapCollection(collection);
      const q = `SELECT * FROM ${table} WHERE ${key} = $1`;
      const res = await pool.query(q, [value]);
      return res.rows.map(r => normalizeRow(collection, r));
    },
    async listCollection(collection) {
      const table = mapCollection(collection);
      const q = `SELECT * FROM ${table}`;
      const res = await pool.query(q);
      return res.rows.map(r => normalizeRow(collection, r));
    },
    async deleteItem(collection, key, value) {
      const table = mapCollection(collection);
      const q = `DELETE FROM ${table} WHERE ${key} = $1 RETURNING *`;
      const res = await pool.query(q, [value]);
      return res.rows[0] ? normalizeRow(collection, res.rows[0]) : null;
    },
    async write() { /* noop for pg */ },
    async close() { await pool.end(); }
  };
}

function mapCollection(collection) {
  if (collection === 'users') return 'users';
  if (collection === 'teams') return 'teams';
  if (collection === 'records') return 'records';
  if (collection === 'teamStats') return 'teamStats';
  if (collection === 'registrationSummaries') return 'registrationSummaries';
  return collection;
}

function normalizeRow(collection, row) {
  if (!row) return null;
  if (collection === 'users') {
    return {
      userId: row.userid || row.userId,
      username: row.username,
      teamId: row.teamid || row.teamId,
      metadata: row.metadata || null,
      createdAt: row.createdat || row.createdAt,
      updatedAt: row.updatedat || row.updatedAt
    };
  }
  if (collection === 'teams') {
    return {
      teamId: row.teamid || row.teamId,
      name: row.name,
      metadata: row.metadata || null,
      createdAt: row.createdat || row.createdAt,
      updatedAt: row.updatedat || row.updatedAt
    };
  }
  if (collection === 'records') {
    return {
      recordId: row.recordid || row.recordId,
      userId: row.userid || row.userId,
      teamId: row.teamid || row.teamId,
      payload: row.payload || null,
      createdAt: row.createdat || row.createdAt,
      updatedAt: row.updatedat || row.updatedAt
    };
  }
  if (collection === 'teamStats') {
    return {
      teamId: row.teamid || row.teamId,
      stats: row.stats || null,
      lastUpdatedAt: row.lastupdatedat || row.lastUpdatedAt
    };
  }
  if (collection === 'registrationSummaries') {
    return {
      generatedAt: row.generatedat || row.generatedAt,
      totalRecords: row.totalrecords || row.totalRecords,
      agents: row.agents || null,
      payload: row.payload || null,
      createdAt: row.createdat || row.createdAt,
      updatedAt: row.updatedat || row.updatedAt
    };
  }
  return row;
}

module.exports = { createPgDatabase };
