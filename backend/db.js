const fs = require('fs');
const path = require('path');
const { createPgDatabase } = require('./pg_db');

// lowdb compatibility: try modern API (lowdb v3+/v6) first, fall back to legacy adapters
let Low;
let JSONFile;
let legacyLow;
let FileSyncAdapter;
try {
  // modern (v6+) exposes node entry
  const lowdbNode = require('lowdb/node');
  JSONFile = lowdbNode.JSONFile;
  Low = require('lowdb').Low;
} catch (e) {
  try {
    // older lowdb versions
    legacyLow = require('lowdb');
    FileSyncAdapter = require('lowdb/adapters/FileSync');
  } catch (e2) {
    // leave undefined — will error later
  }
}

async function createDatabase(dbPath) {
  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.NEON_URL;
  if (databaseUrl) {
    // Use Postgres (Neon) when DATABASE_URL is present
    return await createPgDatabase(databaseUrl);
  }

  const directory = path.dirname(dbPath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ users: [], teams: [], records: [], teamStats: [], registrationSummaries: [] }, null, 2));
  }

  const defaultData = { users: [], teams: [], records: [], teamStats: [], registrationSummaries: [] };

  // Modern lowdb (Low + JSONFile)
  if (JSONFile && Low) {
    const adapter = new JSONFile(dbPath);
    const low = new Low(adapter, defaultData);
    await low.read();
    low.data = low.data || defaultData;
    await low.write();

    return {
      type: 'lowdb',
      async findItem(collection, key, value) {
        return low.data[collection].find((item) => item[key] === value) || null;
      },
      async upsertItem(collection, key, value, item) {
        const existingIndex = low.data[collection].findIndex((entry) => entry[key] === value);
        if (existingIndex !== -1) {
          low.data[collection][existingIndex] = {
            ...low.data[collection][existingIndex],
            ...item,
            updatedAt: new Date().toISOString()
          };
        } else {
          low.data[collection].push({
            ...item,
            [key]: value,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
        await low.write();
        return low.data[collection].find((entry) => entry[key] === value);
      },
      async filterItems(collection, key, value) {
        return low.data[collection].filter((item) => item[key] === value);
      },
      async write() { await low.write(); },
      async close() { /* noop */ }
    };
  }

  // Legacy lowdb adapter (fallback)
  if (legacyLow && FileSyncAdapter) {
    const adapter = new FileSyncAdapter(dbPath);
    const dbLegacy = legacyLow(adapter);
    dbLegacy.defaults(defaultData).write();

    return {
      type: 'lowdb-legacy',
      async findItem(collection, key, value) {
        return dbLegacy.get(collection).find((item) => item[key] === value).value() || null;
      },
      async upsertItem(collection, key, value, item) {
        const found = dbLegacy.get(collection).find({ [key]: value }).value();
        if (found) {
          dbLegacy.get(collection).find({ [key]: value }).assign({ ...found, ...item, updatedAt: new Date().toISOString() }).write();
        } else {
          dbLegacy.get(collection).push({ ...item, [key]: value, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).write();
        }
        return dbLegacy.get(collection).find({ [key]: value }).value();
      },
      async filterItems(collection, key, value) {
        return dbLegacy.get(collection).filter((item) => item[key] === value).value();
      },
      async write() { /* legacy writes are sync */ },
      async close() { /* noop */ }
    };
  }

  throw new Error('No suitable lowdb adapter found (JSONFile/Low or legacy FileSync)');
}

module.exports = { createDatabase };
