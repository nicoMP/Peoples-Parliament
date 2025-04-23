import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as SQLite from 'expo-sqlite';
import { openDatabase } from '@/app/src/utils/database';
import { ApiBill } from '@/app/src/types/bill';

export interface SavedBill {
  id: number;
  parliament: string;
  session: string;
  billNumber: string;
  billType: string;
  title: string;
  lastUpdated: string;
  pdfPath: string;
  isWatching: number;
  isLiked: number;
  isDisliked: number;
  pdfMissing: number;
}

export class BillPdfService {
  private static instance: BillPdfService;
  private _db: any;
  private dbInitializing: Promise<void>;
  private dbInitialized: boolean = false;
  
  private constructor() {
    this.dbInitializing = this.initDatabase();
  }

  public static getInstance(): BillPdfService {
    if (!BillPdfService.instance) {
      BillPdfService.instance = new BillPdfService();
    }
    return BillPdfService.instance;
  }

  private async initDatabase(): Promise<void> {
    try {
      console.log('[BillPdfService] Initializing database...');
      this._db = await openDatabase();
      
      // Create the saved_bills table
      await this._db.execAsync(
        `CREATE TABLE IF NOT EXISTS saved_bills (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          parliament TEXT NOT NULL,
          session TEXT NOT NULL,
          billNumber TEXT NOT NULL,
          billType TEXT NOT NULL, 
          title TEXT NOT NULL,
          lastUpdated TEXT NOT NULL,
          pdfPath TEXT NOT NULL,
          isWatching INTEGER DEFAULT 0,
          isLiked INTEGER DEFAULT 0,
          isDisliked INTEGER DEFAULT 0,
          pdfMissing INTEGER DEFAULT 0,
          UNIQUE(parliament, session, billNumber)
        )`
      );

      // Check if we need to alter the table to add the new columns
      try {
        const columns = await this._db.getAllAsync('PRAGMA table_info(saved_bills)');
        const columnNames = columns.map((col: any) => col.name);
        
        if (!columnNames.includes('isLiked')) {
          await this._db.execAsync('ALTER TABLE saved_bills ADD COLUMN isLiked INTEGER DEFAULT 0');
        }
        
        if (!columnNames.includes('isDisliked')) {
          await this._db.execAsync('ALTER TABLE saved_bills ADD COLUMN isDisliked INTEGER DEFAULT 0');
        }

        if (!columnNames.includes('pdfMissing')) {
          await this._db.execAsync('ALTER TABLE saved_bills ADD COLUMN pdfMissing INTEGER DEFAULT 0');
        }
      } catch (error) {
        console.error('[BillPdfService] Error updating database schema:', error);
      }
      
      this.dbInitialized = true;
      console.log('[BillPdfService] Database initialization complete');
    } catch (error) {
      console.error('[BillPdfService] Database initialization failed:', error);
      throw error;
    }
  }

  // Create a getter for the database that ensures initialization
  private get db(): Promise<any> {
    const getDb = async () => {
      if (!this.dbInitialized) {
        console.log('[BillPdfService] Waiting for database initialization...');
        await this.dbInitializing;
      }
      return this._db;
    };
    
    return getDb();
  }

  public getBillPdfUrl(session: string, billNumber: string, version: number = 1, chamber: string = 'Government'): string {
    // Format URL: https://www.parl.ca/Content/Bills/[session]/[chamber]/[billNumber]/[billNumber]_[version]/[billNumber]_[version].PDF
    const pdfUrl = `https://www.parl.ca/Content/Bills/${session}/${chamber}/${billNumber}/${billNumber}_${version}/${billNumber}_${version}.PDF`;
    
    console.log(`[BillPdfService] Generated PDF URL for bill ${session}-${billNumber} (v${version}, ${chamber}): ${pdfUrl}`);
    return pdfUrl;
  }

  private getBillLocalPath(parliament: string, session: string, billNumber: string, version: number = 1, chamber: string = 'Government'): string {
    const localPath = `${FileSystem.documentDirectory}bills/${parliament}-${session}-${billNumber}_v${version}_${chamber}.pdf`;
    console.log(`[BillPdfService] Local PDF path for ${parliament}-${session}-${billNumber} (v${version}, ${chamber}): ${localPath}`);
    return localPath;
  }

  /**
   * Gets the local file path for a saved bill PDF
   */
  public async getBillPdfPath(parliament: string, session: string, billNumber: string): Promise<string | null> {
    try {
      const db = await this.db;
      
      // Check the database first to get the exact path with version and chamber
      const bill = await db.getFirstAsync(
        'SELECT * FROM saved_bills WHERE parliament = ? AND session = ? AND billNumber = ?',
        [parliament, session, billNumber]
      ) as SavedBill | null;
      
      if (bill && bill.pdfPath) {
        const fileInfo = await FileSystem.getInfoAsync(bill.pdfPath);
        if (fileInfo.exists) {
          return bill.pdfPath;
        }
      }
      
      // If not in database or the file doesn't exist, try all possible filenames
      const versions = [4, 3, 2, 1];
      const chambers = ['Government', 'Private'];
      
      for (const version of versions) {
        for (const chamber of chambers) {
          const localPath = this.getBillLocalPath(parliament, session, billNumber, version, chamber);
          const fileInfo = await FileSystem.getInfoAsync(localPath);
          if (fileInfo.exists) {
            return localPath;
          }
        }
      }
      
      // If we get here, we couldn't find any matching file
      return null;
    } catch (error) {
      console.error('Error getting bill PDF path:', error);
      return null;
    }
  }

  /**
   * Try to find the highest version of the PDF that exists
   * Will try both Government and Private chambers and versions 1-4
   */
  public async findBestPdfVersion(session: string, billNumber: string): Promise<{url: string, version: number, chamber: string} | null> {
    const chambers = ['Government', 'Private'];
    const maxVersion = 4;
    let bestVersion = 0;
    let bestChamber = '';
    let bestUrl = '';
    
    console.log(`[BillPdfService] Searching for best PDF version for ${session}-${billNumber}`);
    
    for (const chamber of chambers) {
      for (let version = maxVersion; version >= 1; version--) {
        const url = this.getBillPdfUrl(session, billNumber, version, chamber);
        
        try {
          console.log(`[BillPdfService] Testing URL: ${url}`);
          const headResponse = await FileSystem.downloadAsync(
            url, 
            FileSystem.cacheDirectory + 'temp.pdf',
            { headers: { 'Range': 'bytes=0-0' } }
          );
          
          console.log(`[BillPdfService] Test result: ${headResponse.status} for v${version} (${chamber})`);
          
          if (headResponse.status === 200 || headResponse.status === 206) {
            // We found a working version, and since we're going from highest to lowest,
            // we can use this one if it's better than what we had
            if (version > bestVersion) {
              bestVersion = version;
              bestChamber = chamber;
              bestUrl = url;
              console.log(`[BillPdfService] Found better version: v${version} (${chamber})`);
            }
            
            // If we found a version 4, no need to keep looking in this chamber
            if (version === maxVersion) {
              break;
            }
          }
        } catch (error) {
          console.log(`[BillPdfService] Error testing URL ${url}: ${error}`);
          // Continue to next URL
        }
      }
      
      // If we found any working version in this chamber, no need to try the other chamber
      if (bestVersion > 0) {
        break;
      }
    }
    
    if (bestVersion > 0) {
      console.log(`[BillPdfService] Best PDF version found: v${bestVersion} (${bestChamber})`);
      return { url: bestUrl, version: bestVersion, chamber: bestChamber };
    } else {
      console.log(`[BillPdfService] No working PDF version found for ${session}-${billNumber}`);
      return null;
    }
  }

  public async downloadBillPdf(
    parliament: string, 
    session: string, 
    billNumber: string, 
    title: string, 
    billType: string, 
    lastUpdated: string,
    isLiked: number = 0,
    isDisliked: number = 0
  ): Promise<string> {
    try {
      const db = await this.db;
      console.log(`[BillPdfService] Starting download for bill ${parliament}-${session}-${billNumber}`);
      
      // Create bills directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}bills`);
      if (!dirInfo.exists) {
        console.log(`[BillPdfService] Creating bills directory at ${FileSystem.documentDirectory}bills`);
        await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}bills`, { intermediates: true });
      }
      
      // Find the best PDF version
      const sessionNoHyphen = session.replace("-", "");
      const bestVersion = await this.findBestPdfVersion(sessionNoHyphen, billNumber);
      
      // Try to download the PDF
      let pdfMissing = 0;
      let version = 1;
      let chamber = 'Government';
      let localPath = '';
      
      if (bestVersion) {
        // Update the version and chamber to match the found PDF
        version = bestVersion.version;
        chamber = bestVersion.chamber;
        localPath = this.getBillLocalPath(parliament, session, billNumber, version, chamber);
        
        console.log(`[BillPdfService] Found best version: v${version} (${chamber})`);
        console.log(`[BillPdfService] Downloading from ${bestVersion.url} to ${localPath}`);
        
        try {
          const download = await FileSystem.downloadAsync(bestVersion.url, localPath);
          
          console.log(`[BillPdfService] Download result: status ${download.status}, size: ${download.headers["Content-Length"] || "unknown"}`);
          
          if (download.status !== 200) {
            console.log(`[BillPdfService] Download failed with status ${download.status}`);
            pdfMissing = 1; 
          }
        } catch (dlError) {
          console.error(`[BillPdfService] PDF download failed:`, dlError);
          pdfMissing = 1;
        }
      } else {
        console.log(`[BillPdfService] No working PDF URL found for ${billNumber}`);
        pdfMissing = 1;
        // Use default path with version 1 and Government chamber
        localPath = this.getBillLocalPath(parliament, session, billNumber, version, chamber);
      }
      
      // If we couldn't download, create an empty placeholder
      if (pdfMissing) {
        console.log(`[BillPdfService] Creating empty placeholder file at ${localPath}`);
        await FileSystem.writeAsStringAsync(localPath, '', { encoding: FileSystem.EncodingType.UTF8 });
      }
      
      // Save metadata for the version and chamber used
      const versionInfo = `v${version} (${chamber})`;
      
      // Save the bill record even if PDF is missing
      console.log(`[BillPdfService] Saving bill record to database: ${parliament}-${session}-${billNumber}, PDF missing: ${pdfMissing === 1 ? 'Yes' : 'No'}`);
      await this.saveBillRecord(
        parliament, 
        session, 
        billNumber, 
        title, 
        billType, 
        lastUpdated, 
        localPath, 
        isLiked, 
        isDisliked, 
        pdfMissing
      );
      
      console.log(`[BillPdfService] Bill saved at: ${localPath}${pdfMissing ? ' (PDF not found)' : ''}`);
      return localPath;
    } catch (error) {
      console.error('[BillPdfService] Error downloading bill PDF:', error);
      throw error;
    }
  }

  private async saveBillRecord(
    parliament: string, 
    session: string, 
    billNumber: string, 
    title: string, 
    billType: string, 
    lastUpdated: string, 
    pdfPath: string,
    isLiked: number = 0,
    isDisliked: number = 0,
    pdfMissing: number = 0
  ): Promise<void> {
    const db = await this.db;
    await db.runAsync(
      `INSERT OR REPLACE INTO saved_bills 
       (parliament, session, billNumber, billType, title, lastUpdated, pdfPath, isLiked, isDisliked, pdfMissing) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [parliament, session, billNumber, title, billType, lastUpdated, pdfPath, isLiked, isDisliked, pdfMissing]
    );
  }

  public async updateBillLikeStatus(
    parliament: string, 
    session: string, 
    billNumber: string, 
    isLiked: boolean, 
    isDisliked: boolean
  ): Promise<void> {
    const db = await this.db;
    await db.runAsync(
      `UPDATE saved_bills SET isLiked = ?, isDisliked = ? 
       WHERE parliament = ? AND session = ? AND billNumber = ?`,
      [isLiked ? 1 : 0, isDisliked ? 1 : 0, parliament, session, billNumber]
    );
  }

  public async getAllSavedBills(): Promise<SavedBill[]> {
    const db = await this.db;
    const bills = await db.getAllAsync('SELECT * FROM saved_bills ORDER BY lastUpdated DESC');
    return bills as SavedBill[];
  }

  public async getWatchedBills(): Promise<SavedBill[]> {
    const db = await this.db;
    const bills = await db.getAllAsync('SELECT * FROM saved_bills WHERE isWatching = 1 ORDER BY lastUpdated DESC');
    return bills as SavedBill[];
  }

  public async getLikedBills(): Promise<SavedBill[]> {
    const db = await this.db;
    const bills = await db.getAllAsync('SELECT * FROM saved_bills WHERE isLiked = 1 ORDER BY lastUpdated DESC');
    return bills as SavedBill[];
  }

  public async getDislikedBills(): Promise<SavedBill[]> {
    const db = await this.db;
    const bills = await db.getAllAsync('SELECT * FROM saved_bills WHERE isDisliked = 1 ORDER BY lastUpdated DESC');
    return bills as SavedBill[];
  }

  public async watchBill(parliament: string, session: string, billNumber: string): Promise<void> {
    const db = await this.db;
    await db.runAsync(
      'UPDATE saved_bills SET isWatching = 1 WHERE parliament = ? AND session = ? AND billNumber = ?',
      [parliament, session, billNumber]
    );
  }

  public async unwatchBill(parliament: string, session: string, billNumber: string): Promise<void> {
    const db = await this.db;
    await db.runAsync(
      'UPDATE saved_bills SET isWatching = 0 WHERE parliament = ? AND session = ? AND billNumber = ?',
      [parliament, session, billNumber]
    );
  }

  public async deleteBill(parliament: string, session: string, billNumber: string): Promise<void> {
    try {
      const db = await this.db;
      console.log(`[BillPdfService] Deleting bill ${parliament}-${session}-${billNumber}`);
      
      // Get the path from the database
      const bill = await db.getFirstAsync(
        'SELECT * FROM saved_bills WHERE parliament = ? AND session = ? AND billNumber = ?',
        [parliament, session, billNumber]
      ) as SavedBill | null;
      
      if (bill && bill.pdfPath) {
        // Try to delete the file using the stored path first
        const fileInfo = await FileSystem.getInfoAsync(bill.pdfPath);
        if (fileInfo.exists) {
          console.log(`[BillPdfService] Deleting PDF file at ${bill.pdfPath}`);
          await FileSystem.deleteAsync(bill.pdfPath);
        }
      } else {
        // If no path in database, try all possible filenames
        const versions = [4, 3, 2, 1];
        const chambers = ['Government', 'Private'];
        
        for (const version of versions) {
          for (const chamber of chambers) {
            const localPath = this.getBillLocalPath(parliament, session, billNumber, version, chamber);
            const fileInfo = await FileSystem.getInfoAsync(localPath);
            if (fileInfo.exists) {
              console.log(`[BillPdfService] Deleting PDF file at ${localPath}`);
              await FileSystem.deleteAsync(localPath);
              // We can break after finding and deleting one file
              break;
            }
          }
        }
      }
      
      // Remove from database
      console.log(`[BillPdfService] Removing bill from database: ${parliament}-${session}-${billNumber}`);
      await db.runAsync(
        'DELETE FROM saved_bills WHERE parliament = ? AND session = ? AND billNumber = ?',
        [parliament, session, billNumber]
      );
      
      console.log(`[BillPdfService] Bill successfully deleted: ${parliament}-${session}-${billNumber}`);
    } catch (error) {
      console.error('[BillPdfService] Error deleting bill:', error);
      throw error;
    }
  }

  /**
   * View PDF in the internal app viewer
   * Note: This is a helper method that doesn't actually navigate,
   * but returns the necessary information for the component to navigate
   */
  public async getPdfViewerParams(parliament: string, session: string, billNumber: string): Promise<{uri: string, title: string} | null> {
    try {
      const db = await this.db;
      const pdfPath = await this.getBillPdfPath(parliament, session, billNumber);
      
      if (!pdfPath) {
        throw new Error('PDF file not found');
      }
      
      // Verify file exists and has content
      const fileInfo = await FileSystem.getInfoAsync(pdfPath, { size: true });
      if (!fileInfo.exists) {
        throw new Error('PDF file not found');
      }
      if (fileInfo.size === 0) {
        throw new Error('PDF file is empty');
      }
      
      console.log(`[BillPdfService] PDF exists at path: ${pdfPath}, size: ${fileInfo.size} bytes`);
      
      // Get bill info to create title
      const bill = await db.getFirstAsync(
        'SELECT * FROM saved_bills WHERE parliament = ? AND session = ? AND billNumber = ?',
        [parliament, session, billNumber]
      ) as SavedBill | null;
      
      if (!bill) {
        throw new Error('Bill information not found');
      }
      
      // Extract version and chamber from the filename if available
      let versionInfo = '';
      if (pdfPath.includes('_v')) {
        const parts = pdfPath.split('_v')[1].split('.pdf')[0].split('_');
        if (parts.length >= 2) {
          versionInfo = ` (v${parts[0]}, ${parts[1]})`;
        }
      }
      
      // Make sure the URI is properly formatted
      // On iOS, the URI needs to start with file://
      // On Android, the file:// prefix may cause issues with some components
      let uri = pdfPath;
      if (Platform.OS === 'ios' && !uri.startsWith('file://')) {
        uri = `file://${pdfPath}`;
      }
      
      console.log(`[BillPdfService] Prepared PDF params: URI=${uri}, title=${bill.billNumber}${versionInfo}`);
      
      return {
        uri: uri,
        title: `${bill.billNumber}${versionInfo} - ${bill.title}`
      };
    } catch (error) {
      console.error('Error preparing PDF for viewing:', error);
      return null;
    }
  }

  public async openPdf(pdfPath: string, pdfMissing: number): Promise<void> {
    try {
      if (pdfMissing) {
        throw new Error('PDF file is not available for this bill');
      }
      
      if (Platform.OS === 'ios') {
        await Sharing.shareAsync(pdfPath);
      } else {
        // For Android, use FileSystem.StorageAccessFramework to open the PDF
        // This is a simplified approach - for production, you'd want a more robust solution
        await Sharing.shareAsync(pdfPath);
      }
    } catch (error) {
      console.error('Error opening PDF:', error);
      throw error;
    }
  }
}