import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

interface Bill {
  BillId: number;
  ParliamentNumber: number;
  SessionNumber: number;
  [key: string]: any;
}

interface SessionData {
  parliament: number;
  session: number;
  startDate: string;
  endDate: string;
}

interface SQLResultSet {
  rows: {
    _array: Array<{
      data: string;
      lastUpdated: number;
    }>;
  };
}

const db = SQLite.openDatabaseSync('parliament.db');
const DB_VERSION = 3; // Increment for new sessions table

export const initDatabase = async () => {
  try {
    const versionTable = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='db_version'"
    );

    if (versionTable.length === 0) {
      await db.runAsync('CREATE TABLE db_version (version INTEGER);');
      await db.runAsync('INSERT INTO db_version (version) VALUES (1);');
    }

    const currentVersion = await db.getAllAsync<{ version: number }>(
      'SELECT version FROM db_version'
    );
    const version = currentVersion[0]?.version || 1;

    if (version < DB_VERSION) {
      console.log(`Migrating database from version ${version} to ${DB_VERSION}`);

      if (version === 1) {
        // Migration from version 1 to 2 (adding parliament and session columns)
        await db.runAsync(`
          CREATE TABLE bills_temp (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            billId INTEGER UNIQUE,
            parliament INTEGER,
            session INTEGER,
            data TEXT,
            lastUpdated INTEGER
          );
        `);

        await db.runAsync(`
          INSERT INTO bills_temp (billId, data, lastUpdated, parliament, session)
          SELECT billId, data, lastUpdated, 44, 1 FROM bills;
        `);

        await db.runAsync('DROP TABLE bills;');
        await db.runAsync('ALTER TABLE bills_temp RENAME TO bills;');
      }

      if (version <= 2) {
        // Migration to version 3 (adding sessions table)
        await db.runAsync(`
          CREATE TABLE sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            parliament INTEGER,
            session INTEGER,
            startDate TEXT,
            endDate TEXT,
            lastUpdated INTEGER,
            UNIQUE(parliament, session)
          );
        `);
      }

      await db.runAsync('UPDATE db_version SET version = ?', [DB_VERSION]);
    }

    // Create bills table if it doesn't exist
    const billsTable = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='bills'"
    );

    if (billsTable.length === 0) {
      await db.runAsync(
        `CREATE TABLE bills (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          billId INTEGER UNIQUE,
          parliament INTEGER,
          session INTEGER,
          data TEXT,
          lastUpdated INTEGER
        );`
      );
    }

    // Create sessions table if it doesn't exist
    const sessionsTable = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'"
    );

    if (sessionsTable.length === 0) {
      await db.runAsync(`
        CREATE TABLE sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          parliament INTEGER,
          session INTEGER,
          startDate TEXT,
          endDate TEXT,
          lastUpdated INTEGER,
          UNIQUE(parliament, session)
        );
      `);
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    try {
      await db.runAsync('DROP TABLE IF EXISTS bills;');
      await db.runAsync('DROP TABLE IF EXISTS sessions;');
      await db.runAsync('DROP TABLE IF EXISTS db_version;');
      await db.runAsync('CREATE TABLE db_version (version INTEGER);');
      await db.runAsync('INSERT INTO db_version (version) VALUES (3);');
      await db.runAsync(
        `CREATE TABLE bills (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          billId INTEGER UNIQUE,
          parliament INTEGER,
          session INTEGER,
          data TEXT,
          lastUpdated INTEGER
        );`
      );
      await db.runAsync(`
        CREATE TABLE sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          parliament INTEGER,
          session INTEGER,
          startDate TEXT,
          endDate TEXT,
          lastUpdated INTEGER,
          UNIQUE(parliament, session)
        );
      `);
    } catch (retryError) {
      console.error('Error retrying database initialization:', retryError);
    }
  }
};

export const saveBills = async (bills: Bill[]) => {
  try {
    for (const bill of bills) {
      await db.runAsync(
        'INSERT OR REPLACE INTO bills (billId, parliament, session, data, lastUpdated) VALUES (?, ?, ?, ?, ?)',
        [bill.BillId, bill.ParliamentNumber, bill.SessionNumber, JSON.stringify(bill), Date.now()]
      );
    }
  } catch (error) {
    console.error('Error saving bills:', error);
  }
};

export const getBills = async (parliament?: number, session?: number): Promise<Bill[]> => {
  try {
    let query = 'SELECT * FROM bills';
    const params: any[] = [];

    if (parliament !== undefined && session !== undefined) {
      query += ' WHERE parliament = ? AND session = ?';
      params.push(parliament, session);
    } else {
      query += ' WHERE lastUpdated > ?';
      params.push(Date.now() - 24 * 60 * 60 * 1000);
    }

    const result = await db.getAllAsync<{ data: string; lastUpdated: number }>(query, params);
    return result.map(row => JSON.parse(row.data));
  } catch (error) {
    console.error('Error getting bills:', error);
    return [];
  }
};

export const saveSessions = async (sessions: SessionData[]) => {
  try {
    for (const session of sessions) {
      await db.runAsync(
        'INSERT OR REPLACE INTO sessions (parliament, session, startDate, endDate, lastUpdated) VALUES (?, ?, ?, ?, ?)',
        [session.parliament, session.session, session.startDate, session.endDate, Date.now()]
      );
    }
  } catch (error) {
    console.error('Error saving sessions:', error);
  }
};

export const getSessions = async (parliament?: number): Promise<SessionData[]> => {
  try {
    let query = 'SELECT parliament, session, startDate, endDate FROM sessions';
    const params: any[] = [];

    if (parliament !== undefined) {
      query += ' WHERE parliament = ? AND lastUpdated > ?';
      params.push(parliament, Date.now() - 24 * 60 * 60 * 1000);
    } else {
      query += ' WHERE lastUpdated > ?';
      params.push(Date.now() - 24 * 60 * 60 * 1000);
    }

    query += ' ORDER BY parliament DESC, session DESC';

    const result = await db.getAllAsync<SessionData>(query, params);
    return result;
  } catch (error) {
    console.error('Error getting sessions:', error);
    return [];
  }
};

export const clearOldData = async () => {
  try {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    await db.runAsync('DELETE FROM bills WHERE lastUpdated < ?', [oneDayAgo]);
    await db.runAsync('DELETE FROM sessions WHERE lastUpdated < ?', [oneDayAgo]);
  } catch (error) {
    console.error('Error clearing old data:', error);
  }
}; 