import BillCard from '@/src/components/BillCard';
import { useBills } from '@/src/contexts/BillContext';
import { useSession } from '@/src/contexts/SessionContext';
import { BillService, IBillData } from '@/src/services/BillService';
import { getDb } from '@/src/services/database';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

const billService = new BillService();

export default function Bills() {
  const { bills, setBills } = useBills();
  const [isLoadingBills, setIsLoadingBills] = useState(true); // For initial fetch
  const [error, setError] = useState<string | null>(null);
  const { session, parliament } = useSession();
  const fetchBills = async () => {
    setIsLoadingBills(true);
    setError(null);
    try {
      await billService.getBillsBySession(parliament, session);
      const _bills: IBillData[] = await billService.getBillsDataBySession(parliament, session)
      setBills(_bills);
    } catch (e) {
      console.error('Initial fetch error:', e);
      setError('Failed to load initial bills.');
    } finally {
      setIsLoadingBills(false);
    }
  };
  useEffect(() => {
    fetchBills();
  }, [parliament, session]); // Empty dependency array for initial fetch

  const handleBillCardPress = (billItem: IBillData) => {
    console.log('Bill item touched:', billItem);
    // You can also navigate to a detail screen here, etc.
  };

  if (isLoadingBills) {
    return (
      <View style={styles.container}>
        <Text>Loading initial bills ({parliament}-{session})...</Text>
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

  if (!isLoadingBills && bills.length === 0) {
    return (
      <View style={styles.container}>
        <Text>No bills Found for {parliament}-{session}</Text>
        {/* Or a proper ActivityIndicator */}
      </View>
    );
  }


  return (
    <View style={styles.container}>
      <FlatList
        data={bills}
        renderItem={({ item }) => (
          <BillCard
            bill={item}
            onPressCard={() => handleBillCardPress(item)}
          ></BillCard>
        )}
        keyExtractor={(item) => item.BillId.toString()} // Ensure unique keys, use ID if available
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
