import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { Politician, PoliticianFilters } from '../types/parliament';

const db = SQLite.openDatabaseSync('parliament_politicians.db');
const DB_VERSION = 2; // Increased version for schema change

/**
 * Initialize the politicians database
 */
export const initPoliticiansDatabase = async () => {
  try {
    // Create version table if it doesn't exist
    const versionTable = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='db_version'"
    );

    if (versionTable.length === 0) {
      await db.runAsync('CREATE TABLE db_version (version INTEGER);');
      await db.runAsync('INSERT INTO db_version (version) VALUES (2);');
    } else {
      // Check if we need to upgrade the schema
      const versionResult = await db.getAllAsync<{ version: number }>(
        'SELECT version FROM db_version'
      );
      const currentVersion = versionResult[0]?.version || 1;
      
      if (currentVersion < DB_VERSION) {
        console.log(`Upgrading politicians database from v${currentVersion} to v${DB_VERSION}`);
        
        // In case we need to upgrade the schema
        if (currentVersion === 1) {
          // Drop and recreate the politicians table with is_current column
          await db.runAsync('DROP TABLE IF EXISTS politicians;');
        }
        
        // Update the version
        await db.runAsync('UPDATE db_version SET version = ?', [DB_VERSION]);
      }
    }

    // Create or recreate politicians table if it doesn't exist
    const politiciansTable = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='politicians'"
    );

    if (politiciansTable.length === 0) {
      await db.runAsync(
        `CREATE TABLE politicians (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          url TEXT UNIQUE,
          data TEXT,
          is_current INTEGER DEFAULT 0,
          lastUpdated INTEGER
        );`
      );
      
      // Create an index on is_current for faster filtering
      await db.runAsync('CREATE INDEX idx_is_current ON politicians(is_current);');
    }
    
    console.log('Politicians database initialized');
  } catch (error) {
    console.error('Error initializing politicians database:', error);
    try {
      // Retry database initialization
      await db.runAsync('DROP TABLE IF EXISTS politicians;');
      await db.runAsync('DROP TABLE IF EXISTS db_version;');
      await db.runAsync('CREATE TABLE db_version (version INTEGER);');
      await db.runAsync('INSERT INTO db_version (version) VALUES (2);');
      await db.runAsync(
        `CREATE TABLE politicians (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          url TEXT UNIQUE,
          data TEXT,
          is_current INTEGER DEFAULT 0,
          lastUpdated INTEGER
        );`
      );
      await db.runAsync('CREATE INDEX idx_is_current ON politicians(is_current);');
    } catch (retryError) {
      console.error('Error retrying politicians database initialization:', retryError);
    }
  }
};

/**
 * Save politicians to the database
 * @param politicians Array of politicians to save
 */
export const savePoliticians = async (politicians: Politician[]) => {
  try {
    // Begin transaction for better performance
    await db.runAsync('BEGIN TRANSACTION;');
    
    for (const politician of politicians) {
      if (!politician || !politician.url) continue;
      
      // Determine if the politician is current (has both current_riding and current_party)
      const isCurrent = politician.current_riding && politician.current_party ? 1 : 0;
      
      await db.runAsync(
        'INSERT OR REPLACE INTO politicians (url, data, is_current, lastUpdated) VALUES (?, ?, ?, ?)',
        [politician.url, JSON.stringify(politician), isCurrent, Date.now()]
      );
    }
    
    await db.runAsync('COMMIT;');
    console.log(`Saved ${politicians.length} politicians to database`);
  } catch (error) {
    // Rollback transaction if there was an error
    await db.runAsync('ROLLBACK;');
    console.error('Error saving politicians:', error);
  }
};

/**
 * Get all politicians from the database
 * @param maxAge Maximum age of cached data in milliseconds (default: 7 days)
 * @param currentOnly If true, only return politicians who are currently serving
 * @returns Array of politicians
 */
export const getPoliticians = async (
  maxAge: number = 7 * 24 * 60 * 60 * 1000, 
  currentOnly: boolean = false
): Promise<Politician[]> => {
  try {
    let query = 'SELECT data, lastUpdated FROM politicians WHERE lastUpdated > ?';
    const params: any[] = [Date.now() - maxAge];
    
    // Add filter for current politicians if requested
    if (currentOnly) {
      query += ' AND is_current = 1';
    }
    
    const result = await db.getAllAsync<{ data: string; lastUpdated: number }>(query, params);
    
    if (result.length === 0) {
      return [];
    }
    
    // Parse JSON data
    return result.map(row => JSON.parse(row.data) as Politician);
  } catch (error) {
    console.error('Error getting politicians from database:', error);
    return [];
  }
};

/**
 * Check if politicians data is stale and needs refreshing
 * @param maxAge Maximum age of cached data in milliseconds (default: 1 day)
 * @returns Boolean indicating if data is stale
 */
export const isPoliticiansCacheStale = async (maxAge: number = 24 * 60 * 60 * 1000): Promise<boolean> => {
  try {
    const result = await db.getAllAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM politicians WHERE lastUpdated > ?',
      [Date.now() - maxAge]
    );
    
    return result[0]?.count === 0;
  } catch (error) {
    console.error('Error checking politicians cache:', error);
    return true; // Consider cache stale if there's an error
  }
};

/**
 * Clear all politicians data
 */
export const clearPoliticiansCache = async () => {
  try {
    await db.runAsync('DELETE FROM politicians;');
    console.log('Politicians cache cleared');
  } catch (error) {
    console.error('Error clearing politicians cache:', error);
  }
};

/**
 * Get a specific politician by URL
 * @param url The politician's URL
 * @returns The politician object or null if not found
 */
export const getPoliticianByUrl = async (url: string): Promise<Politician | null> => {
  try {
    const result = await db.getAllAsync<{ data: string }>(
      'SELECT data FROM politicians WHERE url = ?',
      [url]
    );
    
    if (result.length === 0) {
      return null;
    }
    
    return JSON.parse(result[0].data) as Politician;
  } catch (error) {
    console.error(`Error getting politician with URL ${url}:`, error);
    return null;
  }
};

export default {
  initPoliticiansDatabase,
  savePoliticians,
  getPoliticians,
  isPoliticiansCacheStale,
  clearPoliticiansCache,
  getPoliticianByUrl
}; 