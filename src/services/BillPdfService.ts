import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as SQLite from 'expo-sqlite';
import { openDatabase } from '@src/utils/database';
import { ApiBill } from '@src/types/bill';

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
  private db: any;
  
  private constructor() {
    this.initDatabase();
  }

  public static getInstance(): BillPdfService {
    if (!BillPdfService.instance) {
      BillPdfService.instance = new BillPdfService();
    }
    return BillPdfService.instance;
  }

  private async initDatabase(): Promise<void> {
    this.db = await openDatabase();
    
    // Create the saved_bills table
    await this.db.execAsync(
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
      const columns = await this.db.getAllAsync('PRAGMA table_info(saved_bills)');
      const columnNames = columns.map((col: any) => col.name);
      
      if (!columnNames.includes('isLiked')) {
        await this.db.execAsync('ALTER TABLE saved_bills ADD COLUMN isLiked INTEGER DEFAULT 0');
      }
      
      if (!columnNames.includes('isDisliked')) {
        await this.db.execAsync('ALTER TABLE saved_bills ADD COLUMN isDisliked INTEGER DEFAULT 0');
      }

      if (!columnNames.includes('pdfMissing')) {
        await this.db.execAsync('ALTER TABLE saved_bills ADD COLUMN pdfMissing INTEGER DEFAULT 0');
      }
    } catch (error) {
      console.error('Error updating database schema:', error);
    }
  }

  public getBillPdfUrl(parliament: string, session: string, billNumber: string): string {
    // Old format: https://www.parl.ca/Content/Bills/${parliament + session}/Private/${billNumber}/${billNumber}_1/${billNumber}_1.PDF
    // New format: https://www.parl.ca/legisinfo/en/bill/${parliament}-${session}/${billNumber.toLowerCase()}/first-reading
    
    // Determine the bill type based on the bill number
    return `https://www.parl.ca/Content/Bills/${parliament + "" + session}/Private/S-291/S-291_1/S-291_1.PDF`;
  }

  private getBillLocalPath(parliament: string, session: string, billNumber: string): string {
    return `${FileSystem.documentDirectory}bills/${parliament}-${session}-${billNumber}.pdf`;
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
      // Create bills directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}bills`);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}bills`, { intermediates: true });
      }
      
      // Generate the PDF URL directly
      const pdfUrl = this.getBillPdfUrl(parliament, session, billNumber);
      console.log('Attempting to download PDF from:', pdfUrl);
      
      const localPath = this.getBillLocalPath(parliament, session, billNumber);
      
      // Try to download the PDF
      let pdfMissing = 0;
      try {
        const download = await FileSystem.downloadAsync(pdfUrl, localPath);
        
        if (download.status !== 200) {
          // The primary PDF URL failed, try the fallback
          pdfMissing = 1; 
        }
      } catch (dlError) {
        console.log('Primary PDF download failed, marking as missing:', dlError);
        pdfMissing = 1;
        
        // Create empty placeholder file
        await FileSystem.writeAsStringAsync(localPath, '', { encoding: FileSystem.EncodingType.UTF8 });
      }
      
      // Save the bill record even if PDF is missing
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
      
      console.log('Bill saved at:', localPath, pdfMissing ? '(PDF not found)' : '');
      return localPath;
    } catch (error) {
      console.error('Error downloading bill PDF:', error);
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
    await this.db.runAsync(
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
    await this.db.runAsync(
      `UPDATE saved_bills SET isLiked = ?, isDisliked = ? 
       WHERE parliament = ? AND session = ? AND billNumber = ?`,
      [isLiked ? 1 : 0, isDisliked ? 1 : 0, parliament, session, billNumber]
    );
  }

  public async getAllSavedBills(): Promise<SavedBill[]> {
    const bills = await this.db.getAllAsync('SELECT * FROM saved_bills ORDER BY lastUpdated DESC');
    return bills as SavedBill[];
  }

  public async getWatchedBills(): Promise<SavedBill[]> {
    const bills = await this.db.getAllAsync('SELECT * FROM saved_bills WHERE isWatching = 1 ORDER BY lastUpdated DESC');
    return bills as SavedBill[];
  }

  public async getLikedBills(): Promise<SavedBill[]> {
    const bills = await this.db.getAllAsync('SELECT * FROM saved_bills WHERE isLiked = 1 ORDER BY lastUpdated DESC');
    return bills as SavedBill[];
  }

  public async getDislikedBills(): Promise<SavedBill[]> {
    const bills = await this.db.getAllAsync('SELECT * FROM saved_bills WHERE isDisliked = 1 ORDER BY lastUpdated DESC');
    return bills as SavedBill[];
  }

  public async watchBill(parliament: string, session: string, billNumber: string): Promise<void> {
    await this.db.runAsync(
      'UPDATE saved_bills SET isWatching = 1 WHERE parliament = ? AND session = ? AND billNumber = ?',
      [parliament, session, billNumber]
    );
  }

  public async unwatchBill(parliament: string, session: string, billNumber: string): Promise<void> {
    await this.db.runAsync(
      'UPDATE saved_bills SET isWatching = 0 WHERE parliament = ? AND session = ? AND billNumber = ?',
      [parliament, session, billNumber]
    );
  }

  public async deleteBill(parliament: string, session: string, billNumber: string): Promise<void> {
    try {
      const localPath = this.getBillLocalPath(parliament, session, billNumber);
      
      // Delete the file
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(localPath);
      }
      
      // Remove from database
      await this.db.runAsync(
        'DELETE FROM saved_bills WHERE parliament = ? AND session = ? AND billNumber = ?',
        [parliament, session, billNumber]
      );
    } catch (error) {
      console.error('Error deleting bill:', error);
      throw error;
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