const { Pool } = require('pg');

async function executeDbQuery(connection, query, params = []) {
  try {
    return await connection.query(query, params);
  } catch (error) {
    console.error('[PG DB] connection query failed', {
      query,
      params,
      message: error?.message || String(error)
    });
    throw error;
  }
}

async function createPgDatabase(connectionString) {
  const pool = new Pool({ connectionString });

  pool.on('connect', async (client) => {
    try {
      await executeDbQuery(client, 'SET search_path TO public');
    } catch (err) {
      console.error('[PG DB] failed to set search_path on new client', err?.message || err);
      throw err;
    }
  });

  pool.on('error', (error, client) => {
    console.error('[PG DB] pool error', {
      message: error?.message || String(error),
      code: error?.code,
      client: Boolean(client)
    });
  });

  async function executeQuery(query, params = []) {
    try {
      return await pool.query(query, params);
    } catch (error) {
      console.error('[PG DB] query failed', {
        query,
        params,
        message: error?.message || String(error)
      });
      throw error;
    }
  }

  console.error('[PG DB] connecting to postgres and initializing schema');
  const client = await pool.connect();
  try {
    await executeDbQuery(client, 'CREATE SCHEMA IF NOT EXISTS public');
    await executeDbQuery(client, 'SET search_path TO public');
    await cleanUpLegacyTables(client);
    await ensureCurrentSchema(client);

    const usersExists = await doesTableExist(client, 'users');
    const teamsExists = await doesTableExist(client, 'teams');
    if (!usersExists || !teamsExists) {
      console.error('[PG DB] required tables missing after initial schema setup', { usersExists, teamsExists });
      await ensureCurrentSchema(client);
    }

    try {
      await executeDbQuery(client, 'SELECT 1 FROM users LIMIT 1');
      await executeDbQuery(client, 'SELECT 1 FROM teams LIMIT 1');
    } catch (testErr) {
      if (testErr && testErr.code === '42P01') {
        console.error('[PG DB] relation missing during verification, retrying schema setup', testErr.message || testErr);
        await ensureCurrentSchema(client);
        await executeDbQuery(client, 'SELECT 1 FROM users LIMIT 1');
        await executeDbQuery(client, 'SELECT 1 FROM teams LIMIT 1');
      } else {
        throw testErr;
      }
    }
  } finally {
    client.release();
  }

  console.error('[PG DB] postgres schema initialized successfully');

  return {
    type: 'pg',
    pool,
    async findItem(collection, key, value) {
      if (!isValidColumnName(key)) {
        throw new Error(`Invalid column name: ${key}`);
      }
      const table = mapCollection(collection);
      const q = `SELECT * FROM ${table} WHERE ${key} = $1 LIMIT 1`;
      const res = await executeQuery(q, [value]);
      if (res.rows.length === 0) return null;
      return normalizeRow(collection, res.rows[0]);
    },
    async findItems(collection, key, values) {
      if (!isValidColumnName(key)) {
        throw new Error(`Invalid column name: ${key}`);
      }
      if (!Array.isArray(values) || values.length === 0) {
        return [];
      }
      const table = mapCollection(collection);
      const q = `SELECT * FROM ${table} WHERE ${key} = ANY($1)`;
      const res = await executeQuery(q, [values]);
      return res.rows.map(r => normalizeRow(collection, r));
    },
    async upsertItem(collection, key, value, item) {
      if (collection === 'users') {
        const q = `INSERT INTO users (userId, username, email, originalAgentName, teamId, totalRecords, approvedCount, pendingCount, rejectedCount, otherCount, lastSeenSummaryAt, metadata, createdAt, updatedAt)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now(),now())
          ON CONFLICT (userId) DO UPDATE SET username = EXCLUDED.username, email = EXCLUDED.email, originalAgentName = EXCLUDED.originalAgentName, teamId = EXCLUDED.teamId, totalRecords = EXCLUDED.totalRecords, approvedCount = EXCLUDED.approvedCount, pendingCount = EXCLUDED.pendingCount, rejectedCount = EXCLUDED.rejectedCount, otherCount = EXCLUDED.otherCount, lastSeenSummaryAt = EXCLUDED.lastSeenSummaryAt, metadata = EXCLUDED.metadata, updatedAt = now()
          RETURNING *`;
        const res = await executeQuery(q, [
          String(value),
          item.username || null,
          item.email || null,
          item.originalAgentName || null,
          item.teamId || null,
          item.totalRecords || 0,
          item.approvedCount || 0,
          item.pendingCount || 0,
          item.rejectedCount || 0,
          item.otherCount || 0,
          item.lastSeenSummaryAt || null,
          item.metadata ? JSON.stringify(item.metadata) : null
        ]);
        return normalizeRow('users', res.rows[0]);
      }

      if (collection === 'teams') {
        const q = `INSERT INTO teams (teamId, name, totalRecords, approvedCount, pendingCount, rejectedCount, otherCount, memberCount, lastSummaryAt, metadata, createdAt, updatedAt)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),now())
          ON CONFLICT (teamId) DO UPDATE SET name = EXCLUDED.name, totalRecords = EXCLUDED.totalRecords, approvedCount = EXCLUDED.approvedCount, pendingCount = EXCLUDED.pendingCount, rejectedCount = EXCLUDED.rejectedCount, otherCount = EXCLUDED.otherCount, memberCount = EXCLUDED.memberCount, lastSummaryAt = EXCLUDED.lastSummaryAt, metadata = EXCLUDED.metadata, updatedAt = now()
          RETURNING *`;
        const res = await executeQuery(q, [
          String(value),
          item.name || null,
          item.totalRecords || 0,
          item.approvedCount || 0,
          item.pendingCount || 0,
          item.rejectedCount || 0,
          item.otherCount || 0,
          item.memberCount || 0,
          item.lastSummaryAt || null,
          item.metadata ? JSON.stringify(item.metadata) : null
        ]);
        return normalizeRow('teams', res.rows[0]);
      }

      if (collection === 'records') {
        console.log('[PG DB] Upserting record:', {
          recordId: String(value),
          fullName: item.fullName,
          customerIdNumber: item.customerIdNumber,
          mobileNumber: item.mobileNumber,
          customerStatus: item.customerStatus
        });
        
        const q = `INSERT INTO records (recordId, userId, teamId, fullName, customerIdNumber, mobileNumber, creationDate, submissionDate, approvalDate, regAgentName, customerStatus, regAgentDeviceName, allowEdit, createdAt, updatedAt)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now(),now())
          ON CONFLICT (recordId) DO UPDATE SET userId = EXCLUDED.userId, teamId = EXCLUDED.teamId, fullName = EXCLUDED.fullName, customerIdNumber = EXCLUDED.customerIdNumber, mobileNumber = EXCLUDED.mobileNumber, creationDate = EXCLUDED.creationDate, submissionDate = EXCLUDED.submissionDate, approvalDate = EXCLUDED.approvalDate, regAgentName = EXCLUDED.regAgentName, customerStatus = EXCLUDED.customerStatus, regAgentDeviceName = EXCLUDED.regAgentDeviceName, allowEdit = EXCLUDED.allowEdit, createdAt = COALESCE(records.createdAt, EXCLUDED.createdAt), updatedAt = now()
          RETURNING *`;
        const res = await executeQuery(q, [
          String(value),
          item.userId || null,
          item.teamId || null,
          item.fullName || null,
          item.customerIdNumber || null,
          item.mobileNumber || null,
          item.creationDate || null,
          item.submissionDate || null,
          item.approvalDate || null,
          item.regAgentName || null,
          item.customerStatus || null,
          item.regAgentDeviceName || null,
          item.allowEdit != null ? String(item.allowEdit) : null
        ]);
        
        const normalized = normalizeRow('records', res.rows[0]);
        console.log('[PG DB] Record upserted in DB:', {
          recordId: normalized.recordId,
          fullName: normalized.fullName,
          customerIdNumber: normalized.customerIdNumber,
          mobileNumber: normalized.mobileNumber,
          customerStatus: normalized.customerStatus
        });
        
        return normalized;
      }

      if (collection === 'teamStats') {
        const q = `INSERT INTO teamStats (teamId, stats, lastUpdatedAt)
          VALUES ($1,$2,$3)
          ON CONFLICT (teamId) DO UPDATE SET stats = EXCLUDED.stats, lastUpdatedAt = EXCLUDED.lastUpdatedAt
          RETURNING *`;
        const res = await executeQuery(q, [String(value), item.stats ? JSON.stringify(item.stats) : null, item.lastUpdatedAt || new Date().toISOString()]);
        return normalizeRow('teamStats', res.rows[0]);
      }

      if (collection === 'registrationSummaries') {
        const q = `INSERT INTO registrationSummaries (summaryId, generatedAt, totalRecords, agents, payload, createdAt, updatedAt)
            VALUES ($1,$2,$3,$4,$5,now(),now())
            ON CONFLICT (summaryId) DO UPDATE SET generatedAt = EXCLUDED.generatedAt, totalRecords = EXCLUDED.totalRecords, agents = EXCLUDED.agents, payload = EXCLUDED.payload, updatedAt = now()
            RETURNING *`;
          const res = await executeQuery(q, [String(value), item.generatedAt || null, item.totalRecords || null, item.agents ? JSON.stringify(item.agents) : null, item.payload ? JSON.stringify(item.payload) : null]);
          return normalizeRow('registrationSummaries', res.rows[0]);
      }

      return null;
    },
    // PERF FIX: bulk-ensure teams exist with a single round trip instead of
    // one SELECT (+ maybe INSERT) per team. Used to satisfy the
    // records/users -> teams foreign key before a batch upsert. Only fills
    // in a bare placeholder row if missing; a later explicit upsertItem
    // call for a real team payload still fully updates it.
    async ensureTeamsExist(teamIds) {
      const ids = [...new Set((teamIds || []).filter(Boolean).map(String))];
      if (ids.length === 0) return;
      const q = `INSERT INTO teams (teamId, createdAt, updatedAt)
        SELECT id, now(), now() FROM unnest($1::text[]) AS id
        ON CONFLICT (teamId) DO NOTHING`;
      await executeQuery(q, [ids]);
    },
    // PERF FIX: bulk-ensure users exist (see ensureTeamsExist above). Callers
    // must have already ensured referenced teams exist, since userId->teamId
    // is a foreign key.
    async ensureUsersExist(users) {
      const map = new Map();
      for (const u of users || []) {
        if (!u || !u.userId) continue;
        const id = String(u.userId);
        if (!map.has(id)) map.set(id, u.teamId ? String(u.teamId) : null);
      }
      if (map.size === 0) return;
      const userIds = [...map.keys()];
      const teamIds = userIds.map((id) => map.get(id));
      const q = `INSERT INTO users (userId, teamId, createdAt, updatedAt)
        SELECT userId, teamId, now(), now() FROM unnest($1::text[], $2::text[]) AS t(userId, teamId)
        ON CONFLICT (userId) DO NOTHING`;
      await executeQuery(q, [userIds, teamIds]);
    },
    // PERF FIX: upsert every record in a batch with a single multi-row
    // INSERT ... ON CONFLICT statement instead of one round trip per record.
    // createdAt is intentionally left out of the UPDATE SET clause so an
    // existing row's createdAt is preserved automatically (same effect as
    // the old COALESCE(records.createdAt, EXCLUDED.createdAt), without
    // needing a separate SELECT first).
    async upsertRecordsBulk(records) {
      if (!Array.isArray(records) || records.length === 0) return [];
      const colList = ['recordId', 'userId', 'teamId', 'fullName', 'customerIdNumber', 'mobileNumber',
        'creationDate', 'submissionDate', 'approvalDate', 'regAgentName', 'customerStatus',
        'regAgentDeviceName', 'allowEdit'];
      const values = [];
      const placeholders = records.map((r, i) => {
        const base = i * colList.length;
        values.push(
          String(r.recordId), r.userId || null, r.teamId || null, r.fullName || null,
          r.customerIdNumber || null, r.mobileNumber || null, r.creationDate || null,
          r.submissionDate || null, r.approvalDate || null, r.regAgentName || null,
          r.customerStatus || null, r.regAgentDeviceName || null,
          r.allowEdit != null ? String(r.allowEdit) : null
        );
        return `(${colList.map((_, j) => `$${base + j + 1}`).join(',')}, now(), now())`;
      });
      const q = `INSERT INTO records (${colList.join(',')}, createdAt, updatedAt)
        VALUES ${placeholders.join(',')}
        ON CONFLICT (recordId) DO UPDATE SET
          userId = EXCLUDED.userId, teamId = EXCLUDED.teamId, fullName = EXCLUDED.fullName,
          customerIdNumber = EXCLUDED.customerIdNumber, mobileNumber = EXCLUDED.mobileNumber,
          creationDate = EXCLUDED.creationDate, submissionDate = EXCLUDED.submissionDate,
          approvalDate = EXCLUDED.approvalDate, regAgentName = EXCLUDED.regAgentName,
          customerStatus = EXCLUDED.customerStatus, regAgentDeviceName = EXCLUDED.regAgentDeviceName,
          allowEdit = EXCLUDED.allowEdit, updatedAt = now()
        RETURNING *`;
      const res = await executeQuery(q, values);
      return res.rows.map((row) => normalizeRow('records', row));
    },
    // PERF FIX: same idea as upsertRecordsBulk, for the `users` array in a
    // cache/refresh payload.
    async upsertUsersBulk(users) {
      if (!Array.isArray(users) || users.length === 0) return [];
      const colList = ['userId', 'username', 'email', 'originalAgentName', 'teamId', 'totalRecords', 'approvedCount', 'pendingCount',
        'rejectedCount', 'otherCount', 'lastSeenSummaryAt', 'metadata'];
      const values = [];
      const placeholders = users.map((u, i) => {
        const base = i * colList.length;
        values.push(
          String(u.userId), u.username || null, u.email || null, u.originalAgentName || null, u.teamId || null,
          u.totalRecords || 0, u.approvedCount || 0, u.pendingCount || 0,
          u.rejectedCount || 0, u.otherCount || 0, u.lastSeenSummaryAt || null,
          u.metadata ? JSON.stringify(u.metadata) : null
        );
        return `(${colList.map((_, j) => `$${base + j + 1}`).join(',')}, now(), now())`;
      });
      const q = `INSERT INTO users (${colList.join(',')}, createdAt, updatedAt)
        VALUES ${placeholders.join(',')}
        ON CONFLICT (userId) DO UPDATE SET
          username = EXCLUDED.username, email = EXCLUDED.email, originalAgentName = EXCLUDED.originalAgentName, teamId = EXCLUDED.teamId, totalRecords = EXCLUDED.totalRecords,
          approvedCount = EXCLUDED.approvedCount, pendingCount = EXCLUDED.pendingCount,
          rejectedCount = EXCLUDED.rejectedCount, otherCount = EXCLUDED.otherCount,
          lastSeenSummaryAt = EXCLUDED.lastSeenSummaryAt, metadata = EXCLUDED.metadata, updatedAt = now()
        RETURNING *`;
      const res = await executeQuery(q, values);
      return res.rows.map((row) => normalizeRow('users', row));
    },
    async filterItems(collection, key, value) {
      if (!isValidColumnName(key)) {
        throw new Error(`Invalid column name: ${key}`);
      }
      const table = mapCollection(collection);
      let q;
      let params;
      if (Array.isArray(value)) {
        q = `SELECT * FROM ${table} WHERE ${key} = ANY($1)`;
        params = [value];
      } else {
        q = `SELECT * FROM ${table} WHERE ${key} = $1`;
        params = [value];
      }
      const res = await executeQuery(q, params);
      return res.rows.map(r => normalizeRow(collection, r));
    },
    async filterItemsByDateRange(collection, dateColumn, startDate, endDate) {
      if (!isValidColumnName(dateColumn)) {
        throw new Error(`Invalid column name: ${dateColumn}`);
      }
      const table = mapCollection(collection);
      let q = `SELECT * FROM ${table}`;
      let params = [];
      
      if (startDate && endDate) {
        q += ` WHERE ${dateColumn} >= $1 AND ${dateColumn} <= $2`;
        params = [startDate, endDate];
      } else if (startDate) {
        q += ` WHERE ${dateColumn} >= $1`;
        params = [startDate];
      } else if (endDate) {
        q += ` WHERE ${dateColumn} <= $1`;
        params = [endDate];
      }
      
      const res = await executeQuery(q, params);
      return res.rows.map(r => normalizeRow(collection, r));
    },
    async listCollection(collection) {
      const table = mapCollection(collection);
      const q = `SELECT * FROM ${table}`;
      const res = await executeQuery(q);
      return res.rows.map(r => normalizeRow(collection, r));
    },
    async deleteItem(collection, key, value) {
      if (!isValidColumnName(key)) {
        throw new Error(`Invalid column name: ${key}`);
      }
      const table = mapCollection(collection);
      const q = `DELETE FROM ${table} WHERE ${key} = $1 RETURNING *`;
      const res = await executeQuery(q, [value]);
      return res.rows[0] ? normalizeRow(collection, res.rows[0]) : null;
    },
    async write() { /* noop for pg */ },
    async close() { await pool.end(); }
  };
}

async function cleanUpLegacyTables(client) {
  // Only drop tables that are truly legacy and not part of the current schema
  // Current schema uses: users, teams, records, teamStats, registrationSummaries
  const legacyTables = ['"user"', 'team', 'user_stats', 'record', 'registrations'];
  for (const table of legacyTables) {
    try {
      await executeDbQuery(client, `DROP TABLE IF EXISTS ${table}`);
    } catch (error) {
      console.warn(`Failed to drop legacy table ${table}:`, error.message);
    }
  }
}

async function ensureCurrentSchema(pool) {
  await executeDbQuery(pool, `CREATE TABLE IF NOT EXISTS teams (
      teamId text PRIMARY KEY,
      name text,
      totalRecords integer DEFAULT 0,
      approvedCount integer DEFAULT 0,
      pendingCount integer DEFAULT 0,
      rejectedCount integer DEFAULT 0,
      otherCount integer DEFAULT 0,
      memberCount integer DEFAULT 0,
      lastSummaryAt timestamptz,
      metadata jsonb,
      createdAt timestamptz DEFAULT now(),
      updatedAt timestamptz DEFAULT now()
    );
  `);

  await executeDbQuery(pool, `CREATE TABLE IF NOT EXISTS users (
      userId text PRIMARY KEY,
      username text,
      email text,
      originalAgentName text,
      teamId text,
      totalRecords integer DEFAULT 0,
      approvedCount integer DEFAULT 0,
      pendingCount integer DEFAULT 0,
      rejectedCount integer DEFAULT 0,
      otherCount integer DEFAULT 0,
      lastSeenSummaryAt timestamptz,
      metadata jsonb,
      createdAt timestamptz DEFAULT now(),
      updatedAt timestamptz DEFAULT now(),
      CONSTRAINT users_team_fk FOREIGN KEY (teamId) REFERENCES teams(teamId) ON DELETE CASCADE
    );
  `);

  await executeDbQuery(pool, `CREATE TABLE IF NOT EXISTS records (
      recordId text PRIMARY KEY,
      userId text,
      teamId text,
      fullName text,
      customerIdNumber text,
      mobileNumber text,
      creationDate text,
      submissionDate text,
      approvalDate text,
      regAgentName text,
      customerStatus text,
      regAgentDeviceName text,
      allowEdit text,
      createdAt timestamptz DEFAULT now(),
      updatedAt timestamptz DEFAULT now(),
      CONSTRAINT records_user_fk FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE,
      CONSTRAINT records_team_fk FOREIGN KEY (teamId) REFERENCES teams(teamId) ON DELETE CASCADE
    );
  `);

  await executeDbQuery(pool, `CREATE TABLE IF NOT EXISTS teamStats (
      teamId text PRIMARY KEY,
      stats jsonb,
      lastUpdatedAt timestamptz DEFAULT now(),
      CONSTRAINT teamstats_team_fk FOREIGN KEY (teamId) REFERENCES teams(teamId) ON DELETE CASCADE
    );
  `);

  await executeDbQuery(pool, `CREATE TABLE IF NOT EXISTS registrationSummaries (
      summaryId text PRIMARY KEY,
      generatedAt timestamptz,
      totalRecords integer,
      agents jsonb,
      payload jsonb,
      createdAt timestamptz DEFAULT now(),
      updatedAt timestamptz DEFAULT now()
    );
  `);

  await ensureForeignKeyConstraints(pool);

  // Migration: ensure `summaryId` column and unique index exist for registrationSummaries
  try {
    await executeDbQuery(pool, `ALTER TABLE registrationSummaries ADD COLUMN IF NOT EXISTS summaryId text;`);
    // populate legacy rows with a stable id (use generatedAt text when present)
    await executeDbQuery(pool, `UPDATE registrationSummaries SET summaryId = COALESCE(summaryId, to_char(generatedAt, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) WHERE summaryId IS NULL;`);
    // create a unique index to allow ON CONFLICT (summaryId)
    await executeDbQuery(pool, `CREATE UNIQUE INDEX IF NOT EXISTS registrationsummaries_summaryid_idx ON registrationSummaries (summaryId);`);
  } catch (mErr) {
    console.warn('Failed to migrate registrationSummaries schema:', mErr.message || mErr);
  }

  // Migration: ensure users and teams have explicit record counters and summary timestamps
  try {
    await executeDbQuery(pool, `ALTER TABLE users ADD COLUMN IF NOT EXISTS totalRecords integer DEFAULT 0;`);
    await executeDbQuery(pool, `ALTER TABLE users ADD COLUMN IF NOT EXISTS approvedCount integer DEFAULT 0;`);
    await executeDbQuery(pool, `ALTER TABLE users ADD COLUMN IF NOT EXISTS pendingCount integer DEFAULT 0;`);
    await executeDbQuery(pool, `ALTER TABLE users ADD COLUMN IF NOT EXISTS rejectedCount integer DEFAULT 0;`);
    await executeDbQuery(pool, `ALTER TABLE users ADD COLUMN IF NOT EXISTS otherCount integer DEFAULT 0;`);
    await executeDbQuery(pool, `ALTER TABLE users ADD COLUMN IF NOT EXISTS lastSeenSummaryAt timestamptz;`);

    await executeDbQuery(pool, `ALTER TABLE teams ADD COLUMN IF NOT EXISTS totalRecords integer DEFAULT 0;`);
    await executeDbQuery(pool, `ALTER TABLE teams ADD COLUMN IF NOT EXISTS approvedCount integer DEFAULT 0;`);
    await executeDbQuery(pool, `ALTER TABLE teams ADD COLUMN IF NOT EXISTS pendingCount integer DEFAULT 0;`);
    await executeDbQuery(pool, `ALTER TABLE teams ADD COLUMN IF NOT EXISTS rejectedCount integer DEFAULT 0;`);
    await executeDbQuery(pool, `ALTER TABLE teams ADD COLUMN IF NOT EXISTS otherCount integer DEFAULT 0;`);
    await executeDbQuery(pool, `ALTER TABLE teams ADD COLUMN IF NOT EXISTS memberCount integer DEFAULT 0;`);
    await executeDbQuery(pool, `ALTER TABLE teams ADD COLUMN IF NOT EXISTS lastSummaryAt timestamptz;`);

    await executeDbQuery(pool, `ALTER TABLE records ADD COLUMN IF NOT EXISTS fullName text;`);
    await executeDbQuery(pool, `ALTER TABLE records ADD COLUMN IF NOT EXISTS customerIdNumber text;`);
    await executeDbQuery(pool, `ALTER TABLE records ADD COLUMN IF NOT EXISTS mobileNumber text;`);
    await executeDbQuery(pool, `ALTER TABLE records ADD COLUMN IF NOT EXISTS creationDate text;`);
    await executeDbQuery(pool, `ALTER TABLE records ADD COLUMN IF NOT EXISTS submissionDate text;`);
    await executeDbQuery(pool, `ALTER TABLE records ADD COLUMN IF NOT EXISTS approvalDate text;`);
    await executeDbQuery(pool, `ALTER TABLE records ADD COLUMN IF NOT EXISTS regAgentName text;`);
    await executeDbQuery(pool, `ALTER TABLE records ADD COLUMN IF NOT EXISTS customerStatus text;`);
    await executeDbQuery(pool, `ALTER TABLE records ADD COLUMN IF NOT EXISTS regAgentDeviceName text;`);
    await executeDbQuery(pool, `ALTER TABLE records ADD COLUMN IF NOT EXISTS allowEdit text;`);
    await executeDbQuery(pool, `ALTER TABLE records DROP COLUMN IF EXISTS payload;`);
  } catch (mErr) {
    console.warn('Failed to migrate users/teams schema:', mErr.message || mErr);
  }

  const indexStatements = [
    `CREATE INDEX IF NOT EXISTS records_userid_idx ON records (userId);`,
    `CREATE INDEX IF NOT EXISTS records_teamid_idx ON records (teamId);`,
    `CREATE INDEX IF NOT EXISTS users_teamid_idx ON users (teamId);`,
    `CREATE INDEX IF NOT EXISTS teamstats_teamid_idx ON teamStats (teamId);`
  ];

  for (const indexSql of indexStatements) {
    try {
      await executeDbQuery(pool, indexSql);
    } catch (error) {
      console.warn(`Failed to create index: ${error.message}`);
    }
  }
}

async function ensureForeignKeyConstraints(pool) {
  const fkQueries = [
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_team_fk') THEN
        ALTER TABLE users ADD CONSTRAINT users_team_fk FOREIGN KEY (teamId) REFERENCES teams(teamId) ON DELETE CASCADE;
      END IF;
    END $$;`,
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'records_user_fk') THEN
        ALTER TABLE records ADD CONSTRAINT records_user_fk FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE;
      END IF;
    END $$;`,
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'records_team_fk') THEN
        ALTER TABLE records ADD CONSTRAINT records_team_fk FOREIGN KEY (teamId) REFERENCES teams(teamId) ON DELETE CASCADE;
      END IF;
    END $$;`,
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teamstats_team_fk') THEN
        ALTER TABLE teamStats ADD CONSTRAINT teamstats_team_fk FOREIGN KEY (teamId) REFERENCES teams(teamId) ON DELETE CASCADE;
      END IF;
    END $$;`
  ];

  for (const sql of fkQueries) {
    try {
      await executeDbQuery(pool, sql);
    } catch (error) {
      console.warn(`Failed to ensure foreign key constraint: ${error.message}`);
    }
  }
}

function mapCollection(collection) {
  if (collection === 'users') return 'users';
  if (collection === 'teams') return 'teams';
  if (collection === 'records') return 'records';
  if (collection === 'teamStats') return 'teamStats';
  if (collection === 'registrationSummaries') return 'registrationSummaries';
  return collection;
}

function isValidColumnName(key) {
  const validKeys = [
    'userId', 'teamId', 'recordId', 'summaryId',
    'username', 'name', 'fullName', 'customerIdNumber', 'mobileNumber', 'customerStatus',
    'totalRecords', 'approvedCount', 'pendingCount', 'rejectedCount', 'otherCount',
    'memberCount', 'lastSummaryAt', 'lastSeenSummaryAt', 'lastUpdatedAt',
    'regAgentName', 'regAgentDeviceName', 'allowEdit', 'creationDate', 'submissionDate', 'approvalDate'
  ];
  return validKeys.includes(key);
}

async function doesTableExist(client, tableName) {
  const res = await executeDbQuery(client,
    `SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = $1
    );`,
    [tableName]
  );
  return res.rows[0] && res.rows[0].exists === true;
}

function normalizeRow(collection, row) {
  if (!row) return null;
  if (collection === 'users') {
    return {
      userId: row.userid || row.userId,
      username: row.username,
      teamId: row.teamid || row.teamId,
      totalRecords: row.totalrecords || row.totalRecords || 0,
      approvedCount: row.approvedcount || row.approvedCount || 0,
      pendingCount: row.pendingcount || row.pendingCount || 0,
      rejectedCount: row.rejectedcount || row.rejectedCount || 0,
      otherCount: row.othercount || row.otherCount || 0,
      lastSeenSummaryAt: row.lastseensummaryat || row.lastSeenSummaryAt || null,
      metadata: row.metadata || null,
      createdAt: row.createdat || row.createdAt,
      updatedAt: row.updatedat || row.updatedAt
    };
  }
  if (collection === 'teams') {
    return {
      teamId: row.teamid || row.teamId,
      name: row.name,
      totalRecords: row.totalrecords || row.totalRecords || 0,
      approvedCount: row.approvedcount || row.approvedCount || 0,
      pendingCount: row.pendingcount || row.pendingCount || 0,
      rejectedCount: row.rejectedcount || row.rejectedCount || 0,
      otherCount: row.othercount || row.otherCount || 0,
      memberCount: row.membercount || row.memberCount || 0,
      lastSummaryAt: row.lastsummaryat || row.lastSummaryAt || null,
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
      fullName: row.fullname || row.fullName || null,
      customerIdNumber: row.customeridnumber || row.customerIdNumber || null,
      mobileNumber: row.mobilenumber || row.mobileNumber || null,
      creationDate: row.creationdate || row.creationDate || null,
      submissionDate: row.submissiondate || row.submissionDate || null,
      approvalDate: row.approvaldate || row.approvalDate || null,
      regAgentName: row.regagentname || row.regAgentName || null,
      customerStatus: row.customerstatus || row.customerStatus || null,
      regAgentDeviceName: row.regagentdevicename || row.regAgentDeviceName || null,
      allowEdit: row.allowedit || row.allowEdit || null,
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
      summaryId: row.summaryid || row.summaryId,
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