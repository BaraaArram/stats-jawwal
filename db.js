const fs = require('fs');
const path = require('path');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const { createPgDatabase } = require('./pg_db');

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
    fs.writeFileSync(dbPath, JSON.stringify({ users: [], teams: [], records: [], teamStats: [] }, null, 2));
  }

  const adapter = new JSONFile(dbPath);
  const defaultData = { users: [], teams: [], records: [], teamStats: [] };
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

module.exports = { createDatabase };
