import { BillBySessionResponse, BillService } from '@/src/services/BillService';
import { OpenParliamentService } from '@/src/services/OpenParliamentService';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

const billService = new BillService();
const openParliamentService = new OpenParliamentService();

export default function Bills() {
  const [bills, setBills] = useState<BillBySessionResponse[]>([]);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true); // For initial fetch
  const [isLoadingMore, setIsLoadingMore] = useState(false);     // For pagination
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialBills = async () => {
      setIsLoadingInitial(true);
      setError(null);
      try {
        const fetchedBills = await billService.getBillsBySession('45-1');
        setBills(fetchedBills.objects);
        setNextUrl(fetchedBills.pagination.next_url);
      } catch (e) {
        console.error('Initial fetch error:', e);
        setError('Failed to load initial bills.');
      } finally {
        setIsLoadingInitial(false);
      }
    };
    fetchInitialBills();
  }, []); // Empty dependency array for initial fetch

  const loadMoreBills = async () => {
    if (!nextUrl || isLoadingMore) return; // Prevent multiple simultaneous fetches
    setIsLoadingMore(true);
    try {
      const fetchedBills = await openParliamentService.fetchNextPaginated<BillBySessionResponse>(nextUrl);
      if (fetchedBills?.objects) {
        setBills(prevBills => [...prevBills, ...fetchedBills.objects]);
        setNextUrl(fetchedBills.pagination.next_url);
      }
    } catch (e) {
        console.error('Loading additonal error:', e);
      setError('Failed to load more bills.');
    } finally {
      setIsLoadingMore(false);
    }
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
          <View style={{ padding: 20 }}>
            <Text>{item.name.en}</Text>
          </View>
        )}
        keyExtractor={(item, index) => item.number || `bill-${index}`} // Ensure unique keys, use ID if available
        onEndReachedThreshold={0.5}
        onEndReached={loadMoreBills}
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
