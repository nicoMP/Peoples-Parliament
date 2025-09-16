import BillCard from '@/src/components/BillCard';
import { useSession } from '@/src/contexts/SessionContext';
import { BillDetails, BillService } from '@/src/services/BillService';
import { getDb } from '@/src/services/database';
import { OpenParliamentService } from '@/src/services/OpenParliamentService';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

const billService = new BillService();
const openParliamentService = new OpenParliamentService();

export default function Bills() {
  const [bills, setBills] = useState<BillDetails[]>([]);
  const [hasMorePages, setHasMorePages] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true); // For initial fetch
  const [isLoadingMore, setIsLoadingMore] = useState(false);     // For pagination
  const [error, setError] = useState<string | null>(null);
  const { session, parliament } = useSession();
  const db = getDb();
  const fetchBills = async () => {
    setIsLoadingInitial(true);
    setError(null);
    try {
      await billService.getBillsBySession(parliament, session);
      const _bills: BillDetails[] = await db.getAllAsync(`SELECT * FROM bills WHERE ParliamentNumber = ? AND SessionNumber = ?`, [parliament, session])
      setBills(_bills);
    } catch (e) {
      console.error('Initial fetch error:', e);
      setError('Failed to load initial bills.');
    } finally {
      setIsLoadingInitial(false);
    }
  };
  useEffect(() => {
    fetchBills();
  }, [parliament, session]); // Empty dependency array for initial fetch

  const handleBillCardPress = (billItem: BillDetails) => {
    console.log('Bill item touched:', billItem);
    // You can also navigate to a detail screen here, etc.
  };

  if (isLoadingInitial) {
    return (
      <View style={styles.container}>
        <Text>Loading initial bills...</Text>
        {/* Or a proper ActivityIndicator */}
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={{ color: 'red' }}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={bills}
        renderItem={({ item }) => (
          <BillCard
            BillId={item.BillId}
            BillNumberFormatted={item.BillNumberFormatted}
            BillTypeEn={item.BillTypeEn}
            LongTitleEn={item.LongTitleEn}
            ParlSessionEn={item.ParlSessionEn}
            SponsorEn={item.SponsorEn}
            CurrentStatusEn={item.CurrentStatusEn}
            LatestCompletedMajorStageEn={item.LatestCompletedMajorStageEn}
            PassedHouseFirstReadingDateTime={item.PassedHouseFirstReadingDateTime}
            PassedHouseSecondReadingDateTime={item.PassedHouseSecondReadingDateTime}
            PassedHouseThirdReadingDateTime={item.PassedHouseThirdReadingDateTime}
            PassedSenateFirstReadingDateTime={item.PassedSenateFirstReadingDateTime}
            PassedSenateSecondReadingDateTime={item.PassedSenateSecondReadingDateTime}
            PassedSenateThirdReadingDateTime={item.PassedSenateThirdReadingDateTime}
            onPressCard={() => handleBillCardPress(item)}
          ></BillCard>
        )}
        keyExtractor={(item) => item.BillId.toString()} // Ensure unique keys, use ID if available
        onEndReachedThreshold={0.7}
        ListFooterComponent={() => isLoadingMore ? <Text style={{ textAlign: 'center', padding: 10 }}>Loading more...</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
