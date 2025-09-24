import * as SQLite from 'expo-sqlite';

// Singleton database connection
let db: SQLite.SQLiteDatabase | null = null;

export function getDb() {
    if (!db) {
        db = SQLite.openDatabaseSync('app.db');
    }
    return db;
}

export async function initDb() {
    const db = getDb();
    await db.execAsync(
        `CREATE TABLE IF NOT EXISTS bills (
        SearchScore REAL,
        BillId INTEGER PRIMARY KEY,
        BillNumberPrefix TEXT,
        BillNumber INTEGER,
        BillNumberSuffix TEXT,
        BillNumberFormatted TEXT,
        LongTitleEn TEXT,
        LongTitleFr TEXT,
        ShortTitleEn TEXT,
        ShortTitleFr TEXT,
        LatestBillMilestoneId INTEGER,
        LatestCompletedMajorStageEn TEXT,
        LatestCompletedMajorStageFr TEXT,
        LatestCompletedMajorStageChamberId INTEGER,
        DidReinstateFromPreviousSession BOOLEAN,
        PassedHouseFirstReadingDateTime TEXT,
        PassedHouseSecondReadingDateTime TEXT,
        PassedHouseThirdReadingDateTime TEXT,
        PassedSenateFirstReadingDateTime TEXT,
        PassedSenateSecondReadingDateTime TEXT,
        PassedSenateThirdReadingDateTime TEXT,
        ReceivedRoyalAssentDateTime TEXT,
        ParlSessionCode TEXT,
        ParlSessionEn TEXT,
        ParlSessionFr TEXT,
        ParliamentNumber INTEGER,
        SessionNumber INTEGER,
        OriginatingChamberId INTEGER,
        BillTypeId INTEGER,
        BillTypeEn TEXT,
        BillTypeFr TEXT,
        CurrentStatusId INTEGER,
        CurrentStatusEn TEXT,
        CurrentStatusFr TEXT,
        MinistryId INTEGER,
        SponsorId INTEGER,
        SponsorEn TEXT,
        SponsorFr TEXT,
        PoliticalAffiliationId INTEGER,
        IsFromCurrentSession BOOLEAN,
        Highlight TEXT,
        LatestBillTextTypeId INTEGER,
        LatestActivityEn TEXT,
        LatestActivityFr TEXT,
        LatestActivityDateTime TEXT
      );`
    );
    await db.execAsync(
        `CREATE TABLE IF NOT EXISTS cached_session (
            parliament INTEGER,
            session INTEGER,
            updated_on INTEGER DEFAULT (unixepoch()),
            PRIMARY KEY (parliament, session)
        )`
    )

}
