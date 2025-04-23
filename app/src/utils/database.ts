import * as SQLite from 'expo-sqlite';

export function openDatabase() {
  return SQLite.openDatabaseAsync('parliament_bills.db');
} 