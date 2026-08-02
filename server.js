const express = require('express');
const cors = require('cors');
const path = require('path');
const { createDatabase } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let db = null;

async function initializeDatabase() {
  db = await createDatabase(DB_PATH);
}

function nowIso() {
  return new Date().toISOString();
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: nowIso() });
});

async function findItem(collection, key, value) {
  ensureDb();
  if (typeof db.findItem === 'function') {
    return await db.findItem(collection, key, value);
  }
  // fallback (shouldn't happen)
  return null;
}

async function upsertItem(collection, key, value, item) {
  ensureDb();
  if (typeof db.upsertItem === 'function') {
    return await db.upsertItem(collection, key, value, item);
  }
  return null;
}

async function filterItems(collection, key, value) {
  ensureDb();
  if (typeof db.filterItems === 'function') {
    return await db.filterItems(collection, key, value);
  }
  return [];
}

function ensureDb() {
  if (!db) {
    throw new Error('Database is not initialized');
  }
}

app.get('/users/:userId', async (req, res) => {
  ensureDb();
  const user = await findItem('users', 'userId', req.params.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user });
});

app.post('/users', async (req, res) => {
  ensureDb();
  const { userId, username, teamId, metadata } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const user = await upsertItem('users', 'userId', String(userId), {
    username: username || null,
    teamId: teamId || null,
    metadata: metadata || null
  });

  await db.write();
  res.json({ user });
});

app.get('/teams/:teamId', async (req, res) => {
  ensureDb();
  const team = await findItem('teams', 'teamId', req.params.teamId);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }
  res.json({ team });
});

app.post('/teams', async (req, res) => {
  ensureDb();
  const { teamId, name, metadata } = req.body;
  if (!teamId) {
    return res.status(400).json({ error: 'teamId is required' });
  }

  const team = await upsertItem('teams', 'teamId', String(teamId), {
    name: name || null,
    metadata: metadata || null
  });

  await db.write();
  res.json({ team });
});

app.get('/records/:recordId', async (req, res) => {
  ensureDb();
  const record = await findItem('records', 'recordId', req.params.recordId);
  if (!record) {
    return res.status(404).json({ error: 'Record not found' });
  }
  res.json({ record });
});

app.post('/records', async (req, res) => {
  ensureDb();
  const { recordId, userId, teamId, payload } = req.body;
  if (!recordId) {
    return res.status(400).json({ error: 'recordId is required' });
  }

  const record = await upsertItem('records', 'recordId', String(recordId), {
    userId: userId || null,
    teamId: teamId || null,
    payload: payload || null
  });

  await db.write();
  res.json({ record });
});

app.get('/teams/:teamId/records', async (req, res) => {
  ensureDb();
  const records = await filterItems('records', 'teamId', req.params.teamId);
  res.json({ teamId: req.params.teamId, records });
});

app.get('/users/:userId/records', async (req, res) => {
  ensureDb();
  const records = await filterItems('records', 'userId', req.params.userId);
  res.json({ userId: req.params.userId, records });
});

app.get('/team-stats/:teamId', async (req, res) => {
  ensureDb();
  const stats = await findItem('teamStats', 'teamId', req.params.teamId);
  if (!stats) {
    return res.status(404).json({ error: 'Team stats not found' });
  }
  res.json({ stats });
});

app.post('/team-stats', async (req, res) => {
  ensureDb();
  const { teamId, stats } = req.body;
  if (!teamId) {
    return res.status(400).json({ error: 'teamId is required' });
  }

  const teamStat = await upsertItem('teamStats', 'teamId', String(teamId), {
    stats: stats || null
  });

  await db.write();
  res.json({ stats: teamStat });
});

app.get('/user-team/:userId', async (req, res) => {
  ensureDb();
  const user = await findItem('users', 'userId', req.params.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (!user.teamId) {
    return res.status(400).json({ error: 'User has no teamId' });
  }

  const team = await findItem('teams', 'teamId', user.teamId);
  const teamStats = await findItem('teamStats', 'teamId', user.teamId);
  res.json({ user, team: team || null, teamStats: teamStats || null });
});

app.post('/cache/refresh', async (req, res) => {
  ensureDb();
  const { user, team, stats } = req.body;
  const result = {};

  if (user && user.userId) {
    result.user = await upsertItem('users', 'userId', String(user.userId), {
      username: user.username || null,
      teamId: user.teamId || null,
      metadata: user.metadata || null
    });
  }

  if (team && team.teamId) {
    result.team = await upsertItem('teams', 'teamId', String(team.teamId), {
      name: team.name || null,
      metadata: team.metadata || null
    });
  }

  if (stats && stats.teamId) {
    result.teamStats = await upsertItem('teamStats', 'teamId', String(stats.teamId), {
      stats: stats.stats || null,
      lastUpdatedAt: stats.lastUpdatedAt || nowIso()
    });
  }

  await db.write();
  res.json(result);
});

initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Jawwal Pay cache API listening on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});
