import { Politician } from '../types/parliament';
import * as CachePoliticiansService from './CachePoliticiansService';

export interface WatchedPolitician extends Politician {
  isWatching: boolean;
  lastUpdated: string;
}

export class WatchedPoliticiansService {
  private static instance: WatchedPoliticiansService;

  private constructor() {
    // Initialize database via CachePoliticiansService
    CachePoliticiansService.initPoliticiansDatabase();
  }

  public static getInstance(): WatchedPoliticiansService {
    if (!WatchedPoliticiansService.instance) {
      WatchedPoliticiansService.instance = new WatchedPoliticiansService();
    }
    return WatchedPoliticiansService.instance;
  }

  public async watchPolitician(politician: Politician): Promise<void> {
    try {
      console.log(`Watching politician: ${politician.name} (${politician.url})`);
      // Use CachePoliticiansService to mark as watched
      await CachePoliticiansService.watchPolitician(politician.url);
    } catch (error) {
      console.error('Error watching politician:', error);
      throw error;
    }
  }

  public async unwatchPolitician(url: string): Promise<void> {
    try {
      console.log(`Unwatching politician with URL: ${url}`);
      // Use CachePoliticiansService to mark as unwatched
      await CachePoliticiansService.unwatchPolitician(url);
    } catch (error) {
      console.error('Error unwatching politician:', error);
      throw error;
    }
  }

  public async getAllWatchedPoliticians(): Promise<Politician[]> {
    try {
      // Get watched politicians from the database
      const watchedPoliticians = await CachePoliticiansService.getWatchedPoliticians();
      console.log(`Retrieved ${watchedPoliticians.length} watched politicians`);
      return watchedPoliticians;
    } catch (error) {
      console.error('Error getting watched politicians:', error);
      return [];
    }
  }

  public async isWatchingPolitician(url: string): Promise<boolean> {
    try {
      // Check if politician is watched in the database
      return await CachePoliticiansService.isWatchingPolitician(url);
    } catch (error) {
      console.error('Error checking if watching politician:', error);
      return false;
    }
  }

  public async updateWatchStatusInList(politicians: Politician[]): Promise<Politician[]> {
    try {
      if (!politicians || politicians.length === 0) {
        return [];
      }

      console.log(`Updating watch status for ${politicians.length} politicians`);
      
      // Get all watched politician URLs in one query for efficiency
      const watchedPoliticians = await this.getAllWatchedPoliticians();
      const watchedUrls = new Set(watchedPoliticians.map(p => p.url));
      
      console.log(`Found ${watchedUrls.size} watched URLs`);
      
      // Update isWatching flag for each politician
      const updatedPoliticians = politicians.map(politician => ({
        ...politician,
        isWatching: watchedUrls.has(politician.url)
      }));
      
      // Count how many are being watched
      const watchedCount = updatedPoliticians.filter(p => p.isWatching).length;
      console.log(`${watchedCount} politicians are marked as watched`);
      
      return updatedPoliticians;
    } catch (error) {
      console.error('Error updating watch status in list:', error);
      return politicians;
    }
  }
} 