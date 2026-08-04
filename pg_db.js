const { Pool } = require('pg');

async function createPgDatabase(connectionString) {
  const pool = new Pool({ connectionString });

  console.error('[PG DB] connecting to postgres and initializing schema');
  await pool.query('CREATE SCHEMA IF NOT EXISTS public');
  await pool.query('SET search_path TO public');
  await cleanUpLegacyTables(pool);
  await ensureCurrentSchema(pool);

  try {
    await pool.query('SELECT 1 FROM users LIMIT 1');
    await pool.query('SELECT 1 FROM teams LIMIT 1');
  } catch (verifyError) {
    console.error('[PG DB] schema verification failed', { message: verifyError.message, code: verifyError.code, detail: verifyError.detail });
    throw verifyError;
  }

  console.error('[PG DB] postgres schema initialized successfully');

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
        const q = `INSERT INTO users (userId, username, teamId, totalRecords, approvedCount, pendingCount, rejectedCount, otherCount, lastSeenSummaryAt, metadata, createdAt, updatedAt)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),now())
          ON CONFLICT (userId) DO UPDATE SET username = EXCLUDED.username, teamId = EXCLUDED.teamId, totalRecords = EXCLUDED.totalRecords, approvedCount = EXCLUDED.approvedCount, pendingCount = EXCLUDED.pendingCount, rejectedCount = EXCLUDED.rejectedCount, otherCount = EXCLUDED.otherCount, lastSeenSummaryAt = EXCLUDED.lastSeenSummaryAt, metadata = EXCLUDED.metadata, updatedAt = now()
          RETURNING *`;
        const res = await pool.query(q, [
          String(value),
          item.username || null,
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
        const res = await pool.query(q, [
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
        const q = `INSERT INTO records (recordId, userId, teamId, fullName, customerIdNumber, mobileNumber, creationDate, submissionDate, approvalDate, regAgentName, customerStatus, regAgentDeviceName, allowEdit, payload, createdAt, updatedAt)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now(),now())
          ON CONFLICT (recordId) DO UPDATE SET userId = EXCLUDED.userId, teamId = EXCLUDED.teamId, fullName = EXCLUDED.fullName, customerIdNumber = EXCLUDED.customerIdNumber, mobileNumber = EXCLUDED.mobileNumber, creationDate = EXCLUDED.creationDate, submissionDate = EXCLUDED.submissionDate, approvalDate = EXCLUDED.approvalDate, regAgentName = EXCLUDED.regAgentName, customerStatus = EXCLUDED.customerStatus, regAgentDeviceName = EXCLUDED.regAgentDeviceName, allowEdit = EXCLUDED.allowEdit, payload = EXCLUDED.payload, updatedAt = now()
          RETURNING *`;
        const res = await pool.query(q, [
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
          item.allowEdit != null ? String(item.allowEdit) : null,
          item.payload ? JSON.stringify(item.payload) : null
        ]);
        return normalizeRow('records', res.rows[0]);
      }

      if (collection === 'teamStats') {
        const q = `INSERT INTO teamStats (teamId, stats, lastUpdatedAt)
          VALUES ($1,$2,$3)
          ON CONFLICT (teamId) DO UPDATE SET stats = EXCLUDED.stats, lastUpdatedAt = EXCLUDED.lastUpdatedAt
          RETURNING *`;
        const res = await pool.query(q, [String(value), item.stats ? JSON.stringify(item.stats) : null, item.lastUpdatedAt || new Date().toISOString()]);
        return normalizeRow('teamStats', res.rows[0]);
      }

      if (collection === 'registrationSummaries') {
        const q = `INSERT INTO registrationSummaries (summaryId, generatedAt, totalRecords, agents, payload, createdAt, updatedAt)
            VALUES ($1,$2,$3,$4,$5,now(),now())
            ON CONFLICT (summaryId) DO UPDATE SET generatedAt = EXCLUDED.generatedAt, totalRecords = EXCLUDED.totalRecords, agents = EXCLUDED.agents, payload = EXCLUDED.payload, updatedAt = now()
            RETURNING *`;
          const res = await pool.query(q, [String(value), item.generatedAt || null, item.totalRecords || null, item.agents ? JSON.stringify(item.agents) : null, item.payload ? JSON.stringify(item.payload) : null]);
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

async function cleanUpLegacyTables(pool) {
  const legacyTables = ['"user"', 'team', 'records', 'team_stats', 'registration_summary', 'user_stats', 'record', 'registrations'];
  for (const table of legacyTables) {
    try {
      await pool.query(`DROP TABLE IF EXISTS ${table}`);
    } catch (error) {
      console.warn(`Failed to drop legacy table ${table}:`, error.message);
    }
  }
}

async function ensureCurrentSchema(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS public.teams (
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

  await pool.query(`CREATE TABLE IF NOT EXISTS public.users (
      userId text PRIMARY KEY,
      username text,
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
      CONSTRAINT users_team_fk FOREIGN KEY (teamId) REFERENCES public.teams(teamId) ON DELETE CASCADE
    );
  `);

  await pool.query(`CREATE TABLE IF NOT EXISTS public.records (
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
      payload jsonb,
      createdAt timestamptz DEFAULT now(),
      updatedAt timestamptz DEFAULT now(),
      CONSTRAINT records_user_fk FOREIGN KEY (userId) REFERENCES public.users(userId) ON DELETE CASCADE,
      CONSTRAINT records_team_fk FOREIGN KEY (teamId) REFERENCES public.teams(teamId) ON DELETE CASCADE
    );
  `);

  await pool.query(`CREATE TABLE IF NOT EXISTS public.teamStats (
      teamId text PRIMARY KEY,
      stats jsonb,
      lastUpdatedAt timestamptz DEFAULT now(),
      CONSTRAINT teamstats_team_fk FOREIGN KEY (teamId) REFERENCES public.teams(teamId) ON DELETE CASCADE
    );
  `);

  await pool.query(`CREATE TABLE IF NOT EXISTS public.registrationSummaries (
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
    await pool.query(`ALTER TABLE registrationSummaries ADD COLUMN IF NOT EXISTS summaryId text;`);
    // populate legacy rows with a stable id (use generatedAt text when present)
    await pool.query(`UPDATE registrationSummaries SET summaryId = COALESCE(summaryId, to_char(generatedAt, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) WHERE summaryId IS NULL;`);
    // create a unique index to allow ON CONFLICT (summaryId)
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS registrationsummaries_summaryid_idx ON registrationSummaries (summaryId);`);
  } catch (mErr) {
    console.warn('Failed to migrate registrationSummaries schema:', mErr.message || mErr);
  }

  // Migration: ensure users and teams have explicit record counters and summary timestamps
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS totalRecords integer DEFAULT 0;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS approvedCount integer DEFAULT 0;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS pendingCount integer DEFAULT 0;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS rejectedCount integer DEFAULT 0;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS otherCount integer DEFAULT 0;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS lastSeenSummaryAt timestamptz;`);

    await pool.query(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS totalRecords integer DEFAULT 0;`);
    await pool.query(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS approvedCount integer DEFAULT 0;`);
    await pool.query(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS pendingCount integer DEFAULT 0;`);
    await pool.query(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS rejectedCount integer DEFAULT 0;`);
    await pool.query(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS otherCount integer DEFAULT 0;`);
    await pool.query(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS memberCount integer DEFAULT 0;`);
    await pool.query(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS lastSummaryAt timestamptz;`);

    await pool.query(`ALTER TABLE records ADD COLUMN IF NOT EXISTS fullName text;`);
    await pool.query(`ALTER TABLE records ADD COLUMN IF NOT EXISTS customerIdNumber text;`);
    await pool.query(`ALTER TABLE records ADD COLUMN IF NOT EXISTS mobileNumber text;`);
    await pool.query(`ALTER TABLE records ADD COLUMN IF NOT EXISTS creationDate text;`);
    await pool.query(`ALTER TABLE records ADD COLUMN IF NOT EXISTS submissionDate text;`);
    await pool.query(`ALTER TABLE records ADD COLUMN IF NOT EXISTS approvalDate text;`);
    await pool.query(`ALTER TABLE records ADD COLUMN IF NOT EXISTS regAgentName text;`);
    await pool.query(`ALTER TABLE records ADD COLUMN IF NOT EXISTS customerStatus text;`);
    await pool.query(`ALTER TABLE records ADD COLUMN IF NOT EXISTS regAgentDeviceName text;`);
    await pool.query(`ALTER TABLE records ADD COLUMN IF NOT EXISTS allowEdit text;`);
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
      await pool.query(indexSql);
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
      await pool.query(sql);
    } catch (error) {
      console.warn(`Failed to ensure foreign key constraint: ${error.message}`);
    }
  }
}

function mapCollection(collection) {
  if (collection === 'users') return 'public.users';
  if (collection === 'teams') return 'public.teams';
  if (collection === 'records') return 'public.records';
  if (collection === 'teamStats') return 'public.teamStats';
  if (collection === 'registrationSummaries') return 'public.registrationSummaries';
  return collection;
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
