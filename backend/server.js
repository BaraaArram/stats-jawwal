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

function findItem(collection, key, value) {
  return db.data[collection].find((item) => item[key] === value) || null;
}

function upsertItem(collection, key, value, item) {
  const existingIndex = db.data[collection].findIndex((entry) => entry[key] === value);
  if (existingIndex !== -1) {
    db.data[collection][existingIndex] = {
      ...db.data[collection][existingIndex],
      ...item,
      updatedAt: nowIso()
    };
  } else {
    db.data[collection].push({
      ...item,
      [key]: value,
      createdAt: nowIso(),
      updatedAt: nowIso()
    });
  }
  return db.data[collection].find((entry) => entry[key] === value);
}

function filterItems(collection, key, value) {
  return db.data[collection].filter((item) => item[key] === value);
}

function ensureDb() {
  if (!db) {
    throw new Error('Database is not initialized');
  }
}

app.get('/users/:userId', (req, res) => {
  ensureDb();
  const user = findItem('users', 'userId', req.params.userId);
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

  const user = upsertItem('users', 'userId', String(userId), {
    username: username || null,
    teamId: teamId || null,
    metadata: metadata || null
  });

  await db.write();
  res.json({ user });
});

app.get('/teams/:teamId', (req, res) => {
  ensureDb();
  const team = findItem('teams', 'teamId', req.params.teamId);
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

  const team = upsertItem('teams', 'teamId', String(teamId), {
    name: name || null,
    metadata: metadata || null
  });

  await db.write();
  res.json({ team });
});

app.get('/records/:recordId', (req, res) => {
  ensureDb();
  const record = findItem('records', 'recordId', req.params.recordId);
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

  const record = upsertItem('records', 'recordId', String(recordId), {
    userId: userId || null,
    teamId: teamId || null,
    payload: payload || null
  });

  await db.write();
  res.json({ record });
});

app.get('/teams/:teamId/records', (req, res) => {
  ensureDb();
  const records = filterItems('records', 'teamId', req.params.teamId);
  res.json({ teamId: req.params.teamId, records });
});

app.get('/users/:userId/records', (req, res) => {
  ensureDb();
  const records = filterItems('records', 'userId', req.params.userId);
  res.json({ userId: req.params.userId, records });
});

app.get('/team-stats/:teamId', (req, res) => {
  ensureDb();
  const stats = findItem('teamStats', 'teamId', req.params.teamId);
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

  const teamStat = upsertItem('teamStats', 'teamId', String(teamId), {
    stats: stats || null
  });

  await db.write();
  res.json({ stats: teamStat });
});

app.get('/user-team/:userId', (req, res) => {
  ensureDb();
  const user = findItem('users', 'userId', req.params.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (!user.teamId) {
    return res.status(400).json({ error: 'User has no teamId' });
  }

  const team = findItem('teams', 'teamId', user.teamId);
  const teamStats = findItem('teamStats', 'teamId', user.teamId);
  res.json({ user, team: team || null, teamStats: teamStats || null });
});

app.post('/cache/refresh', async (req, res) => {
  ensureDb();
  const { user, team, stats } = req.body;
  const result = {};

  if (user && user.userId) {
    result.user = upsertItem('users', 'userId', String(user.userId), {
      username: user.username || null,
      teamId: user.teamId || null,
      metadata: user.metadata || null
    });
  }

  if (team && team.teamId) {
    result.team = upsertItem('teams', 'teamId', String(team.teamId), {
      name: team.name || null,
      metadata: team.metadata || null
    });
  }

  if (stats && stats.teamId) {
    result.teamStats = upsertItem('teamStats', 'teamId', String(stats.teamId), {
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
