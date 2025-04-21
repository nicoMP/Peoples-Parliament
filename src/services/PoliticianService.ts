import * as SQLite from 'expo-sqlite';
import { openDatabase } from '@src/utils/database';
import { Politician } from '../types/parliament';

export interface SavedPolitician {
  id: number;
  url: string;
  name: string;
  data: string;
  is_current: number;
  isWatching: number;
  isLiked: number;
  isDisliked: number;
  lastUpdated: number;
}

export class PoliticianService {
  private static instance: PoliticianService;
  private _db: SQLite.SQLiteDatabase | null = null;
  private dbInitialized: boolean = false;

  private constructor() {
    this.initDatabase();
  }

  public static getInstance(): PoliticianService {
    if (!PoliticianService.instance) {
      PoliticianService.instance = new PoliticianService();
    }
    return PoliticianService.instance;
  }

  private get db(): Promise<SQLite.SQLiteDatabase> {
    if (this._db) {
      return Promise.resolve(this._db);
    }
    
    return this.initDatabase().then(() => {
      if (!this._db) {
        throw new Error('Database failed to initialize');
      }
      return this._db;
    });
  }

  private async initDatabase(): Promise<void> {
    try {
      console.log('[PoliticianService] Initializing database...');
      this._db = await openDatabase();
      
      // Create the politicians table (single table for all data)
      await this._db.execAsync(
        `CREATE TABLE IF NOT EXISTS politicians (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          url TEXT UNIQUE,
          name TEXT NOT NULL,
          data TEXT NOT NULL,
          is_current INTEGER DEFAULT 0,
          isWatching INTEGER DEFAULT 0,
          isLiked INTEGER DEFAULT 0,
          isDisliked INTEGER DEFAULT 0,
          lastUpdated INTEGER NOT NULL
        )`
      );

      // Create indexes for efficient filtering
      await this._db.execAsync('CREATE INDEX IF NOT EXISTS idx_politician_is_current ON politicians(is_current)');
      await this._db.execAsync('CREATE INDEX IF NOT EXISTS idx_politician_isWatching ON politicians(isWatching)');
      await this._db.execAsync('CREATE INDEX IF NOT EXISTS idx_politician_isLiked ON politicians(isLiked)');
      await this._db.execAsync('CREATE INDEX IF NOT EXISTS idx_politician_isDisliked ON politicians(isDisliked)');
      
      this.dbInitialized = true;
      console.log('[PoliticianService] Database initialization complete');
    } catch (error) {
      console.error('[PoliticianService] Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Save a list of politicians to the database
   */
  public async savePoliticians(politicians: Politician[]): Promise<void> {
    try {
      if (!politicians || politicians.length === 0) {
        console.log('No politicians provided to save, skipping cache update');
        return;
      }

      console.log(`Saving ${politicians.length} politicians to cache`);
      const db = await this.db;
      
      // Start transaction for better performance
      await db.execAsync('BEGIN TRANSACTION');
      
      // Track statistics
      let inserted = 0;
      let updated = 0;
      let unchanged = 0;
      const currentTimestamp = Date.now();
      
      for (const politician of politicians) {
        if (!politician.url || !politician.name) {
          console.warn('Skipping politician with missing URL or name');
          continue;
        }
        
        // Check if politician already exists
        const existing = await db.getAllAsync<any>(
          'SELECT id, data, isWatching, isLiked, isDisliked FROM politicians WHERE url = ?',
          [politician.url]
        );
        
        const isCurrent = politician.current_riding && politician.current_party ? 1 : 0;
        
        // Preserve existing flags when updating
        let isWatching = 0;
        let isLiked = 0;
        let isDisliked = 0;
        
        // If politician exists, keep its flags
        if (existing.length > 0) {
          isWatching = existing[0].isWatching || 0;
          isLiked = existing[0].isLiked || 0;
          isDisliked = existing[0].isDisliked || 0;
          
          // Check if data has changed
          const currentData = JSON.stringify(politician);
          const storedData = existing[0].data;
          
          if (currentData === storedData) {
            // Just update the timestamp for unchanged data
            await db.runAsync(
              'UPDATE politicians SET lastUpdated = ? WHERE url = ?',
              [currentTimestamp, politician.url]
            );
            unchanged++;
            continue;
          }
          
          // Update existing politician
          await db.runAsync(
            `UPDATE politicians SET 
              name = ?, 
              data = ?, 
              is_current = ?, 
              isWatching = ?,
              isLiked = ?,
              isDisliked = ?,
              lastUpdated = ? 
             WHERE url = ?`,
            [
              politician.name,
              JSON.stringify(politician),
              isCurrent,
              isWatching,
              isLiked,
              isDisliked,
              currentTimestamp,
              politician.url
            ]
          );
          updated++;
        } else {
          // Insert new politician
          await db.runAsync(
            `INSERT INTO politicians 
              (url, name, data, is_current, isWatching, isLiked, isDisliked, lastUpdated) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              politician.url,
              politician.name,
              JSON.stringify(politician),
              isCurrent,
              isWatching,
              isLiked,
              isDisliked,
              currentTimestamp
            ]
          );
          inserted++;
        }
      }
      
      // Commit transaction
      await db.execAsync('COMMIT');
      console.log(`Cache updated: ${inserted} inserted, ${updated} updated, ${unchanged} unchanged out of ${politicians.length} total`);
    } catch (error) {
      // Rollback transaction on error
      const db = await this.db;
      await db.execAsync('ROLLBACK');
      console.error('Error saving politicians to cache:', error);
    }
  }

  /**
   * Get all politicians from the database
   */
  public async getAllPoliticians(currentOnly: boolean = false): Promise<Politician[]> {
    try {
      const db = await this.db;
      let query = 'SELECT data FROM politicians';
      const params: any[] = [];
      
      // Filter for current politicians if requested
      if (currentOnly) {
        query += ' WHERE is_current = 1';
      }
      
      // Add ORDER BY to ensure consistent results
      query += ' ORDER BY name';
      
      const result = await db.getAllAsync<{ data: string }>(query, params);
      console.log(`Retrieved ${result.length} politicians from database`);
      
      if (result.length === 0) {
        return [];
      }
      
      // Parse JSON data
      return result.map(row => JSON.parse(row.data) as Politician);
    } catch (error) {
      console.error('Error getting politicians from database:', error);
      return [];
    }
  }

  /**
   * Update fields like watch status, like status, etc. based on user interactions
   */
  public async updatePoliticianStatus(
    url: string,
    updates: {
      isWatching?: boolean;
      isLiked?: boolean;
      isDisliked?: boolean;
    }
  ): Promise<void> {
    try {
      const db = await this.db;
      
      // Get current values first
      const current = await db.getAllAsync<SavedPolitician>('SELECT * FROM politicians WHERE url = ?', [url]);
      
      if (current.length === 0) {
        console.error(`Politician with URL ${url} not found`);
        return;
      }
      
      // Build the SET clause and parameters dynamically
      const setClause: string[] = [];
      const params: any[] = [];
      
      if (updates.isWatching !== undefined) {
        setClause.push('isWatching = ?');
        params.push(updates.isWatching ? 1 : 0);
      }
      
      if (updates.isLiked !== undefined) {
        setClause.push('isLiked = ?');
        params.push(updates.isLiked ? 1 : 0);
        
        // If liking, ensure not disliked
        if (updates.isLiked) {
          setClause.push('isDisliked = 0');
        }
      }
      
      if (updates.isDisliked !== undefined) {
        setClause.push('isDisliked = ?');
        params.push(updates.isDisliked ? 1 : 0);
        
        // If disliking, ensure not liked
        if (updates.isDisliked) {
          setClause.push('isLiked = 0');
        }
      }
      
      // Add URL parameter
      params.push(url);
      
      // Execute the update
      await db.runAsync(
        `UPDATE politicians SET ${setClause.join(', ')} WHERE url = ?`,
        params
      );
      
      console.log(`Updated politician status for ${url}`);
    } catch (error) {
      console.error('Error updating politician status:', error);
      throw error;
    }
  }

  /**
   * Toggle watching a politician
   */
  public async toggleWatch(url: string): Promise<boolean> {
    try {
      const db = await this.db;
      
      // Get current watch status
      const current = await db.getAllAsync<{ isWatching: number }>(
        'SELECT isWatching FROM politicians WHERE url = ?',
        [url]
      );
      
      if (current.length === 0) {
        console.error(`Politician with URL ${url} not found`);
        return false;
      }
      
      const isCurrentlyWatched = current[0].isWatching === 1;
      const newWatchStatus = !isCurrentlyWatched;
      
      // Update watch status
      await db.runAsync(
        'UPDATE politicians SET isWatching = ? WHERE url = ?',
        [newWatchStatus ? 1 : 0, url]
      );
      
      console.log(`Politician ${url} is now ${newWatchStatus ? 'watched' : 'unwatched'}`);
      return newWatchStatus;
    } catch (error) {
      console.error('Error toggling watch status:', error);
      throw error;
    }
  }
  
  /**
   * Like a politician
   */
  public async likePolitician(url: string): Promise<void> {
    await this.updatePoliticianStatus(url, { isLiked: true, isDisliked: false });
  }
  
  /**
   * Disike a politician
   */
  public async dislikePolitician(url: string): Promise<void> {
    await this.updatePoliticianStatus(url, { isLiked: false, isDisliked: true });
  }
  
  /**
   * Clear like/dislike status
   */
  public async clearLikeStatus(url: string): Promise<void> {
    await this.updatePoliticianStatus(url, { isLiked: false, isDisliked: false });
  }
  
  /**
   * Get all watched politicians
   */
  public async getWatchedPoliticians(): Promise<Politician[]> {
    try {
      const db = await this.db;
      const result = await db.getAllAsync<{ data: string }>(
        'SELECT data FROM politicians WHERE isWatching = 1 ORDER BY name'
      );
      
      if (result.length === 0) {
        return [];
      }
      
      // Parse JSON data and include isWatching flag
      return result.map(row => {
        const politician = JSON.parse(row.data) as Politician;
        return {
          ...politician,
          isWatching: true
        };
      });
    } catch (error) {
      console.error('Error getting watched politicians:', error);
      return [];
    }
  }
  
  /**
   * Get all liked politicians
   */
  public async getLikedPoliticians(): Promise<Politician[]> {
    try {
      const db = await this.db;
      const result = await db.getAllAsync<{ data: string }>(
        'SELECT data FROM politicians WHERE isLiked = 1 ORDER BY name'
      );
      
      if (result.length === 0) {
        return [];
      }
      
      // Parse JSON data and include isLiked flag
      return result.map(row => {
        const politician = JSON.parse(row.data) as Politician;
        return {
          ...politician,
          isLiked: true
        };
      });
    } catch (error) {
      console.error('Error getting liked politicians:', error);
      return [];
    }
  }
  
  /**
   * Check if cache is stale
   */
  public async isCacheStale(maxAge: number = 24 * 60 * 60 * 1000): Promise<boolean> {
    try {
      const db = await this.db;
      const result = await db.getAllAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM politicians WHERE lastUpdated > ?',
        [Date.now() - maxAge]
      );
      
      // Also check if we have a reasonable number of politicians
      const totalCount = await db.getAllAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM politicians'
      );
      
      // Consider cache stale if we have fewer than 100 politicians
      const hasEnoughPoliticians = totalCount[0]?.count >= 100;
      
      return result[0]?.count === 0 || !hasEnoughPoliticians;
    } catch (error) {
      console.error('Error checking politicians cache:', error);
      return true; // Consider cache stale if there's an error
    }
  }
  
  /**
   * Update watch/like/dislike status for a list of politicians
   */
  public async updateStatusInList(politicians: Politician[]): Promise<Politician[]> {
    try {
      if (!politicians || politicians.length === 0) {
        return [];
      }
      
      const db = await this.db;
      
      // Extract URLs
      const urls = politicians.map(p => p.url);
      
      // Create placeholders for IN clause
      const placeholders = urls.map(() => '?').join(',');
      
      // Fetch status for all politicians in one query
      const statuses = await db.getAllAsync<{ 
        url: string;
        isWatching: number;
        isLiked: number;
        isDisliked: number;
      }>(
        `SELECT url, isWatching, isLiked, isDisliked 
         FROM politicians 
         WHERE url IN (${placeholders})`,
        urls
      );
      
      // Create a map for fast lookups
      const statusMap = new Map<string, {
        isWatching: number;
        isLiked: number;
        isDisliked: number;
      }>();
      
      statuses.forEach(status => {
        statusMap.set(status.url, {
          isWatching: status.isWatching,
          isLiked: status.isLiked,
          isDisliked: status.isDisliked
        });
      });
      
      // Update the politicians with their status
      return politicians.map(politician => {
        const status = statusMap.get(politician.url);
        return {
          ...politician,
          isWatching: status?.isWatching === 1,
          isLiked: status?.isLiked === 1,
          isDisliked: status?.isDisliked === 1
        };
      });
    } catch (error) {
      console.error('Error updating status in politician list:', error);
      return politicians; // Return original list on error
    }
  }
  
  /**
   * Clear the entire cache
   */
  public async clearCache(): Promise<void> {
    try {
      const db = await this.db;
      await db.runAsync('DELETE FROM politicians');
      console.log('Politicians cache cleared');
    } catch (error) {
      console.error('Error clearing politicians cache:', error);
    }
  }
} 