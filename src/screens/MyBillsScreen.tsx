import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { BillPdfService, SavedBill } from '@src/services/BillPdfService';
import SavedBillCard from '@src/components/SavedBillCard';
import { useFocusEffect } from '@react-navigation/native';
import BillFilterBar from '@src/components/features/bills/BillFilterBar';
import { BillFilterService, StatusFilter, DateField, SortBy } from '@src/services/filters/BillFilterService';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MyBillsScreen() {
  const [bills, setBills] = useState<SavedBill[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [dateField, setDateField] = useState<DateField>('LatestActivityDateTime');
  const [dateSortOrder, setDateSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const pdfService = BillPdfService.getInstance();
  const filterService = BillFilterService.getInstance();

  const loadBills = async () => {
    try {
      setLoading(true);
      const savedBills = await pdfService.getAllSavedBills();
      setBills(savedBills);
    } catch (error) {
      console.error('Error loading bills:', error);
      Alert.alert('Error', 'Failed to load saved bills.');
    } finally {
      setLoading(false);
    }
  };

  // Filter bills using the shared service
  const filteredBills = useMemo(() => {
    const lastInteractionDays = dateFilter === 'all' ? undefined : 
                              dateFilter === 'custom' ? undefined : 
                              parseInt(dateFilter);
    
    return filterService.filterSavedBills(bills, {
      searchText,
      statusFilter,
      startDate,
      endDate,
      lastInteractionDays,
      sortBy,
      dateField,
      sortOrder: dateSortOrder
    });
  }, [bills, searchText, statusFilter, dateFilter, startDate, endDate, sortBy, dateField, dateSortOrder]);

  // Load bills when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadBills();
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBills();
    setRefreshing(false);
  };

  const handleToggleWatch = async (bill: SavedBill) => {
    try {
      if (bill.isWatching) {
        await pdfService.unwatchBill(bill.parliament, bill.session, bill.billNumber);
      } else {
        await pdfService.watchBill(bill.parliament, bill.session, bill.billNumber);
      }
      // Refresh the list
      loadBills();
    } catch (error) {
      console.error('Error toggling watch status:', error);
      Alert.alert('Error', 'Failed to update bill watch status.');
    }
  };

  const handleLikeChange = async (bill: SavedBill, liked: boolean) => {
    try {
      await pdfService.updateBillLikeStatus(
        bill.parliament, 
        bill.session, 
        bill.billNumber, 
        liked, 
        false
      );
      loadBills();
    } catch (error) {
      console.error('Error updating like status:', error);
      Alert.alert('Error', 'Failed to update like status.');
    }
  };

  const handleDislikeChange = async (bill: SavedBill, disliked: boolean) => {
    try {
      await pdfService.updateBillLikeStatus(
        bill.parliament, 
        bill.session, 
        bill.billNumber, 
        false, 
        disliked
      );
      loadBills();
    } catch (error) {
      console.error('Error updating dislike status:', error);
      Alert.alert('Error', 'Failed to update dislike status.');
    }
  };

  const handleDelete = async (bill: SavedBill) => {
    Alert.alert(
      'Delete Bill',
      `Are you sure you want to delete ${bill.billNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await pdfService.deleteBill(bill.parliament, bill.session, bill.billNumber);
              // Refresh the list
              loadBills();
            } catch (error) {
              console.error('Error deleting bill:', error);
              Alert.alert('Error', 'Failed to delete bill.');
            }
          },
        },
      ]
    );
  };

  const handleDateRangeChange = (newStartDate?: Date, newEndDate?: Date) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    setDateFilter('custom');
  };

  const handleDateFieldChange = useCallback((field: string) => {
    setDateField(field as DateField);
    setSortBy('date'); // When changing date field, set sort mode to date
  }, []);

  const handleDateSortChange = useCallback((order: 'asc' | 'desc') => {
    setDateSortOrder(order);
  }, []);

  const renderItem = ({ item }: { item: SavedBill }) => (
    <SavedBillCard
      bill={item}
      onToggleWatch={() => handleToggleWatch(item)}
      onDelete={() => handleDelete(item)}
      onLikeChange={(liked) => handleLikeChange(item, liked)}
      onDislikeChange={(disliked) => handleDislikeChange(item, disliked)}
    />
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No saved bills found</Text>
        <Text style={styles.emptySubtext}>
          Bills you save will appear here for offline access
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: StatusBar.currentHeight || 0 }]}>
      <BillFilterBar 
        onBillsChange={() => {}}
        onLoadingChange={() => {}}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        onDateRangeChange={handleDateRangeChange}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        showStatusFilter={true}
        onDateFieldChange={handleDateFieldChange}
        onDateSortChange={handleDateSortChange}
        disableSafeArea={true}
      />

      <FlatList
        data={filteredBills}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.parliament}-${item.session}-${item.billNumber}`}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
      {loading && !refreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 