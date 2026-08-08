const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const { createPgDatabase } = require('./pg_db');

const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.NEON_URL;

// --- Admin auth -------------------------------------------------------
// BUG FIX: previously every /admin and /admin/api/* route (list/create/
// update/delete on ALL collections) was reachable by anyone with network
// access, with no authentication at all. We now require a shared secret.
// Fails CLOSED (denies access) if ADMIN_API_KEY isn't configured, rather
// than silently staying open like before -- set the env var to restore
// admin panel access.
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || null;

function timingSafeEqualStr(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    // still do a comparison of equal-length buffers to avoid leaking length
    // information via early return timing on the common case.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function requireAdminAuth(req, res, next) {
  if (!ADMIN_API_KEY) {
    console.error('[Server] ADMIN_API_KEY is not set - denying admin request. Set ADMIN_API_KEY to enable the admin panel/API.');
    return res.status(503).json({ error: 'Admin API is not configured. Set ADMIN_API_KEY on the server.' });
  }
  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const provided = req.headers['x-admin-key'] || bearer || (req.query && req.query.adminKey) || '';
  if (!provided || !timingSafeEqualStr(provided, ADMIN_API_KEY)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

let isReady = false;

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const wrapRouteMethod = (original) => (path, ...handlers) => {
  return original(path, ...handlers.map((handler) => (typeof handler === 'function' ? asyncHandler(handler) : handler)));
};

app.get = wrapRouteMethod(app.get.bind(app));
app.post = wrapRouteMethod(app.post.bind(app));
app.put = wrapRouteMethod(app.put.bind(app));
app.delete = wrapRouteMethod(app.delete.bind(app));
app.options = wrapRouteMethod(app.options.bind(app));

// NOTE: console.log/info/debug/warn/trace are intentionally silenced in production.
// Only console.error survives. Diagnostic logging throughout this file uses
// console.error for that reason -- do not switch it back to console.log.
if (typeof console !== 'undefined') {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.warn = () => {};
  console.trace = () => {};
}

// --- CORS ---------------------------------------------------------------
// BUG FIX: the old code registered `cors({ origin: true, credentials: true })`
// (which correctly reflects the request Origin header) AND THEN a manual
// middleware that unconditionally overwrote the header with a literal '*'.
// Browsers refuse `Access-Control-Allow-Origin: *` together with
// `Access-Control-Allow-Credentials: true`, so every credentialed
// cross-origin request was actually being rejected client-side even
// though the server "succeeded". We now rely solely on the `cors`
// middleware, which both reflects the origin and answers OPTIONS
// preflights for every route (no separate app.options('*', ...) needed --
// that wildcard pattern also breaks under Express 5 / path-to-regexp v6+).
app.use(cors({ origin: true, credentials: true }));

app.use((req, res, next) => {
  if (req.path === '/health') {
    return next();
  }
  if (!isReady) {
    return res.status(503).json({ error: 'Service unavailable', details: 'Server is still starting' });
  }
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

let db = null;

async function initializeDatabase() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required for PostgreSQL backend');
  }
  console.error('[Server] initializing PostgreSQL schema');
  db = await createPgDatabase(DATABASE_URL);
  app.locals.db = db;
  console.error('[Server] PostgreSQL schema initialization complete');
}

// Safe wrapper around db.write() -- some db implementations (e.g. a
// Postgres-backed store where every upsert already commits) may not expose
// a write() method at all. Calling it unconditionally would 500 every
// mutating route. This makes write() a no-op when unavailable instead.
async function persist() {
  ensureDb();
  if (typeof db.write === 'function') {
    await db.write();
  }
}

function nowIso() {
  return new Date().toISOString();
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: nowIso() });
});

app.get('/admin', requireAdminAuth, (req, res) => {
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

// --- PII-safe logging helpers -------------------------------------------
// BUG FIX: the old /api/registration-summary handler logged full request
// headers and a raw JSON preview of the body (names, national ID numbers,
// phone numbers) to console.error -- the one log level that survives the
// production log silencing above, meaning PII was durably persisted in
// logs. We now log shapes/counts instead of raw values, and mask any
// identifying strings we do need to log.
function maskValue(value, keep = 2) {
  const s = String(value == null ? '' : value);
  if (!s) return s;
  if (s.length <= keep) return '*'.repeat(s.length);
  return s.slice(0, keep) + '*'.repeat(Math.max(3, s.length - keep));
}

function safeHeadersForLog(headers = {}) {
  const allow = ['content-length', 'content-type', 'origin', 'user-agent'];
  const out = {};
  for (const key of allow) {
    if (headers[key] != null) out[key] = headers[key];
  }
  return out;
}

app.get('/admin/api/collections', requireAdminAuth, async (req, res) => {
  try {
    const collections = {};
    const allRecords = await listCollection('records');
    for (const collection of VALID_COLLECTIONS) {
      let items = await listCollection(collection);
      if (collection === 'users') {
        items = attachComputedUserStatsBulk(items || [], allRecords);
      } else if (collection === 'teams') {
        const allUsers = await listCollection('users');
        items = attachComputedTeamStatsBulk(items || [], allRecords, allUsers);
      }
      collections[collection] = { count: Array.isArray(items) ? items.length : 0, items };
    }
    res.json({ collections });
  } catch (error) {
    console.error('Failed to list admin collections:', error);
    res.status(500).json({ error: 'Failed to load collections' });
  }
});

app.get('/admin/api/:collection', requireAdminAuth, async (req, res) => {
  try {
    const collection = req.params.collection;
    if (!VALID_COLLECTIONS.includes(collection)) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    let items = await listCollection(collection);
    if (collection === 'users') {
      const allRecords = await filterItemsForKeys('records', 'userId', (items || []).map((u) => u.userId));
      items = attachComputedUserStatsBulk(items || [], allRecords);
    } else if (collection === 'teams') {
      const allRecords = await filterItemsForKeys('records', 'teamId', (items || []).map((t) => t.teamId));
      const allUsers = await listCollection('users');
      items = attachComputedTeamStatsBulk(items || [], allRecords, allUsers);
    }
    res.json({ collection, items });
  } catch (error) {
    console.error('Failed to fetch admin collection:', error);
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
});

app.post('/admin/api/:collection', requireAdminAuth, async (req, res) => {
  try {
    const { collection } = req.params;
    const key = getCollectionKey(collection);
    if (!VALID_COLLECTIONS.includes(collection) || !key) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const payload = sanitizePayload(collection, req.body);
    const idValue = String(req.body[key] || req.body.id || `${collection}-${Date.now()}`);
    const item = await upsertItem(collection, key, idValue, payload);
    await persist();
    res.json({ collection, item });
  } catch (error) {
    console.error('Failed to create admin item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

app.put('/admin/api/:collection/:id', requireAdminAuth, async (req, res) => {
  try {
    const { collection, id } = req.params;
    const key = getCollectionKey(collection);
    if (!VALID_COLLECTIONS.includes(collection) || !key) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const payload = sanitizePayload(collection, req.body);
    const item = await upsertItem(collection, key, String(id), payload);
    await persist();
    res.json({ collection, item });
  } catch (error) {
    console.error('Failed to update admin item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

app.delete('/admin/api/:collection/:id', requireAdminAuth, async (req, res) => {
  try {
    const { collection, id } = req.params;
    const key = getCollectionKey(collection);
    if (!VALID_COLLECTIONS.includes(collection) || !key) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    // BUG FIX: these two branches used to call deleteCollectionItem directly,
    // skipping the cascade cleanup that the top-level /teams/:teamId and
    // /users/:userId routes perform. That left orphaned users/records/
    // teamStats behind whenever a team or user was deleted from the admin
    // panel. Both paths now share the same cascade helpers.
    if (collection === 'teams') {
      const result = await deleteTeamAndRelatedData(id);
      if (!result.deletedTeam) {
        return res.status(404).json({ error: 'Team not found' });
      }
      return res.json({ collection, deletedTeam: result.deletedTeam, deletedTeamStats: result.deletedTeamStats, deletedUsers: result.deletedUsers, deletedRecords: result.deletedRecords });
    }

    if (collection === 'users') {
      const deletedUser = await deleteCollectionItem('users', 'userId', String(id));
      if (!deletedUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      const deletedRecords = await deleteRecordsByUser(String(id));
      return res.json({ collection, deletedUser, deletedRecords });
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

// Helper used to keep the admin "list all X" endpoints down to O(1) DB
// round trips instead of O(n) (see attachComputedUserStatsBulk /
// attachComputedTeamStatsBulk below). Falls back to per-key filterItems
// calls if the underlying db doesn't support listing everything at once,
// so it still works against a minimal db implementation.
async function filterItemsForKeys(collection, key, values) {
  ensureDb();
  const unique = Array.from(new Set((values || []).filter(Boolean).map(String)));
  if (unique.length === 0) return [];
  const all = await listCollection(collection);
  if (Array.isArray(all) && all.length) {
    const set = new Set(unique);
    return all.filter((item) => item && set.has(String(item[key])));
  }
  const results = [];
  for (const value of unique) {
    const items = await filterItems(collection, key, value);
    if (Array.isArray(items)) results.push(...items);
  }
  return results;
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

// BUG FIX: this used to return the raw team *name* string (e.g.
// "Region East") as `teamId`, which was then stamped directly onto the
// record. Meanwhile every team *object* is keyed by a resolved id (a
// deterministic UUID derived from the same name via getOrCreateTeamForKey).
// The two never matched, so `/teams/:teamId/records`,
// `/stats/teams/:teamId`, and the team cascade-delete all silently failed
// to find records ingested from summary rows. extractAgentFromRow now
// returns the raw *key* only; callers must resolve it through
// getOrCreateTeamForKey (same as the agent-based path) before using it as
// a record's teamId.
//
// BUG FIX (2): the agents[] loop (fed by buildRegistrationSummary() on the
// frontend) already strips everything after '@' from the device name via
// normalizeAgentUsername() before it reaches us. This summaryRows loop was
// using the raw, unstripped device name instead, so the same physical agent
// ("agentA@device.local" here vs. "agentA" from the agents loop) forked
// into two separate userIds on every ingest. We now apply the same
// '@'-stripping rule here so both loops resolve to one userId.
function extractAgentFromRow(row = {}) {
  const rawUsername = String(
    row.regAgentDeviceName ||
    row.agentDeviceName ||
    row.agentName ||
    row.regAgentName ||
    row.agent ||
    row.username ||
    row.userId ||
    row.customerIdNumber ||
    row.mobileNumber ||
    ''
  ).trim();

  const username = rawUsername.includes('@') ? rawUsername.split('@')[0].trim() : rawUsername;

  const teamKey = String(
    row.teamId ||
    row.team ||
    row.agentRegion ||
    row.regAgentName ||
    row.agent ||
    ''
  ).trim() || null;
  return { username, teamKey };
}

function getSummaryRows(summary) {
  if (!summary || typeof summary !== 'object') return [];

  if (Array.isArray(summary.data) && summary.data.length) return summary.data;
  if (Array.isArray(summary.data2) && summary.data2.length) return summary.data2;

  if (summary.payload) {
    let payload = summary.payload;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (error) {
        console.error('[Cache API] failed to parse summary.payload as JSON', error?.message || error);
        payload = null;
      }
    }
    if (payload && typeof payload === 'object') {
      if (Array.isArray(payload.data) && payload.data.length) return payload.data;
      if (Array.isArray(payload.data2) && payload.data2.length) return payload.data2;
    }
  }

  return [];
}

// --- Status classification -----------------------------------------------
// BUG FIX: the old code independently duplicated this logic in
// normalizeCounts() and summarizeStatusCounts(), and used plain, unanchored
// substring regexes (`/approved/.test(s)`). That misclassified any status
// string containing "approved" as a substring of a *negative* phrase (e.g.
// "Not Approved", "Disapproved", "غير موافق") as an approval. There is now a
// single classifyStatus() used everywhere: rejected/pending patterns are
// checked first (they don't have this collision), and the approved branch
// is rejected if a negation word appears anywhere in the string.
const NEGATION_RE = /\b(not|non|un|no)\b|غير\s*|لم\s|لا\s/i;

function classifyStatus(rawStatus) {
  const s = String(rawStatus || '').trim().toLowerCase();
  if (!s) return 'other';
  if (/مرفوض|رفض|rejected|declined|denied/.test(s)) return 'rejected';
  if (/قيد|انتظار|pending|review|processing|in\s*progress/.test(s)) return 'pending';
  if (/موافقة|تمت|approved|accept/.test(s)) {
    return NEGATION_RE.test(s) ? 'rejected' : 'approved';
  }
  return 'other';
}

function normalizeCounts(recordOrPayload) {
  if (!recordOrPayload || typeof recordOrPayload !== 'object') {
    return { total: 0, approved: 0, pending: 0, rejected: 0, other: 0 };
  }

  const byStatus = (recordOrPayload.payload && recordOrPayload.payload.agent && typeof recordOrPayload.payload.agent.byStatus === 'object')
    ? recordOrPayload.payload.agent.byStatus
    : (recordOrPayload.byStatus && typeof recordOrPayload.byStatus === 'object')
      ? recordOrPayload.byStatus
      : null;

  let approved = 0;
  let pending = 0;
  let rejected = 0;
  let other = 0;
  let total = 0;

  if (byStatus) {
    for (const [key, value] of Object.entries(byStatus)) {
      const count = Number(value || 0) || 0;
      total += count;
      switch (classifyStatus(key)) {
        case 'approved': approved += count; break;
        case 'pending': pending += count; break;
        case 'rejected': rejected += count; break;
        default: other += count; break;
      }
    }
  }

  const statusValue = recordOrPayload.customerStatus || recordOrPayload.status || null;
  if (total === 0 && statusValue) {
    const classification = classifyStatus(statusValue);
    total = 1;
    switch (classification) {
      case 'approved': approved = 1; break;
      case 'pending': pending = 1; break;
      case 'rejected': rejected = 1; break;
      default: other = 1; break;
    }
    return { total, approved, pending, rejected, other };
  }

  if (!total && Number(recordOrPayload.totalCount || recordOrPayload.totalRecords || 0)) {
    total = Number(recordOrPayload.totalCount || recordOrPayload.totalRecords || 0);
  }

  return { total, approved, pending, rejected, other };
}

function summarizeStatusCounts(byStatus = {}) {
  const map = byStatus && typeof byStatus === 'object' ? byStatus : {};
  let approved = 0, pending = 0, rejected = 0, other = 0, total = 0;
  for (const [k, v] of Object.entries(map)) {
    const n = Number(v || 0) || 0;
    total += n;
    switch (classifyStatus(k)) {
      case 'approved': approved += n; break;
      case 'pending': pending += n; break;
      case 'rejected': rejected += n; break;
      default: other += n; break;
    }
  }
  const topStatus = Object.entries(map).sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))[0];
  return { total, approved, pending, rejected, other, topStatus: topStatus ? String(topStatus[0]) : null };
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

// --- Bulk (N+1-free) variants ---------------------------------------------
// PERF FIX: /admin/api/collections and /admin/api/:collection used to call
// attachComputedUserStats / attachComputedTeamStats per row, each of which
// issued its own filterItems('records', ...) query -- i.e. one DB round
// trip per user/team ("N+1"). These bulk variants take the already-fetched
// record (and user, for teams) lists and group them in memory once.
function groupRecordsBy(records, key) {
  const map = new Map();
  for (const record of records || []) {
    if (!record) continue;
    const k = record[key];
    if (k == null) continue;
    const bucket = map.get(String(k));
    if (bucket) bucket.push(record);
    else map.set(String(k), [record]);
  }
  return map;
}

function attachComputedUserStatsBulk(users, allRecords) {
  const byUser = groupRecordsBy(allRecords, 'userId');
  return (users || []).map((user) => {
    if (!user || !user.userId) return user;
    const counts = aggregateRecordStats(byUser.get(String(user.userId)) || []);
    return Object.assign({}, user, {
      totalRecords: counts.totalRecords,
      approvedCount: counts.approvedCount,
      pendingCount: counts.pendingCount,
      rejectedCount: counts.rejectedCount,
      otherCount: counts.otherCount,
      recordCount: counts.recordCount,
      lastSeenSummaryAt: user.lastSeenSummaryAt || null
    });
  });
}

function attachComputedTeamStatsBulk(teams, allRecords, allUsers) {
  const recordsByTeam = groupRecordsBy(allRecords, 'teamId');
  const usersByTeam = groupRecordsBy(allUsers, 'teamId');
  return (teams || []).map((team) => {
    if (!team || !team.teamId) return team;
    const counts = aggregateRecordStats(recordsByTeam.get(String(team.teamId)) || []);
    const teamUsers = usersByTeam.get(String(team.teamId)) || [];
    return Object.assign({}, team, {
      totalRecords: counts.totalRecords,
      approvedCount: counts.approvedCount,
      pendingCount: counts.pendingCount,
      rejectedCount: counts.rejectedCount,
      otherCount: counts.otherCount,
      memberCount: teamUsers.length,
      lastSummaryAt: team.lastSummaryAt || null
    });
  });
}

// --- Deterministic team identity -------------------------------------------
// BUG FIX (race condition + N+1 scan): the old getOrCreateTeamForKey()
// scanned the *entire* teams collection on every single row/agent being
// ingested (thousands of full-table reads for a large summary), and had a
// read-then-write race: two concurrent requests creating the same
// previously-unseen team could both pass the "not found" check and each
// insert a duplicate team with a random UUID.
//
// Fix: derive a stable UUID-shaped id directly from the canonical key via a
// hash. The same key always maps to the same id, so upsertItem (an atomic
// INSERT ... ON CONFLICT DO UPDATE at the DB layer) naturally dedupes
// concurrent creations -- no scan, no race. We still support teams created
// under the old scheme (random id + metadata.originalNameKey) by consulting
// a single teams snapshot fetched once per request (see buildTeamKeyCache),
// instead of once per row.
function deterministicTeamId(canonicalKey) {
  const hash = crypto.createHash('sha1').update(`team:${canonicalKey}`).digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '5' + hash.slice(13, 16),
    ((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16) + hash.slice(17, 20),
    hash.slice(20, 32)
  ].join('-');
}

async function buildTeamKeyCache() {
  const allTeams = await listCollection('teams');
  const byKey = new Map();
  for (const team of Array.isArray(allTeams) ? allTeams : []) {
    const meta = team && team.metadata ? team.metadata : {};
    if (meta && meta.originalNameKey) {
      byKey.set(String(meta.originalNameKey), team);
    }
  }
  return byKey;
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

async function getOrCreateTeamForKey(teamKey, agents = [], teamKeyCache = null) {
  // teamKey: original team name or identifier from summary (may be 'unknown')
  const canonical = String(teamKey || '').trim().toLowerCase();
  if (!canonical) return null;

  if (teamKeyCache && teamKeyCache.has(canonical)) {
    return teamKeyCache.get(canonical);
  }
  if (!teamKeyCache) {
    // No per-request cache supplied -- fall back to a single scan (still
    // one query, not one per row, since callers should pass a cache).
    const cache = await buildTeamKeyCache();
    if (cache.has(canonical)) return cache.get(canonical);
  }

  const newTeamId = deterministicTeamId(canonical);
  const name = buildTeamNameFromUsers(agents) || canonical || `Team ${newTeamId.slice(0, 6)}`;
  const team = await upsertItem('teams', 'teamId', String(newTeamId), {
    name: name || null,
    metadata: { originalName: teamKey || null, originalNameKey: canonical || null, createdFrom: 'registration-summary' }
  });

  if (teamKeyCache) teamKeyCache.set(canonical, team);
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

  await persist();
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

  await persist();
  res.json({ team });
});

// IMPORTANT: '/records/exist' must be declared BEFORE '/records/:recordId'.
// Express matches routes in declaration order, and ':recordId' would
// otherwise swallow the literal path 'exist' (recordId === 'exist'),
// making the bulk-existence-check endpoint below unreachable.
app.get('/records/exist', async (req, res) => {
  try {
    const ids = req.query.ids;
    if (!ids || typeof ids !== 'string') {
      return res.json({ existingIds: [] });
    }

    const idArray = ids.split(',').map(id => id.trim()).filter(Boolean);
    if (idArray.length === 0) {
      return res.json({ existingIds: [] });
    }

    const matchingRecords = await filterItems('records', 'recordId', idArray);
    const existingIds = matchingRecords.map(record => record.recordId).filter(Boolean);

    console.error('[BACKEND] Checked existence of', idArray.length, 'records, found', existingIds.length, 'existing');
    res.json({ existingIds });
  } catch (error) {
    console.error('Failed to check records existence:', error);
    res.status(500).json({ error: 'Failed to check records existence' });
  }
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

  // Preserve createdAt across updates to the same recordId; stamp
  // updatedAt on every write. This gives the stats endpoints below a
  // reliable, server-controlled timestamp to bucket activity by, instead
  // of depending on inconsistently-shaped source dates.
  const existing = await findItem('records', 'recordId', resolvedRecordId);
  const timestamp = nowIso();

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
    allowEdit: allowEdit != null ? String(allowEdit) : 'false',
    payload: payload || null,
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp
  });

  await persist();
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

// --- Sync watermark -------------------------------------------------
// Tells a client "where did we stop uploading" for a given user, computed
// live from the records actually stored server-side -- not from any
// per-device local state. This is what makes incremental sync consistent
// across devices: whichever device asks, it gets the same answer, because
// the answer is derived from the shared upload history rather than a
// local cursor that only one browser knows about.
//
// watermark.submissionDate is the newest submissionDate among this user's
// stored records; idsAtMaxDate is every recordId that shares that exact
// date, so a client can tell which of that day's rows it already has
// (submission dates are day-grained on the source portal, so re-asking
// for "on or after that date" will hand the whole day back again).
function computeSubmissionWatermark(records) {
  let maxTime = -Infinity;
  let maxDateStr = null;
  let idsAtMax = new Set();

  for (const record of Array.isArray(records) ? records : []) {
    const raw = record?.submissionDate;
    if (!raw) continue;
    const t = new Date(raw).getTime();
    if (Number.isNaN(t)) continue;
    const id = record.recordId != null ? String(record.recordId) : null;
    if (t > maxTime) {
      maxTime = t;
      maxDateStr = raw;
      idsAtMax = id ? new Set([id]) : new Set();
    } else if (t === maxTime && id) {
      idsAtMax.add(id);
    }
  }

  if (!maxDateStr) return null;
  return { submissionDate: maxDateStr, idsAtMaxDate: Array.from(idsAtMax) };
}

app.get('/users/:userId/sync-watermark', async (req, res) => {
  ensureDb();
  const records = await filterItems('records', 'userId', req.params.userId);
  const watermark = computeSubmissionWatermark(records);
  res.json({ userId: req.params.userId, watermark });
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

  await persist();
  res.json({ stats: teamStat });
});

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

app.post('/api/registration-summary', async (req, res) => {
  ensureDb();
  // PII FIX: no longer logs raw headers or a JSON body preview (which
  // contained full names, national ID numbers and phone numbers in the
  // clear). We log shapes/sizes only.
  try {
    const bodyLength = req.body ? (typeof req.body === 'object' ? JSON.stringify(req.body).length : String(req.body).length) : 0;
    console.error('[Cache API] /api/registration-summary received', { timestamp: nowIso(), headers: safeHeadersForLog(req.headers), bodyLength });
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

    // PERF/RACE FIX: build the team-key lookup cache ONCE for this whole
    // request (was previously re-scanned via listCollection('teams') for
    // every single agent AND every single row).
    const teamKeyCache = await buildTeamKeyCache();

    // Persist related entities so dashboards/admin API can show users, teams and records
    try {
      const teamStatsMap = {};
      if (Array.isArray(agents) && agents.length) {
        for (const agent of agents) {
          try {
            const username = String(agent?.username || agent?.userId || '').trim();
            const teamKey = String(agent?.team || agent?.teamId || '').trim() || '';
            if (!username) continue;

            // Find or create a team for this teamKey, using agents list to build name when creating
            const team = await getOrCreateTeamForKey(teamKey, agents, teamKeyCache);
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

            // BUG FIX: `teamId` may legitimately be `null` here (agent has
            // no resolvable team). Using it as an object key coerces to the
            // *string* "null", and the later `if (!teamId) continue` guard
            // only checked the loop variable shadowing the outer teamId --
            // the string "null" is truthy, so a bogus team literally named
            // "null" used to get created and persisted. We now skip
            // unresolved teams up front instead of putting them in the map.
            if (!teamId) continue;

            // Accumulate team stats
            if (!teamStatsMap[teamId]) teamStatsMap[teamId] = { teamId, totalRecords: 0, agents: [] };
            teamStatsMap[teamId].totalRecords += Number(agent?.totalCount || 0);
            teamStatsMap[teamId].agents.push({ username, totalCount: Number(agent?.totalCount || 0), byStatus: agent?.byStatus || {} });

          } catch (innerErr) {
            console.error('[Cache API] failed to persist agent-derived entities', innerErr?.message || innerErr, { username: maskValue(agent?.username) });
          }
        }
      }

      const summaryRows = getSummaryRows(summary);
      console.error('[Cache API] registration-summary row count', { rows: Array.isArray(summaryRows) ? summaryRows.length : 0, payloadKeys: Object.keys(summary || {}) });
      let persistedRecords = 0;
      let skippedRecords = 0;
      if (Array.isArray(summaryRows) && summaryRows.length) {
        for (let rowIndex = 0; rowIndex < summaryRows.length; rowIndex += 1) {
          const rawRow = summaryRows[rowIndex];
          const normalizedRow = normalizeRegistrationSummaryRow(rawRow, rowIndex);
          if (!normalizedRow) {
            skippedRecords += 1;
            continue;
          }

          const { username, teamKey } = extractAgentFromRow(normalizedRow);
          if (!username) {
            skippedRecords += 1;
            console.error('[Cache API] skipping record row due missing agent identity', { rowIndex });
            continue;
          }

          // Resolve the row's team name to the same canonical team id used
          // by the agent-based path above, instead of stamping the raw
          // name string onto the record (see extractAgentFromRow comment).
          const rowTeam = teamKey ? await getOrCreateTeamForKey(teamKey, [], teamKeyCache) : null;
          const teamId = rowTeam && rowTeam.teamId ? String(rowTeam.teamId) : null;

          const status = String(normalizedRow.customerStatus || 'unknown');
          const statusSummary = summarizeStatusCounts({ [status]: 1 });
          const recordId = normalizedRow.id ? String(normalizedRow.id) : `${generatedAt}-${username}-${rowIndex}`;
          const timestamp = nowIso();

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
            createdAt: timestamp,
            updatedAt: timestamp,
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
          persistedRecords += 1;
        }
      }
      console.error('[Cache API] registration-summary row ingest complete', { persistedRecords, skippedRecords });

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
              approvedCount: Number(stats.agents?.reduce((s, a) => s + Number(a.byStatus?.['تمت الموافقة'] || a.byStatus?.['approved'] || 0), 0) || 0) || (team && team.approvedCount) || 0,
              pendingCount: Number(stats.agents?.reduce((s, a) => s + Number(a.byStatus?.['قيد المراجعة'] || a.byStatus?.['pending'] || 0), 0) || 0) || (team && team.pendingCount) || 0,
              rejectedCount: Number(stats.agents?.reduce((s, a) => s + Number(a.byStatus?.['مرفوض'] || a.byStatus?.['rejected'] || 0), 0) || 0) || (team && team.rejectedCount) || 0,
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

    await persist();
    return res.json({ summary: stored });
  } catch (dbErr) {
    console.error('[Cache API] registration-summary DB upsert failed', { error: dbErr?.message || dbErr, generatedAt, totalRecords });
    return res.status(500).json({ error: 'Failed to persist registration summary', details: dbErr?.message || String(dbErr) });
  }
});

app.get('/api/registration-summary', async (req, res) => {
  ensureDb();
  try {
    if (typeof db.findItem === 'function') {
      const single = await findItem('registrationSummaries', 'summaryId', 'latest');
      return res.json({ summary: single || null });
    }
    return res.status(500).json({ error: 'Registration summary not available' });
  } catch (error) {
    console.error('[Cache API] failed to fetch registration summary:', error);
    return res.status(500).json({ error: 'Failed to load registration summary', details: error?.message || String(error) });
  }
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

  const { user, users, team, stats, records, isBatch, batchIndex, totalBatches } = req.body;

  console.error('[BACKEND] Cache refresh request received:', {
    hasUser: !!user,
    hasUsers: Array.isArray(users) && users.length > 0,
    userCount: Array.isArray(users) ? users.length : 0,
    hasTeam: !!team,
    hasStats: !!stats,
    hasRecords: Array.isArray(records) && records.length > 0,
    recordCount: Array.isArray(records) ? records.length : 0,
    isBatch: !!isBatch,
    batchIndex: batchIndex ?? null,
    totalBatches: totalBatches ?? null
  });

  if (!user && !users && !team && !stats && !records) {
    return res.status(400).json({ error: 'Cache refresh payload must include user, users, team, stats, or records' });
  }

  const result = {};

  try {
    if (team && team.teamId) {
      result.team = await upsertItem('teams', 'teamId', String(team.teamId), {
        name: team.name || null,
        totalRecords: Number(team.totalRecords || 0),
        approvedCount: Number(team.approvedCount || 0),
        pendingCount: Number(team.pendingCount || 0),
        rejectedCount: Number(team.rejectedCount || 0),
        otherCount: Number(team.otherCount || 0),
        memberCount: Number(team.memberCount || 0),
        lastSummaryAt: team.lastSummaryAt || null,
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
        totalRecords: Number(user.totalRecords || 0),
        approvedCount: Number(user.approvedCount || 0),
        pendingCount: Number(user.pendingCount || 0),
        rejectedCount: Number(user.rejectedCount || 0),
        otherCount: Number(user.otherCount || 0),
        lastSeenSummaryAt: user.lastSeenSummaryAt || null,
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
          totalRecords: item.totalRecords || 0,
          approvedCount: item.approvedCount || 0,
          pendingCount: item.pendingCount || 0,
          rejectedCount: item.rejectedCount || 0,
          otherCount: item.otherCount || 0,
          lastSeenSummaryAt: item.lastSeenSummaryAt || null,
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
        const existingRecord = await findItem('records', 'recordId', String(recordId));
        const timestamp = nowIso();

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
          allowEdit: record?.allowEdit != null ? String(record?.allowEdit) : 'false',
          createdAt: existingRecord?.createdAt || timestamp,
          updatedAt: timestamp
        });

        result.records.push(persistedRecord);
      }
    }

    await persist();
    console.error('[BACKEND] Cache refresh completed successfully:', {
      teamCount: result.team ? 1 : 0,
      userCount: result.user ? 1 : 0,
      usersCount: result.users ? result.users.length : 0,
      recordCount: result.records ? result.records.length : 0
    });

    return res.json(result);
  } catch (error) {
    console.error('[BACKEND] Cache refresh failed:', error, { message: error.message, stack: error.stack });
    return res.status(500).json({ error: 'Cache refresh failed', details: error.message });
  }
});

// =====================================================================
// "God stats" for the records table
// =====================================================================
// All of these are read-only and computed in memory from the records
// collection (plus users/teams). They rely on the createdAt/updatedAt
// timestamps now stamped on every record write above -- for records that
// predate this change, we fall back through submissionDate/creationDate/
// approvalDate/payload timestamps so historical data still buckets
// reasonably.

function recordTimestamp(record) {
  const candidates = [
    record?.createdAt,
    record?.payload?.ingest?.receivedAt,
    record?.submissionDate,
    record?.payload?.summaryGeneratedAt,
    record?.creationDate,
    record?.approvalDate,
    record?.updatedAt
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const d = new Date(candidate);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function dayKey(date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

function emptyStatusBucket() {
  return { total: 0, approved: 0, pending: 0, rejected: 0, other: 0 };
}

function addToBucket(bucket, status) {
  bucket.total += 1;
  const cls = classifyStatus(status);
  bucket[cls] = (bucket[cls] || 0) + 1;
}

function computeStatusTotals(records) {
  const bucket = emptyStatusBucket();
  let uniqueUsers = new Set();
  let uniqueTeams = new Set();
  let first = null;
  let last = null;
  for (const record of records) {
    addToBucket(bucket, record?.customerStatus);
    if (record?.userId) uniqueUsers.add(String(record.userId));
    if (record?.teamId) uniqueTeams.add(String(record.teamId));
    const ts = recordTimestamp(record);
    if (ts) {
      if (!first || ts < first) first = ts;
      if (!last || ts > last) last = ts;
    }
  }
  return {
    ...bucket,
    approvalRate: bucket.total ? Number((bucket.approved / bucket.total).toFixed(4)) : 0,
    uniqueUsers: uniqueUsers.size,
    uniqueTeams: uniqueTeams.size,
    firstRecordAt: first ? first.toISOString() : null,
    lastRecordAt: last ? last.toISOString() : null
  };
}

// Buckets records into calendar-day buckets covering the last `days` days
// (inclusive of today), so callers get a fixed-length, zero-filled series
// suitable for charting even on days with no activity.
function bucketRecordsByDay(records, days) {
  const now = new Date();
  const buckets = new Map();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    buckets.set(dayKey(d), { date: dayKey(d), ...emptyStatusBucket() });
  }
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1)));

  for (const record of records) {
    const ts = recordTimestamp(record);
    if (!ts || ts < cutoff) continue;
    const key = dayKey(ts);
    const bucket = buckets.get(key);
    if (bucket) addToBucket(bucket, record?.customerStatus);
  }

  return Array.from(buckets.values());
}

function countsSince(records, sinceDate) {
  let n = 0;
  for (const record of records) {
    const ts = recordTimestamp(record);
    if (ts && ts >= sinceDate) n += 1;
  }
  return n;
}

function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function parsePeriodDays(value, fallback = 30) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), 365);
}

// GET /stats/overview — global "god stats" across all records.
app.get('/stats/overview', async (req, res) => {
  ensureDb();
  const [records, users, teams] = await Promise.all([
    listCollection('records'),
    listCollection('users'),
    listCollection('teams')
  ]);
  const all = Array.isArray(records) ? records : [];
  const totals = computeStatusTotals(all);

  res.json({
    totals,
    userCount: Array.isArray(users) ? users.length : 0,
    teamCount: Array.isArray(teams) ? teams.length : 0,
    activity: {
      last24h: countsSince(all, daysAgo(1)),
      last7d: countsSince(all, daysAgo(7)),
      last30d: countsSince(all, daysAgo(30))
    },
    dailyActivity: bucketRecordsByDay(all, 30)
  });
});

// GET /stats/users/:userId?days=30 — per-user "god stats".
app.get('/stats/users/:userId', async (req, res) => {
  ensureDb();
  const { userId } = req.params;
  const user = await findItem('users', 'userId', userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const days = parsePeriodDays(req.query.days, 30);
  const records = await filterItems('records', 'userId', userId);
  const totals = computeStatusTotals(records);
  const activeDays = new Set(records.map((r) => { const ts = recordTimestamp(r); return ts ? dayKey(ts) : null; }).filter(Boolean)).size;

  res.json({
    user,
    totals,
    avgRecordsPerActiveDay: activeDays ? Number((totals.total / activeDays).toFixed(2)) : 0,
    activity: {
      last24h: countsSince(records, daysAgo(1)),
      last7d: countsSince(records, daysAgo(7)),
      last30d: countsSince(records, daysAgo(30))
    },
    dailyActivity: bucketRecordsByDay(records, days)
  });
});

// GET /stats/users/:userId/activity?days=30 — just the time series.
app.get('/stats/users/:userId/activity', async (req, res) => {
  ensureDb();
  const { userId } = req.params;
  const days = parsePeriodDays(req.query.days, 30);
  const records = await filterItems('records', 'userId', userId);
  res.json({ userId, days, series: bucketRecordsByDay(records, days) });
});

// GET /stats/teams/:teamId?days=30 — per-team "god stats", including a
// per-member breakdown and a simple leaderboard of top performers.
app.get('/stats/teams/:teamId', async (req, res) => {
  ensureDb();
  const { teamId } = req.params;
  const team = await findItem('teams', 'teamId', teamId);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }
  const days = parsePeriodDays(req.query.days, 30);
  const [records, members] = await Promise.all([
    filterItems('records', 'teamId', teamId),
    filterItems('users', 'teamId', teamId)
  ]);
  const totals = computeStatusTotals(records);
  const byUser = groupRecordsBy(records, 'userId');

  const memberBreakdown = (members || []).map((m) => {
    const memberRecords = byUser.get(String(m.userId)) || [];
    const memberTotals = computeStatusTotals(memberRecords);
    return {
      userId: m.userId,
      username: m.username || null,
      totalRecords: memberTotals.total,
      approvedCount: memberTotals.approved,
      pendingCount: memberTotals.pending,
      rejectedCount: memberTotals.rejected,
      approvalRate: memberTotals.approvalRate,
      last7d: countsSince(memberRecords, daysAgo(7))
    };
  }).sort((a, b) => b.totalRecords - a.totalRecords);

  res.json({
    team,
    totals,
    memberCount: (members || []).length,
    activity: {
      last24h: countsSince(records, daysAgo(1)),
      last7d: countsSince(records, daysAgo(7)),
      last30d: countsSince(records, daysAgo(30))
    },
    dailyActivity: bucketRecordsByDay(records, days),
    topPerformers: memberBreakdown.slice(0, 10),
    memberBreakdown
  });
});

// GET /stats/teams/:teamId/activity?days=30
app.get('/stats/teams/:teamId/activity', async (req, res) => {
  ensureDb();
  const { teamId } = req.params;
  const days = parsePeriodDays(req.query.days, 30);
  const records = await filterItems('records', 'teamId', teamId);
  res.json({ teamId, days, series: bucketRecordsByDay(records, days) });
});

// GET /stats/leaderboard?scope=users|teams&period=7|30|all&limit=10
// Ranks users or teams by total record volume within a period.
app.get('/stats/leaderboard', async (req, res) => {
  ensureDb();
  const scope = req.query.scope === 'teams' ? 'teams' : 'users';
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
  const periodDays = req.query.period && req.query.period !== 'all' ? parsePeriodDays(req.query.period, 30) : null;

  const [records, entities] = await Promise.all([
    listCollection('records'),
    listCollection(scope)
  ]);
  const key = scope === 'teams' ? 'teamId' : 'userId';
  const grouped = groupRecordsBy(records, key);
  const since = periodDays ? daysAgo(periodDays) : null;

  const ranked = (entities || []).map((entity) => {
    const id = entity[key];
    let entityRecords = grouped.get(String(id)) || [];
    if (since) entityRecords = entityRecords.filter((r) => { const ts = recordTimestamp(r); return ts && ts >= since; });
    const totals = computeStatusTotals(entityRecords);
    return {
      id,
      name: scope === 'teams' ? (entity.name || id) : (entity.username || id),
      totalRecords: totals.total,
      approvedCount: totals.approved,
      approvalRate: totals.approvalRate
    };
  }).sort((a, b) => b.totalRecords - a.totalRecords).slice(0, limit);

  res.json({ scope, period: periodDays ? `${periodDays}d` : 'all', leaderboard: ranked });
});

async function startServer() {
  try {
    await initializeDatabase();
    isReady = true;
    app.listen(PORT, () => {
      console.error(`Jawwal Pay cache API listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error('[Server] request error handler', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ error: 'Internal Server Error', details: err?.message || String(err) });
});

process.on('unhandledRejection', (reason) => {
  console.error('[Server] unhandledRejection', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Server] uncaughtException', error);
});

startServer();