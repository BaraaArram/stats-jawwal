// Jawwal Pay UX+ - Team Cache Database
// Stores users, teams, records, and team stats in IndexedDB for offline cache.
(function() {
  const CACHE_DB_NAME = 'JawwalPayUXCache';
  const CACHE_DB_VERSION = 1;
  const STORES = {
    USERS: 'users',
    TEAMS: 'teams',
    RECORDS: 'records',
    TEAM_STATS: 'teamStats'
  };

  function openCacheDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CACHE_DB_NAME, CACHE_DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORES.USERS)) {
          db.createObjectStore(STORES.USERS, { keyPath: 'userId' });
        }
        if (!db.objectStoreNames.contains(STORES.TEAMS)) {
          db.createObjectStore(STORES.TEAMS, { keyPath: 'teamId' });
        }
        if (!db.objectStoreNames.contains(STORES.RECORDS)) {
          const recordsStore = db.createObjectStore(STORES.RECORDS, { keyPath: 'recordId' });
          recordsStore.createIndex('teamId', 'teamId', { unique: false });
          recordsStore.createIndex('userId', 'userId', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.TEAM_STATS)) {
          db.createObjectStore(STORES.TEAM_STATS, { keyPath: 'teamId' });
        }
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        reject(event.target.error || new Error('IndexedDB open failed'));
      };
    });
  }

  function runTransaction(storeNames, mode, callback) {
    return openCacheDb().then((db) => {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeNames, mode);
        const stores = storeNames.reduce((acc, name) => {
          acc[name] = tx.objectStore(name);
          return acc;
        }, {});

        tx.oncomplete = () => {
          db.close();
          resolve();
        };

        tx.onerror = (event) => {
          db.close();
          reject(event.target.error || new Error('IndexedDB transaction failed'));
        };

        callback(stores, tx, resolve, reject);
      });
    });
  }

  function getFromStore(storeName, key) {
    return openCacheDb().then((db) => {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = (event) => {
          resolve(event.target.result || null);
        };

        request.onerror = (event) => {
          reject(event.target.error || new Error('IndexedDB get failed'));
        };

        tx.oncomplete = () => db.close();
      });
    });
  }

  function putToStore(storeName, value) {
    return new Promise((resolve, reject) => {
      runTransaction([storeName], 'readwrite', (stores) => {
        const request = stores[storeName].put(value);
        request.onsuccess = () => resolve(value);
        request.onerror = (event) => reject(event.target.error || new Error('IndexedDB put failed'));
      }).catch(reject);
    });
  }

  function deleteFromStore(storeName, key) {
    return new Promise((resolve, reject) => {
      runTransaction([storeName], 'readwrite', (stores) => {
        const request = stores[storeName].delete(key);
        request.onsuccess = () => resolve(true);
        request.onerror = (event) => reject(event.target.error || new Error('IndexedDB delete failed'));
      }).catch(reject);
    });
  }

  function getAllFromStore(storeName) {
    return openCacheDb().then((db) => {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = (event) => {
          resolve(event.target.result || []);
        };

        request.onerror = (event) => {
          reject(event.target.error || new Error('IndexedDB getAll failed'));
        };

        tx.oncomplete = () => db.close();
      });
    });
  }

  function getByIndex(storeName, indexName, key) {
    return openCacheDb().then((db) => {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.getAll(key);

        request.onsuccess = (event) => {
          resolve(event.target.result || []);
        };

        request.onerror = (event) => {
          reject(event.target.error || new Error('IndexedDB index query failed'));
        };

        tx.oncomplete = () => db.close();
      });
    });
  }

  function bulkPut(storeName, records) {
    return new Promise((resolve, reject) => {
      runTransaction([storeName], 'readwrite', (stores) => {
        let completed = 0;
        const store = stores[storeName];
        if (!Array.isArray(records) || records.length === 0) {
          resolve([]);
          return;
        }

        records.forEach((item) => {
          const request = store.put(item);
          request.onsuccess = () => {
            completed += 1;
            if (completed === records.length) {
              resolve(records);
            }
          };
          request.onerror = (event) => reject(event.target.error || new Error('IndexedDB bulk put failed'));
        });
      }).catch(reject);
    });
  }

  function clearStore(storeName) {
    return new Promise((resolve, reject) => {
      runTransaction([storeName], 'readwrite', (stores) => {
        const request = stores[storeName].clear();
        request.onsuccess = () => resolve(true);
        request.onerror = (event) => reject(event.target.error || new Error('IndexedDB clear failed'));
      }).catch(reject);
    });
  }

  const CacheDB = {
    init: async function() {
      await openCacheDb();
      return true;
    },
    clearAll: async function() {
      await Promise.all([
        clearStore(STORES.USERS),
        clearStore(STORES.TEAMS),
        clearStore(STORES.RECORDS),
        clearStore(STORES.TEAM_STATS)
      ]);
      return true;
    },
    getUser: async function(userId) {
      return getFromStore(STORES.USERS, String(userId));
    },
    putUser: async function(user) {
      if (!user || !user.userId) {
        throw new Error('CacheDB.putUser requires user.userId');
      }
      return putToStore(STORES.USERS, {
        ...user,
        userId: String(user.userId),
        updatedAt: new Date().toISOString()
      });
    },
    deleteUser: async function(userId) {
      return deleteFromStore(STORES.USERS, String(userId));
    },
    getTeam: async function(teamId) {
      return getFromStore(STORES.TEAMS, String(teamId));
    },
    putTeam: async function(team) {
      if (!team || !team.teamId) {
        throw new Error('CacheDB.putTeam requires team.teamId');
      }
      return putToStore(STORES.TEAMS, {
        ...team,
        teamId: String(team.teamId),
        updatedAt: new Date().toISOString()
      });
    },
    deleteTeam: async function(teamId) {
      return deleteFromStore(STORES.TEAMS, String(teamId));
    },
    getRecord: async function(recordId) {
      return getFromStore(STORES.RECORDS, String(recordId));
    },
    putRecord: async function(record) {
      if (!record || !record.recordId) {
        throw new Error('CacheDB.putRecord requires record.recordId');
      }
      return putToStore(STORES.RECORDS, {
        ...record,
        recordId: String(record.recordId),
        teamId: record.teamId ? String(record.teamId) : '',
        userId: record.userId ? String(record.userId) : null,
        updatedAt: new Date().toISOString()
      });
    },
    bulkPutRecords: async function(records) {
      if (!Array.isArray(records)) {
        throw new Error('CacheDB.bulkPutRecords requires an array');
      }
      const normalized = records.map((record) => ({
        ...record,
        recordId: String(record.recordId || `${record.teamId || 'unknown'}-${record.userId || 'unknown'}-${Date.now()}-${Math.random()}`),
        teamId: record.teamId ? String(record.teamId) : '',
        userId: record.userId ? String(record.userId) : null,
        updatedAt: new Date().toISOString()
      }));
      return bulkPut(STORES.RECORDS, normalized);
    },
    getRecordsByTeam: async function(teamId) {
      return getByIndex(STORES.RECORDS, 'teamId', String(teamId));
    },
    getRecordsByUser: async function(userId) {
      return getByIndex(STORES.RECORDS, 'userId', String(userId));
    },
    getTeamStats: async function(teamId) {
      return getFromStore(STORES.TEAM_STATS, String(teamId));
    },
    putTeamStats: async function(stats) {
      if (!stats || !stats.teamId) {
        throw new Error('CacheDB.putTeamStats requires stats.teamId');
      }
      return putToStore(STORES.TEAM_STATS, {
        ...stats,
        teamId: String(stats.teamId),
        lastUpdatedAt: new Date().toISOString()
      });
    },
    deleteTeamStats: async function(teamId) {
      return deleteFromStore(STORES.TEAM_STATS, String(teamId));
    },
    getAllUsers: async function() {
      return getAllFromStore(STORES.USERS);
    },
    getAllTeams: async function() {
      return getAllFromStore(STORES.TEAMS);
    }
  };

  window.JawwalPayCacheDB = CacheDB;
  console.log('[JawwalPay UX+] CacheDB loaded');
})();