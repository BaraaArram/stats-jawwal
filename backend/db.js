const fs = require('fs');
const path = require('path');
const { Low, JSONFile } = require('lowdb');

async function createDatabase(dbPath) {
  const directory = path.dirname(dbPath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ users: [], teams: [], records: [], teamStats: [] }, null, 2));
  }

  const adapter = new JSONFile(dbPath);
  const db = new Low(adapter);
  await db.read();
  db.data = db.data || { users: [], teams: [], records: [], teamStats: [] };
  await db.write();
  return db;
}

module.exports = { createDatabase };
