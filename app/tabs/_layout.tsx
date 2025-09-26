import BillHeader from '@/src/components/BillHeader';
import { BillProvider } from '@/src/contexts/BillContext';
import { SessionProvider } from '@/src/contexts/SessionContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { SQLiteDatabase, SQLiteProvider } from 'expo-sqlite';

export default function TabLayout() {
  const createBillTable = async (db: SQLiteDatabase) => {
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
        );
        CREATE TABLE IF NOT EXISTS loaded_sessions (
          parliament INTEGER,
          session INTEGER,
          loadedOn DATE,
          PRIMARY KEY (parliament, session)
        );
        `
    );
  }
  return (
    <SQLiteProvider databaseName='parliament.db' onInit={createBillTable}>
      <BillProvider>        
        <SessionProvider>
          <Tabs screenOptions={{ tabBarActiveTintColor: 'blue' }}>
            <Tabs.Screen
              name="bills"
              options={{
                title: 'Bills',
                tabBarIcon: ({ color }) => <FontAwesome size={20} name="file-text-o" color={color} />,
                header: () => <BillHeader />
              }}
            />
            <Tabs.Screen
              name="politicians"
              options={{
                title: 'Politicians',
                tabBarIcon: ({ color }) => <FontAwesome size={20} name="user-o" color={color} />,
              }}
            />
          </Tabs>
        </SessionProvider>
      </BillProvider>
    </SQLiteProvider>
  );
}
