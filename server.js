const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const { createDatabase } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.json');

if (typeof console !== 'undefined') {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.warn = () => {};
  console.trace = () => {};
}
app.use(cors({ origin: true, credentials: true }));
app.options('*', cors({ origin: true, credentials: true }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  // Allow Accept header for clients that send it
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
app.use(express.json({ limit: '1mb' }));
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

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

const COLLECTION_KEY_MAP = {
  users: 'userId',
  teams: 'teamId',
  records: 'recordId',
  teamStats: 'teamId',
  registrationSummaries: 'summaryId'
};

const VALID_COLLECTIONS = Object.keys(COLLECTION_KEY_MAP);

function getCollectionKey(collection) {
  return COLLECTION_KEY_MAP[collection] || null;
}

function sanitizePayload(collection, payload) {
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  const normalized = { ...payload };
  delete normalized.id;
  delete normalized._id;

  if (collection === 'records' && normalized.payload && typeof normalized.payload === 'string') {
    try {
      normalized.payload = JSON.parse(normalized.payload);
    } catch (error) {
      normalized.payload = normalized.payload;
    }
  }

  return normalized;
}

app.get('/admin/api/collections', async (req, res) => {
  try {
    const collections = {};
    for (const collection of VALID_COLLECTIONS) {
      let items = await listCollection(collection);
      if (collection === 'users') {
        items = await Promise.all((items || []).map(attachComputedUserStats));
      } else if (collection === 'teams') {
        items = await Promise.all((items || []).map(attachComputedTeamStats));
      }
      collections[collection] = { count: Array.isArray(items) ? items.length : 0, items };
    }
    res.json({ collections });
  } catch (error) {
    console.error('Failed to list admin collections:', error);
    res.status(500).json({ error: 'Failed to load collections' });
  }
});

app.get('/admin/api/:collection', async (req, res) => {
  try {
    const collection = req.params.collection;
    if (!VALID_COLLECTIONS.includes(collection)) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    let items = await listCollection(collection);
    if (collection === 'users') {
      items = await Promise.all((items || []).map(attachComputedUserStats));
    } else if (collection === 'teams') {
      items = await Promise.all((items || []).map(attachComputedTeamStats));
    }
    res.json({ collection, items });
  } catch (error) {
    console.error('Failed to fetch admin collection:', error);
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
});

app.post('/admin/api/:collection', async (req, res) => {
  try {
    const { collection } = req.params;
    const key = getCollectionKey(collection);
    if (!VALID_COLLECTIONS.includes(collection) || !key) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const payload = sanitizePayload(collection, req.body);
    const idValue = String(req.body[key] || req.body.id || `${collection}-${Date.now()}`);
    const item = await upsertItem(collection, key, idValue, payload);
    res.json({ collection, item });
  } catch (error) {
    console.error('Failed to create admin item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

app.put('/admin/api/:collection/:id', async (req, res) => {
  try {
    const { collection, id } = req.params;
    const key = getCollectionKey(collection);
    if (!VALID_COLLECTIONS.includes(collection) || !key) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const payload = sanitizePayload(collection, req.body);
    const item = await upsertItem(collection, key, String(id), payload);
    res.json({ collection, item });
  } catch (error) {
    console.error('Failed to update admin item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

app.delete('/admin/api/:collection/:id', async (req, res) => {
  try {
    const { collection, id } = req.params;
    const key = getCollectionKey(collection);
    if (!VALID_COLLECTIONS.includes(collection) || !key) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    if (collection === 'teams') {
      const deletedTeam = await deleteCollectionItem('teams', 'teamId', String(id));
      if (!deletedTeam) {
        return res.status(404).json({ error: 'Team not found' });
      }
      return res.json({ collection, deletedTeam });
    }

    if (collection === 'users') {
      const deletedUser = await deleteCollectionItem('users', 'userId', String(id));
      if (!deletedUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.json({ collection, deletedUser });
    }

    const removed = await deleteCollectionItem(collection, key, String(id));
    if (!removed) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ collection, removed });
  } catch (error) {
    console.error('Failed to delete admin item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
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

async function listCollection(collection) {
  ensureDb();
  if (typeof db.listCollection === 'function') {
    return await db.listCollection(collection);
  }
  return [];
}

async function deleteCollectionItem(collection, key, value) {
  ensureDb();
  if (typeof db.deleteItem === 'function') {
    return await db.deleteItem(collection, key, value);
  }
  return null;
}

async function deleteRecordsByUser(userId) {
  if (!userId) return [];
  const records = await filterItems('records', 'userId', userId);
  const deletedRecords = [];

  for (const record of records) {
    if (!record || !record.recordId) continue;
    const removedRecord = await deleteCollectionItem('records', 'recordId', String(record.recordId));
    if (removedRecord) {
      deletedRecords.push(removedRecord);
    }
  }

  return deletedRecords;
}

async function deleteUsersByTeam(teamId) {
  if (!teamId) return { deletedUsers: [], deletedRecords: [] };
  const users = await filterItems('users', 'teamId', teamId);
  const deletedUsers = [];
  const deletedRecords = [];

  for (const user of users) {
    if (!user || !user.userId) continue;
    const removedUser = await deleteCollectionItem('users', 'userId', String(user.userId));
    if (removedUser) {
      deletedUsers.push(removedUser);
      const records = await deleteRecordsByUser(String(user.userId));
      deletedRecords.push(...records);
    }
  }

  return { deletedUsers, deletedRecords };
}

async function deleteTeamAndRelatedData(teamId) {
  if (!teamId) return { deletedTeam: null, deletedUsers: [], deletedRecords: [], deletedTeamStats: null };

  const deletedTeam = await deleteCollectionItem('teams', 'teamId', String(teamId));
  const deletedTeamStats = await deleteCollectionItem('teamStats', 'teamId', String(teamId));
  const { deletedUsers, deletedRecords } = await deleteUsersByTeam(teamId);

  return { deletedTeam, deletedUsers, deletedRecords, deletedTeamStats };
}

function normalizeRegistrationSummaryRow(row, index) {
  if (row == null) return null;
  if (Array.isArray(row)) {
    return {
      id: String(row[2] ?? row[1] ?? `row-${index}`),
      fullName: String(row[0] ?? '').trim(),
      customerIdNumber: String(row[1] ?? '').trim(),
      mobileNumber: String(row[2] ?? '').trim(),
      creationDate: row[3] == null ? null : String(row[3]).trim(),
      submissionDate: row[4] == null ? null : String(row[4]).trim(),
      approvalDate: row[5] == null ? null : String(row[5]).trim(),
      regAgentName: String(row[6] ?? '').trim(),
      customerStatus: String(row[7] ?? '').trim(),
      regAgentDeviceName: String(row[8] ?? '').trim(),
      allowEdit: String(row[9] ?? 'false').trim()
    };
  }

  if (typeof row === 'object') {
    return {
      id: row.id != null ? String(row.id) : null,
      fullName: String(row.fullName ?? row.name ?? '').trim(),
      customerIdNumber: String(row.customerIdNumber ?? row.customer_id ?? row.customerId ?? '').trim(),
      mobileNumber: String(row.mobileNumber ?? row.phone ?? row.mobile ?? '').trim(),
      creationDate: row.creationDate ?? row.startDate ?? null,
      submissionDate: row.submissionDate ?? row.submittedAt ?? null,
      approvalDate: row.approvalDate ?? row.approvedAt ?? null,
      regAgentName: String(row.regAgentName ?? row.agentRegion ?? row.agentName ?? row.agent ?? '').trim(),
      customerStatus: String(row.customerStatus ?? row.status ?? '').trim(),
      regAgentDeviceName: String(row.regAgentDeviceName ?? row.agentDeviceName ?? row.agentName ?? '').trim(),
      allowEdit: row.allowEdit != null ? String(row.allowEdit) : 'false'
    };
  }

  return null;
}

function extractAgentFromRow(row = {}) {
  const username = String(row.regAgentDeviceName || row.agentDeviceName || row.agentName || row.regAgentName || row.agent || row.username || '').trim();
  const teamId = String(row.regAgentName || row.agentRegion || row.agent || '').trim() || null;
  return { username, teamId };
}

function getSummaryRows(summary) {
  if (!summary || typeof summary !== 'object') return [];
  if (Array.isArray(summary.data) && summary.data.length) return summary.data;
  if (Array.isArray(summary.data2) && summary.data2.length) return summary.data2;
  if (summary.payload && typeof summary.payload === 'object') {
    if (Array.isArray(summary.payload.data) && summary.payload.data.length) return summary.payload.data;
    if (Array.isArray(summary.payload.data2) && summary.payload.data2.length) return summary.payload.data2;
  }
  return [];
}

function normalizeCounts(payload) {
  if (!payload || typeof payload !== 'object') return { total: 0, approved: 0, pending: 0, rejected: 0, other: 0 };
  const agent = payload.agent && typeof payload.agent === 'object' ? payload.agent : payload;
  const byStatus = agent.byStatus && typeof agent.byStatus === 'object' ? agent.byStatus : {};
  let approved = 0;
  let pending = 0;
  let rejected = 0;
  let other = 0;
  let total = 0;

  for (const [key, value] of Object.entries(byStatus)) {
    const count = Number(value || 0) || 0;
    total += count;
    const normalized = String(key || '').toLowerCase();
    if (/موافقة|approved|تمت/.test(normalized)) approved += count;
    else if (/قيد|pending|review|انتظار/.test(normalized)) pending += count;
    else if (/مرفوض|rejected|رفض/.test(normalized)) rejected += count;
    else other += count;
  }

  if (!total && Number(agent.totalCount || agent.totalRecords || 0)) {
    total = Number(agent.totalCount || agent.totalRecords || 0);
  }

  return { total, approved, pending, rejected, other };
}

function aggregateRecordStats(records = []) {
  const result = { totalRecords: 0, approvedCount: 0, pendingCount: 0, rejectedCount: 0, otherCount: 0, recordCount: 0 };
  if (!Array.isArray(records)) return result;

  for (const record of records) {
    const payload = record && record.payload ? record.payload : {};
    const counts = normalizeCounts(payload);
    result.totalRecords += counts.total;
    result.approvedCount += counts.approved;
    result.pendingCount += counts.pending;
    result.rejectedCount += counts.rejected;
    result.otherCount += counts.other;
    result.recordCount += 1;
  }

  return result;
}

async function attachComputedUserStats(user) {
  if (!user || !user.userId) return user;
  const records = await filterItems('records', 'userId', user.userId);
  const counts = aggregateRecordStats(records);
  return Object.assign({}, user, {
    totalRecords: counts.totalRecords,
    approvedCount: counts.approvedCount,
    pendingCount: counts.pendingCount,
    rejectedCount: counts.rejectedCount,
    otherCount: counts.otherCount,
    recordCount: counts.recordCount,
    lastSeenSummaryAt: user.lastSeenSummaryAt || null
  });
}

async function attachComputedTeamStats(team) {
  if (!team || !team.teamId) return team;
  const records = await filterItems('records', 'teamId', team.teamId);
  const teamUsers = await filterItems('users', 'teamId', team.teamId);
  const counts = aggregateRecordStats(records);
  return Object.assign({}, team, {
    totalRecords: counts.totalRecords,
    approvedCount: counts.approvedCount,
    pendingCount: counts.pendingCount,
    rejectedCount: counts.rejectedCount,
    otherCount: counts.otherCount,
    memberCount: Array.isArray(teamUsers) ? teamUsers.length : 0,
    lastSummaryAt: team.lastSummaryAt || null
  });
}

async function ensureTeamExists(teamId) {
  if (!teamId) return null;
  const existingTeam = await findItem('teams', 'teamId', String(teamId));
  if (existingTeam) return existingTeam;
  return await upsertItem('teams', 'teamId', String(teamId), {
    name: null,
    totalRecords: 0,
    approvedCount: 0,
    pendingCount: 0,
    rejectedCount: 0,
    otherCount: 0,
    memberCount: 0,
    lastSummaryAt: null
  });
}

async function ensureUserExists(userId, teamId = null) {
  if (!userId) return null;
  const existingUser = await findItem('users', 'userId', String(userId));
  if (existingUser) return existingUser;
  if (teamId) {
    await ensureTeamExists(teamId);
  }
  return await upsertItem('users', 'userId', String(userId), {
    username: null,
    teamId: teamId || null,
    totalRecords: 0,
    approvedCount: 0,
    pendingCount: 0,
    rejectedCount: 0,
    otherCount: 0,
    lastSeenSummaryAt: null
  });
}

function buildTeamNameFromUsers(agents = []) {
  try {
    const names = Array.isArray(agents) ? agents.map(a => String(a?.username || a?.userId || a?.name || '').trim()).filter(Boolean) : [];
    if (!names.length) return null;
    // extract initials for each user (first letter of up to two name parts)
    const initials = names.slice(0, 6).map(name => {
      const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
      return parts.map(p => p[0] ? p[0].toUpperCase() : '').join('');
    }).filter(Boolean);

    if (initials.length === 1) return names[0];
    if (initials.length === 2) return `${initials[0]} & ${initials[1]}`;
    // for 3+ users, join first three initials with a creative separator
    return initials.slice(0, 3).join('-');
  } catch (e) {
    return null;
  }
}

async function getOrCreateTeamForKey(teamKey, agents = []) {
  // teamKey: original team name or identifier from summary (may be 'unknown')
  const canonical = String(teamKey || '').trim().toLowerCase();
  // try to find existing team by metadata.originalNameKey
  if (canonical) {
    const allTeams = await listCollection('teams');
    for (const t of Array.isArray(allTeams) ? allTeams : []) {
      const meta = t && t.metadata ? t.metadata : {};
      if (meta && meta.originalNameKey === canonical) return t;
    }
  }

  // not found -> create new team with UUID
  const newTeamId = crypto.randomUUID();
  const name = buildTeamNameFromUsers(agents) || (canonical ? canonical : `Team ${String(newTeamId).slice(0, 6)}`);
  const team = await upsertItem('teams', 'teamId', String(newTeamId), {
    name: name || null,
    metadata: { originalName: teamKey || null, originalNameKey: canonical || null, createdFrom: 'registration-summary' }
  });

  return team;
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

app.delete('/users/:userId', async (req, res) => {
  ensureDb();
  const { userId } = req.params;
  const user = await findItem('users', 'userId', userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const deletedRecords = await deleteRecordsByUser(userId);
  const deletedUser = await deleteCollectionItem('users', 'userId', userId);
  return res.json({ deletedUser, deletedRecords });
});

app.post('/users', async (req, res) => {
  ensureDb();
  const { userId, username, teamId, totalRecords, approvedCount, pendingCount, rejectedCount, otherCount, lastSeenSummaryAt, metadata } = req.body;
  const resolvedUserId = String(userId || crypto.randomUUID());

  const user = await upsertItem('users', 'userId', resolvedUserId, {
    username: username || null,
    teamId: teamId || null,
    totalRecords: Number(totalRecords || 0),
    approvedCount: Number(approvedCount || 0),
    pendingCount: Number(pendingCount || 0),
    rejectedCount: Number(rejectedCount || 0),
    otherCount: Number(otherCount || 0),
    lastSeenSummaryAt: lastSeenSummaryAt || null,
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

app.delete('/teams/:teamId', async (req, res) => {
  ensureDb();
  const { teamId } = req.params;
  const result = await deleteTeamAndRelatedData(teamId);
  if (!result.deletedTeam) {
    return res.status(404).json({ error: 'Team not found' });
  }
  res.json({
    deletedTeam: result.deletedTeam,
    deletedTeamStats: result.deletedTeamStats,
    deletedUsers: result.deletedUsers,
    deletedRecords: result.deletedRecords
  });
});

app.post('/teams', async (req, res) => {
  ensureDb();
  const { teamId, name, totalRecords, approvedCount, pendingCount, rejectedCount, otherCount, memberCount, lastSummaryAt, metadata } = req.body;
  const resolvedTeamId = String(teamId || crypto.randomUUID());

  const team = await upsertItem('teams', 'teamId', resolvedTeamId, {
    name: name || null,
    totalRecords: Number(totalRecords || 0),
    approvedCount: Number(approvedCount || 0),
    pendingCount: Number(pendingCount || 0),
    rejectedCount: Number(rejectedCount || 0),
    otherCount: Number(otherCount || 0),
    memberCount: Number(memberCount || 0),
    lastSummaryAt: lastSummaryAt || null,
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
  const {
    recordId,
    userId,
    teamId,
    fullName,
    customerIdNumber,
    mobileNumber,
    creationDate,
    submissionDate,
    approvalDate,
    regAgentName,
    customerStatus,
    regAgentDeviceName,
    allowEdit,
    payload
  } = req.body;
  const resolvedRecordId = String(recordId || crypto.randomUUID());

  const record = await upsertItem('records', 'recordId', resolvedRecordId, {
    userId: userId || null,
    teamId: teamId || null,
    fullName: fullName || null,
    customerIdNumber: customerIdNumber || null,
    mobileNumber: mobileNumber || null,
    creationDate: creationDate || null,
    submissionDate: submissionDate || null,
    approvalDate: approvalDate || null,
    regAgentName: regAgentName || null,
    customerStatus: customerStatus || null,
    regAgentDeviceName: regAgentDeviceName || null,
    allowEdit: allowEdit != null ? String(allowEdit) : null,
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

app.post('/api/registration-summary', async (req, res) => {
  ensureDb();
  // Log incoming summary requests for debugging (use console.error so logs survive suppression)
  try {
    const preview = req.body ? (typeof req.body === 'object' ? JSON.stringify(req.body).slice(0, 2000) : String(req.body).slice(0, 2000)) : null;
    console.error('[Cache API] /api/registration-summary received', { timestamp: nowIso(), headers: req.headers, bodyPreview: preview, bodyLength: req.body ? (typeof req.body === 'object' ? JSON.stringify(req.body).length : String(req.body).length) : 0 });
  } catch (e) {
    console.error('[Cache API] failed to log incoming registration-summary request', e?.message || e);
  }
  const summary = req.body;
  if (!summary || typeof summary !== 'object') {
    return res.status(400).json({ error: 'summary payload is required' });
  }

  const generatedAt = summary.generatedAt || new Date().toISOString();
  const totalRecords = Number(summary.totalRecords ?? null);
  const ingestMeta = {
    receivedAt: nowIso(),
    sourceIp: req.headers['cf-connecting-ip'] || req.headers['true-client-ip'] || req.ip || null,
    userAgent: req.headers['user-agent'] || null,
    origin: req.headers['origin'] || null,
    contentLength: req.headers['content-length'] ? Number(req.headers['content-length']) : null
  };

  function summarizeStatusCounts(byStatus = {}) {
    const map = byStatus && typeof byStatus === 'object' ? byStatus : {};
    let approved = 0, pending = 0, rejected = 0, other = 0, total = 0;
    for (const [k, v] of Object.entries(map)) {
      const n = Number(v || 0) || 0;
      total += n;
      const key = String(k || '').toLowerCase();
      if (/موافقة|approved|تمت/.test(key)) approved += n;
      else if (/قيد|pending|review|انتظار/.test(key)) pending += n;
      else if (/مرفوض|rejected|رفض/.test(key)) rejected += n;
      else other += n;
    }
    const topStatus = Object.entries(map).sort((a,b)=>Number(b[1]||0)-Number(a[1]||0))[0];
    return { total, approved, pending, rejected, other, topStatus: topStatus ? String(topStatus[0]) : null };
  }
  // Defensive normalization: ensure agents and payload are proper objects/arrays.
  let agents = [];
  try {
    if (Array.isArray(summary.agents)) {
      agents = summary.agents;
    } else if (typeof summary.agents === 'string') {
      try { agents = JSON.parse(summary.agents); } catch { agents = []; }
      if (!Array.isArray(agents)) agents = [];
    } else {
      agents = [];
    }
  } catch (e) {
    console.error('[Cache API] failed to normalize agents', e?.message || e);
    agents = [];
  }

  // Ensure payload is a JSON object (not a double-encoded string)
  let payloadForStore = summary.payload ?? summary;
  try {
    if (typeof payloadForStore === 'string') {
      try { payloadForStore = JSON.parse(payloadForStore); } catch { /* leave as string */ }
    }
  } catch (e) {
    console.error('[Cache API] failed to normalize payload', e?.message || e);
  }

  try {
    // persist a single updatable summary entry (singleton)
    const SUMMARY_SINGLETON_ID = 'latest';
    const stored = await upsertItem('registrationSummaries', 'summaryId', SUMMARY_SINGLETON_ID, {
      summaryId: SUMMARY_SINGLETON_ID,
      generatedAt: generatedAt,
      payload: payloadForStore,
      totalRecords: Number.isNaN(totalRecords) ? null : totalRecords,
      agents,
      updatedAt: new Date().toISOString()
    });

    // Persist related entities so dashboards/admin API can show users, teams and records
    try {
      const teamStatsMap = {};
      if (Array.isArray(agents) && agents.length) {
        for (const agent of agents) {
          try {
            const username = String(agent?.username || agent?.userId || '').trim();
            const teamKey = String(agent?.team || agent?.teamId || '').trim() || '';
            if (!username) continue;

            // Find or create a team (UUID) for this teamKey, using agents list to build name when creating
            const team = await getOrCreateTeamForKey(teamKey, agents);
            const teamId = team && team.teamId ? String(team.teamId) : null;

            // Ensure user exists and update username/team association + metadata
            const existingUser = await findItem('users', 'userId', username);
            const statusSummary = summarizeStatusCounts(agent?.byStatus || {});
            const userRecord = {
              username: username || null,
              teamId: teamId || null,
              totalRecords: Number(agent?.totalCount || statusSummary.total || 0),
              approvedCount: statusSummary.approved,
              pendingCount: statusSummary.pending,
              rejectedCount: statusSummary.rejected,
              otherCount: statusSummary.other,
              lastSeenSummaryAt: generatedAt
            };

            if (!existingUser) {
              await upsertItem('users', 'userId', String(username), userRecord);
            } else {
              const merged = Object.assign({}, existingUser, userRecord);
              await upsertItem('users', 'userId', String(username), merged);
            }

            // Accumulate team stats
            if (!teamStatsMap[teamId]) teamStatsMap[teamId] = { teamId, totalRecords: 0, agents: [] };
            teamStatsMap[teamId].totalRecords += Number(agent?.totalCount || 0);
            teamStatsMap[teamId].agents.push({ username, totalCount: Number(agent?.totalCount || 0), byStatus: agent?.byStatus || {} });

          } catch (innerErr) {
            console.error('[Cache API] failed to persist agent-derived entities', innerErr?.message || innerErr, { agent });
          }
        }
      }

      const summaryRows = getSummaryRows(summary);
      if (Array.isArray(summaryRows) && summaryRows.length) {
        for (let rowIndex = 0; rowIndex < summaryRows.length; rowIndex += 1) {
          const rawRow = summaryRows[rowIndex];
          const normalizedRow = normalizeRegistrationSummaryRow(rawRow, rowIndex);
          if (!normalizedRow) continue;

          const { username, teamId } = extractAgentFromRow(normalizedRow);
          if (!username) continue;

          const status = String(normalizedRow.customerStatus || normalizedRow.status || 'unknown');
          const statusSummary = summarizeStatusCounts({ [status]: 1 });
          const recordId = String(normalizedRow.id || `${generatedAt}-${username}-${rowIndex}`);

          await upsertItem('records', 'recordId', recordId, {
            userId: username,
            teamId,
            fullName: normalizedRow.fullName || null,
            customerIdNumber: normalizedRow.customerIdNumber || null,
            mobileNumber: normalizedRow.mobileNumber || null,
            creationDate: normalizedRow.creationDate || null,
            submissionDate: normalizedRow.submissionDate || null,
            approvalDate: normalizedRow.approvalDate || null,
            regAgentName: normalizedRow.regAgentName || null,
            customerStatus: normalizedRow.customerStatus || null,
            regAgentDeviceName: normalizedRow.regAgentDeviceName || null,
            allowEdit: normalizedRow.allowEdit || 'false',
            payload: {
              summaryGeneratedAt: generatedAt,
              ingest: ingestMeta,
              row: normalizedRow,
              agent: {
                username,
                teamId,
                totalCount: 1,
                byStatus: { [status]: 1 },
                approvedCount: statusSummary.approved,
                pendingCount: statusSummary.pending,
                rejectedCount: statusSummary.rejected,
                topStatus: statusSummary.topStatus
              },
              original: rawRow
            }
          });
        }
      }

      // Persist aggregated team stats
      for (const [teamId, stats] of Object.entries(teamStatsMap)) {
        try {
          if (!teamId) continue;
          await ensureTeamExists(teamId);
          await upsertItem('teamStats', 'teamId', String(teamId), {
            stats: stats || null,
            lastUpdatedAt: nowIso()
          });
          // update team counters with aggregated values
          try {
            const team = await findItem('teams', 'teamId', String(teamId));
            const teamUpdate = Object.assign({}, team || {}, {
              name: team && team.name ? team.name : null,
              totalRecords: Number(stats.totalRecords || 0) || (team && team.totalRecords) || 0,
              approvedCount: Number(stats.agents?.reduce((s,a)=>s + (Number(a.byStatus?.['تمت الموافقة']||a.byStatus?.['approved']||0),0),0) || 0) || (team && team.approvedCount) || 0,
              pendingCount: Number(stats.agents?.reduce((s,a)=>s + (Number(a.byStatus?.['قيد المراجعة']||a.byStatus?.['pending']||0),0),0) || 0) || (team && team.pendingCount) || 0,
              rejectedCount: Number(stats.agents?.reduce((s,a)=>s + (Number(a.byStatus?.['مرفوض']||a.byStatus?.['rejected']||0),0),0) || 0) || (team && team.rejectedCount) || 0,
              memberCount: Array.isArray(stats.agents) ? stats.agents.length : (team && team.memberCount) || 0,
              lastSummaryAt: generatedAt
            });
            await upsertItem('teams', 'teamId', String(teamId), teamUpdate);
          } catch (uerr) {
            /* ignore team update errors */
          }
        } catch (tErr) {
          console.error('[Cache API] failed to persist teamStats for', teamId, tErr?.message || tErr);
        }
      }
    } catch (relatedErr) {
      console.error('[Cache API] registration-summary related persistence failed', relatedErr?.message || relatedErr);
    }

    await db.write();
    return res.json({ summary: stored });
  } catch (dbErr) {
    console.error('[Cache API] registration-summary DB upsert failed', { error: dbErr?.message || dbErr, generatedAt, totalRecords, agentsType: Array.isArray(agents) ? 'array' : typeof agents, payloadType: typeof payloadForStore, payloadPreview: (() => { try { return JSON.stringify(payloadForStore).slice(0, 2000); } catch { return String(payloadForStore).slice(0,2000); } })() });
    return res.status(500).json({ error: 'Failed to persist registration summary', details: dbErr?.message || String(dbErr) });
  }
});

app.get('/api/registration-summary', async (req, res) => {
  ensureDb();
  if (typeof db.findItem === 'function') {
    const single = await findItem('registrationSummaries', 'summaryId', 'latest');
    return res.json({ summary: single || null });
  }
  return res.status(500).json({ error: 'Registration summary not available' });
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
  const records = await filterItems('records', 'userId', req.params.userId);
  res.json({ user, team: team || null, teamStats: teamStats || null, records });
});

app.post('/cache/refresh', async (req, res) => {
  ensureDb();
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Invalid JSON body for cache refresh' });
  }

  const { user, users, team, stats, records } = req.body;
  if (!user && !users && !team && !stats && !records) {
    return res.status(400).json({ error: 'Cache refresh payload must include user, users, team, stats, or records' });
  }

  const result = {};

  try {
    if (team && team.teamId) {
      result.team = await upsertItem('teams', 'teamId', String(team.teamId), {
        name: team.name || null,
        metadata: team.metadata || null
      });
    }

    if (stats && stats.teamId) {
      await ensureTeamExists(stats.teamId);
      result.teamStats = await upsertItem('teamStats', 'teamId', String(stats.teamId), {
        stats: stats.stats || null,
        lastUpdatedAt: stats.lastUpdatedAt || nowIso()
      });
    }

    if (user && user.teamId) {
      await ensureTeamExists(user.teamId);
    }
    if (user && user.userId) {
      result.user = await upsertItem('users', 'userId', String(user.userId), {
        username: user.username || null,
        teamId: user.teamId || null,
        metadata: user.metadata || null
      });
    }

    if (Array.isArray(users) && users.length > 0) {
      result.users = [];
      for (const item of users) {
        if (!item || !item.userId) continue;
        if (item.teamId) {
          await ensureTeamExists(item.teamId);
        }
        const persistedUser = await upsertItem('users', 'userId', String(item.userId), {
          username: item.username || null,
          teamId: item.teamId || null,
          metadata: item.metadata || null
        });
        result.users.push(persistedUser);
      }
    }

    if (Array.isArray(records) && records.length > 0) {
        result.records = [];
        for (const record of records) {
          if (record?.teamId) {
            await ensureTeamExists(record.teamId);
          }
          if (record?.userId) {
            await ensureUserExists(record.userId, record.teamId || team?.teamId || user?.teamId);
          }
          const recordId = record?.recordId || `${team?.teamId || user?.userId || 'record'}-${result.records.length + 1}`;
          const persistedRecord = await upsertItem('records', 'recordId', String(recordId), {
            userId: record?.userId || null,
            teamId: record?.teamId || null,
            fullName: record?.fullName || record?.name || null,
            customerIdNumber: record?.customerIdNumber || record?.customer_id || record?.customerId || null,
            mobileNumber: record?.mobileNumber || record?.phone || record?.mobile || null,
            creationDate: record?.creationDate || record?.startDate || null,
            submissionDate: record?.submissionDate || record?.submittedAt || null,
            approvalDate: record?.approvalDate || record?.approvedAt || null,
            regAgentName: record?.regAgentName || record?.agentRegion || record?.agentName || record?.agent || null,
            customerStatus: record?.customerStatus || record?.status || null,
            regAgentDeviceName: record?.regAgentDeviceName || record?.agentDeviceName || record?.agentName || null,
            allowEdit: record?.allowEdit != null ? String(record?.allowEdit) : null,
            payload: record?.payload || record || null
          });
          result.records.push(persistedRecord);
        }
      }
    await db.write();
    return res.json(result);
  } catch (error) {
    console.error('Cache refresh failed:', error);
    return res.status(500).json({ error: 'Cache refresh failed', details: error.message });
  }
});

initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Jawwal Pay cache API listening on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});
