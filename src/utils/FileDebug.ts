import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export interface FileDebugInfo {
  exists: boolean;
  size?: number;
  uri: string;
  fsPath: string;
  isDirectory?: boolean;
  modificationTime?: number;
  error?: string;
}

/**
 * Get detailed information about a file for debugging purposes
 */
export async function getFileDebugInfo(uri: string): Promise<FileDebugInfo> {
  try {
    console.log(`[FileDebug] Checking file: ${uri}`);
    
    // Normalize path for FileSystem operations
    const fsPath = Platform.OS === 'ios' && uri.startsWith('file://') 
      ? uri.substring(7) 
      : uri;
    
    console.log(`[FileDebug] Normalized path: ${fsPath}`);
    
    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(fsPath, { 
      size: true,
      md5: false
    });
    
    console.log(`[FileDebug] FileSystem.getInfoAsync result:`, fileInfo);
    
    return {
      exists: fileInfo.exists,
      size: fileInfo.size,
      uri: uri,
      fsPath: fsPath,
      isDirectory: fileInfo.isDirectory,
      modificationTime: fileInfo.modificationTime,
    };
  } catch (error) {
    console.error(`[FileDebug] Error checking file:`, error);
    return {
      exists: false,
      uri: uri,
      fsPath: Platform.OS === 'ios' && uri.startsWith('file://') ? uri.substring(7) : uri,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Log PDF-specific debug information
 */
export async function debugPdfFile(uri: string): Promise<void> {
  try {
    const info = await getFileDebugInfo(uri);
    
    console.log('==================== PDF DEBUG INFO ====================');
    console.log(`URI: ${info.uri}`);
    console.log(`FileSystem path: ${info.fsPath}`);
    console.log(`Exists: ${info.exists}`);
    console.log(`Size: ${info.size || 'unknown'} bytes`);
    console.log(`Is directory: ${info.isDirectory || false}`);
    console.log(`Last modified: ${info.modificationTime || 'unknown'}`);
    
    if (info.exists && info.size && info.size > 0) {
      // Try to read first 100 bytes to check if it's a valid PDF
      try {
        // Different approach based on platform
        if (Platform.OS === 'ios') {
          const base64Header = await FileSystem.readAsStringAsync(info.fsPath, {
            encoding: FileSystem.EncodingType.Base64,
            position: 0,
            length: 100
          });
          
          const header = Buffer.from(base64Header, 'base64').toString('ascii');
          console.log(`File header: ${header.substring(0, 20)}...`);
          
          // Check if it starts with %PDF
          if (header.startsWith('%PDF-')) {
            console.log('File appears to be a valid PDF (has PDF header)');
          } else {
            console.log('WARNING: File does not appear to be a valid PDF (wrong header)');
          }
        } else {
          // For Android, just check if file is accessible
          await FileSystem.readAsStringAsync(info.fsPath, {
            encoding: FileSystem.EncodingType.UTF8,
            position: 0,
            length: 10
          });
          console.log('File is readable');
        }
      } catch (readError) {
        console.error('Error reading file header:', readError);
      }
      
      // Log where the file is stored
      console.log(`DocumentDirectory: ${FileSystem.documentDirectory}`);
      if (info.fsPath.includes(FileSystem.documentDirectory)) {
        console.log(`File is in app's document directory`);
      } else {
        console.log(`File is NOT in app's document directory`);
      }
    } else if (info.exists) {
      console.log('WARNING: File exists but is empty');
    } else {
      console.log('ERROR: File does not exist');
    }
    
    console.log('==================== END DEBUG INFO ====================');
  } catch (error) {
    console.error(`[FileDebug] Error debugging PDF:`, error);
  }
} 