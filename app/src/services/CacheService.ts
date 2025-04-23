import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';

// Open the database
const db = SQLite.openDatabaseSync('parliament_cache.db');

// Create cache directories if they don't exist
const setupCacheDirectories = async () => {
  const imageCacheDir = `${FileSystem.cacheDirectory}image_cache/`;
  
  // Check if directories exist, create if they don't
  const imagesDirInfo = await FileSystem.getInfoAsync(imageCacheDir);
  if (!imagesDirInfo.exists) {
    await FileSystem.makeDirectoryAsync(imageCacheDir, { intermediates: true });
  }
  
  return { imageCacheDir };
};

interface CacheItem<T> {
  key: string;
  data: T;
  timestamp: number;
  category: string;
}

interface ImageCacheInfo {
  localUri: string;
  remoteUri: string;
  timestamp: number;
}

class CacheService {
  private static instance: CacheService;
  private imageCacheDir: string = '';
  private imageMetadataTable: string = 'image_cache_metadata';

  private constructor() {
    this.initializeDatabase();
    this.initializeDirectories();
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  private async initializeDirectories() {
    const { imageCacheDir } = await setupCacheDirectories();
    this.imageCacheDir = imageCacheDir;
  }

  private async initializeDatabase(): Promise<void> {
    try {
      // Create the cache table if it doesn't exist
      await db.runAsync(`
        CREATE TABLE IF NOT EXISTS cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cache_key TEXT UNIQUE,
          data TEXT,
          category TEXT,
          timestamp INTEGER
        );
      `);
      
      // Create image cache metadata table
      await db.runAsync(`
        CREATE TABLE IF NOT EXISTS ${this.imageMetadataTable} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          image_key TEXT UNIQUE,
          remote_uri TEXT,
          local_uri TEXT,
          category TEXT,
          timestamp INTEGER
        );
      `);
      
      // Create index for faster lookups
      await db.runAsync('CREATE INDEX IF NOT EXISTS idx_cache_key ON cache (cache_key);');
      await db.runAsync('CREATE INDEX IF NOT EXISTS idx_category ON cache (category);');
      await db.runAsync(`CREATE INDEX IF NOT EXISTS idx_image_key ON ${this.imageMetadataTable} (image_key);`);
      
      console.log('Cache database initialized');
    } catch (error) {
      console.error('Error initializing cache database:', error);
    }
  }

  /**
   * Saves data to the cache
   * 
   * @param key Unique identifier for this cache item
   * @param data The data to cache
   * @param category Category the data belongs to (e.g., 'politicians', 'bills')
   */
  async saveToCache<T>(key: string, data: T, category: string): Promise<void> {
    try {
      const timestamp = Date.now();
      const jsonData = JSON.stringify(data);
      
      await db.runAsync(
        'INSERT OR REPLACE INTO cache (cache_key, data, category, timestamp) VALUES (?, ?, ?, ?)',
        [key, jsonData, category, timestamp]
      );
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }

  /**
   * Retrieves data from the cache if it exists and is not expired
   * 
   * @param key The key to look up
   * @param maxAge Maximum age in milliseconds before the cache is considered stale
   * @returns The cached data or null if not found or expired
   */
  async getFromCache<T>(key: string, maxAge: number): Promise<T | null> {
    try {
      const now = Date.now();
      const result = await db.getAllAsync<{ data: string; timestamp: number }>(
        'SELECT data, timestamp FROM cache WHERE cache_key = ?',
        [key]
      );
      
      if (result.length === 0) {
        return null;
      }
      
      const { data, timestamp } = result[0];
      
      // Check if the cache is still valid
      if (now - timestamp > maxAge) {
        console.log(`Cache for ${key} has expired`);
        return null;
      }
      
      return JSON.parse(data) as T;
    } catch (error) {
      console.error('Error getting from cache:', error);
      return null;
    }
  }

  /**
   * Generates a hash key for an image URL
   * 
   * @param url The image URL
   * @returns A hash string to use as a key
   */
  private async generateImageKey(url: string): Promise<string> {
    // Generate a hash of the URL to use as filename
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      url
    );
    return hash.substring(0, 16); // Use first 16 chars of hash
  }

  /**
   * Downloads and caches an image
   * 
   * @param imageUrl The URL of the image to cache
   * @param category Category for organizing cached images (e.g., 'politician_avatars')
   * @returns The local URI where the image is stored
   */
  async cacheImage(imageUrl: string, category: string = 'images'): Promise<string | null> {
    if (!imageUrl) return null;
    
    try {
      // Clean up URL and ensure it's valid
      const cleanUrl = imageUrl.trim().replace(/\s/g, '');
      if (!cleanUrl.startsWith('http')) {
        return null;
      }
      
      // Generate a key for this image
      const imageKey = await this.generateImageKey(cleanUrl);
      const localFilename = `${this.imageCacheDir}${imageKey}.jpg`;
      
      // Check if we already have this image cached
      const existingImage = await this.getImageFromCache(imageKey);
      if (existingImage) {
        console.log(`Using cached image for ${cleanUrl}`);
        return existingImage.localUri;
      }
      
      // Download the image
      console.log(`Downloading image from ${cleanUrl}`);
      
      try {
        const downloadResult = await FileSystem.downloadAsync(
          cleanUrl,
          localFilename
        );
        
        if (downloadResult.status === 200) {
          // Store metadata about this cached image
          await db.runAsync(
            `INSERT OR REPLACE INTO ${this.imageMetadataTable} 
             (image_key, remote_uri, local_uri, category, timestamp) 
             VALUES (?, ?, ?, ?, ?)`,
            [imageKey, cleanUrl, localFilename, category, Date.now()]
          );
          
          return localFilename;
        } else {
          console.error(`Failed to download image: ${downloadResult.status}`);
          return null;
        }
      } catch (downloadError) {
        console.error('Download error:', downloadError);
        
        // If the image doesn't exist, we'll mark this URL as failed in our cache
        // with a special flag so we don't keep trying to download it
        await db.runAsync(
          `INSERT OR REPLACE INTO ${this.imageMetadataTable} 
           (image_key, remote_uri, local_uri, category, timestamp) 
           VALUES (?, ?, ?, ?, ?)`,
          [imageKey, cleanUrl, 'failed_download', category, Date.now()]
        );
        
        return null;
      }
    } catch (error) {
      console.error('Error caching image:', error);
      return null;
    }
  }

  /**
   * Get a cached image if it exists
   * 
   * @param imageKey The key for the image
   * @param maxAge Maximum age in milliseconds before the cache is considered stale
   * @returns The image cache info or null if not found
   */
  async getImageFromCache(imageKey: string, maxAge?: number): Promise<ImageCacheInfo | null> {
    try {
      const result = await db.getAllAsync<{ 
        local_uri: string; 
        remote_uri: string;
        timestamp: number 
      }>(
        `SELECT local_uri, remote_uri, timestamp FROM ${this.imageMetadataTable} WHERE image_key = ?`,
        [imageKey]
      );
      
      if (result.length === 0) {
        return null;
      }
      
      const { local_uri, remote_uri, timestamp } = result[0];
      
      // Check if this is a marked failed download
      if (local_uri === 'failed_download') {
        // If the failed download is recent (less than a day old), don't retry
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          return null;
        }
        // Otherwise, clear this entry so we can try again
        await this.clearImageCache(imageKey);
        return null;
      }
      
      // Check if the cache is still valid (if maxAge is provided)
      if (maxAge && Date.now() - timestamp > maxAge) {
        console.log(`Cached image ${imageKey} has expired`);
        return null;
      }
      
      // Check if the file still exists
      const fileInfo = await FileSystem.getInfoAsync(local_uri);
      if (!fileInfo.exists) {
        // File doesn't exist anymore, remove from database
        await this.clearImageCache(imageKey);
        return null;
      }
      
      return { 
        localUri: local_uri, 
        remoteUri: remote_uri,
        timestamp 
      };
    } catch (error) {
      console.error('Error getting image from cache:', error);
      return null;
    }
  }

  /**
   * Get the local URI for a cached image by its remote URL
   * 
   * @param remoteUrl The remote URL of the image
   * @param maxAge Maximum age in milliseconds before the cache is considered stale
   * @returns The local URI or null if not found
   */
  async getImageByUrl(remoteUrl: string, maxAge?: number): Promise<string | null> {
    try {
      if (!remoteUrl) return null;
      
      // Generate the key from URL
      const imageKey = await this.generateImageKey(remoteUrl);
      const cachedImage = await this.getImageFromCache(imageKey, maxAge);
      
      return cachedImage ? cachedImage.localUri : null;
    } catch (error) {
      console.error('Error getting image by URL:', error);
      return null;
    }
  }

  /**
   * Check if an image URL is already cached and download it if not
   * 
   * @param imageUrl Remote URL of the image
   * @param category Category for the image
   * @param maxAge Maximum age for cached images
   * @returns Local URI of the cached image or null
   */
  async ensureImageCached(imageUrl: string, category: string = 'images', maxAge?: number): Promise<string | null> {
    if (!imageUrl) return null;
    
    try {
      // Clean the URL
      const cleanUrl = imageUrl.trim().replace(/\s/g, '');
      if (!cleanUrl.startsWith('http')) {
        return null;
      }
      
      // First check if we already have it
      const imageKey = await this.generateImageKey(cleanUrl);
      const cachedImage = await this.getImageFromCache(imageKey, maxAge);
      
      if (cachedImage) {
        return cachedImage.localUri;
      }
      
      // If not, download and cache it
      return await this.cacheImage(cleanUrl, category);
    } catch (error) {
      console.error('Error ensuring image is cached:', error);
      return null;
    }
  }

  /**
   * Clear a specific image from cache
   * 
   * @param imageKey The key for the image to clear
   */
  async clearImageCache(imageKey: string): Promise<void> {
    try {
      // Get the file path
      const result = await db.getAllAsync<{ local_uri: string }>(
        `SELECT local_uri FROM ${this.imageMetadataTable} WHERE image_key = ?`,
        [imageKey]
      );
      
      if (result.length > 0) {
        const localUri = result[0].local_uri;
        
        // Delete the file
        await FileSystem.deleteAsync(localUri, { idempotent: true });
        
        // Remove from database
        await db.runAsync(
          `DELETE FROM ${this.imageMetadataTable} WHERE image_key = ?`,
          [imageKey]
        );
      }
    } catch (error) {
      console.error(`Error clearing image cache for ${imageKey}:`, error);
    }
  }

  /**
   * Clears all cached data for a specific category
   * 
   * @param category The category to clear
   */
  async clearCategoryCache(category: string): Promise<void> {
    try {
      await db.runAsync('DELETE FROM cache WHERE category = ?', [category]);
    } catch (error) {
      console.error(`Error clearing cache for category ${category}:`, error);
    }
  }

  /**
   * Clears all cached images for a specific category
   * 
   * @param category The category to clear
   */
  async clearCategoryImageCache(category: string): Promise<void> {
    try {
      // Get all images in this category
      const images = await db.getAllAsync<{ image_key: string; local_uri: string }>(
        `SELECT image_key, local_uri FROM ${this.imageMetadataTable} WHERE category = ?`,
        [category]
      );
      
      // Delete each file
      for (const image of images) {
        await FileSystem.deleteAsync(image.local_uri, { idempotent: true });
      }
      
      // Remove from database
      await db.runAsync(
        `DELETE FROM ${this.imageMetadataTable} WHERE category = ?`,
        [category]
      );
    } catch (error) {
      console.error(`Error clearing image cache for category ${category}:`, error);
    }
  }

  /**
   * Clears a specific cache item
   * 
   * @param key The key to clear
   */
  async clearCacheItem(key: string): Promise<void> {
    try {
      await db.runAsync('DELETE FROM cache WHERE cache_key = ?', [key]);
    } catch (error) {
      console.error(`Error clearing cache for key ${key}:`, error);
    }
  }

  /**
   * Clears all cached data older than the specified time
   * 
   * @param maxAge Maximum age in milliseconds before cache is cleared
   */
  async clearOldCache(maxAge: number): Promise<void> {
    try {
      const timestamp = Date.now() - maxAge;
      await db.runAsync('DELETE FROM cache WHERE timestamp < ?', [timestamp]);
    } catch (error) {
      console.error('Error clearing old cache:', error);
    }
  }

  /**
   * Clears all cached images older than the specified time
   * 
   * @param maxAge Maximum age in milliseconds before images are cleared
   */
  async clearOldImageCache(maxAge: number): Promise<void> {
    try {
      const timestamp = Date.now() - maxAge;
      
      // Get all old images
      const oldImages = await db.getAllAsync<{ image_key: string; local_uri: string }>(
        `SELECT image_key, local_uri FROM ${this.imageMetadataTable} WHERE timestamp < ?`,
        [timestamp]
      );
      
      // Delete each file
      for (const image of oldImages) {
        await FileSystem.deleteAsync(image.local_uri, { idempotent: true });
      }
      
      // Remove from database
      await db.runAsync(
        `DELETE FROM ${this.imageMetadataTable} WHERE timestamp < ?`,
        [timestamp]
      );
    } catch (error) {
      console.error('Error clearing old image cache:', error);
    }
  }

  /**
   * Gets the timestamp for when a cache item was last updated
   * 
   * @param key The cache key
   * @returns Timestamp or null if not found
   */
  async getCacheTimestamp(key: string): Promise<number | null> {
    try {
      const result = await db.getAllAsync<{ timestamp: number }>(
        'SELECT timestamp FROM cache WHERE cache_key = ?',
        [key]
      );
      
      if (result.length === 0) {
        return null;
      }
      
      return result[0].timestamp;
    } catch (error) {
      console.error('Error getting cache timestamp:', error);
      return null;
    }
  }
}

export default CacheService; 