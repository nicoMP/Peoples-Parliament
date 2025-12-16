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
    // await db.execAsync(`DROP TABLE bills; DROP TABLE cached_session; DROP TABLE bills_local_info; DROP TABLE bills_pdf; DROP TABLE vote_records`);
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
    await db.execAsync(
        `CREATE TABLE IF NOT EXISTS bills_local_info (
            BillId INTEGER PRIMARY KEY,
            IsLiked BOOLEAN default 0,
            IsDisliked BOOLEAN default 0,
            FOREIGN KEY (BillId) REFERENCES bills (BillId) ON DELETE CASCADE
        )`
    )
    await db.execAsync(
        `CREATE TABLE IF NOT EXISTS bills_pdf (
            BillId,
            url TEXT,
            pdf TEXT,
            version INTEGER,
            FOREIGN KEY (BillId) REFERENCES bills (BillId) ON DELETE CASCADE,
            PRIMARY KEY (BillID, version)
        )`
    )
    await db.execAsync(
        `CREATE TABLE IF NOT EXISTS vote_records (
            url TEXT PRIMARY KEY,
            number INTEGER NOT NULL,
            bill_url TEXT,
            BillId INTEGER NOT NULL,
            session TEXT NOT NULL,
            date TEXT NOT NULL,
            result TEXT NOT NULL,
            yea_total INTEGER NOT NULL,
            nay_total INTEGER NOT NULL,
            paired_total INTEGER NOT NULL,
            context_statement TEXT NOT NULL,

            -- JSON fields
            description_json TEXT NOT NULL,      -- { en: string, fr: string }
            party_votes_json TEXT NOT NULL,       -- array of party vote objects
            FOREIGN KEY (BillId) REFERENCES bills (BillId) ON DELETE CASCADE
        )`
    )
}
