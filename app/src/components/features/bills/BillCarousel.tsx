import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Dimensions,
  StyleSheet,
  View,
  FlatList,
  ActivityIndicator,
  TextInput,
  Text,
  TouchableOpacity,
  Modal,
  Keyboard,
  Platform,
} from 'react-native';
import BillFilterBar from './BillFilterBar';
import { ApiBill } from '@/app/src/types/bill';
import { MaterialIcons } from '@expo/vector-icons';
import { BillFilterService, SearchType, RoyalAssentFilter, SortBy, DateField } from '@/app/src/services/filters/BillFilterService';
import BillCard from '../../BillCard';

const { width } = Dimensions.get('window');
const PAGE_SIZE = 10;
const BILL_CARD_WIDTH = width * 0.8;

export default function BillCarousel() {
  const [bills, setBills] = useState<ApiBill[]>([]);
  const [parliament, setParliament] = useState<string>('44');
  const [session, setSession] = useState<string>('1');
  const [loading, setLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>('');
  const [searchType, setSearchType] = useState<SearchType>('default');
  const [royalAssentFilter, setRoyalAssentFilter] = useState<RoyalAssentFilter>('both');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [pickerMode, setPickerMode] = useState<'start' | 'end'>('start');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [dateField, setDateField] = useState<DateField>('LatestActivityDateTime');
  const [dateSortOrder, setDateSortOrder] = useState<'asc' | 'desc'>('desc');
  const [likedFilter, setLikedFilter] = useState<boolean | undefined>(undefined);
  const [watchedFilter, setWatchedFilter] = useState<boolean | undefined>(undefined);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const isInitialMount = useRef(true);

  // Handle parliament or session changes - this will trigger the BillFilterBar to reload data
  useEffect(() => {
    // Skip on initial mount since BillFilterBar will load data automatically
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    console.log(`Parliament or session changed to ${parliament}-${session}, refreshing bills...`);
    
    // Clear current bills
    setBills([]);
    
    // Set loading state to trigger BillFilterBar's load mechanism
    setLoading(true);
    
    // No need to call any other methods here - the BillFilterBar component will handle 
    // the loading through its own useEffect hooks and the onLoadingChange callback
  }, [parliament, session]);

  const handleSearchTextChange = useCallback((text: string) => {
    setSearchText(text);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setBills(prev => [...prev]);
    }, 300);
  }, []);

  const handleDateRangeChange = useCallback((newStartDate?: Date, newEndDate?: Date) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    setDateFilter('custom');
  }, []);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      if (pickerMode === 'start') {
        setStartDate(selectedDate);
        setPickerMode('end');
      } else {
        setEndDate(selectedDate);
        setShowDatePicker(false);
        setDateFilter('custom');
      }
    } else {
      setShowDatePicker(false);
    }
  };

  const formatDateRange = () => {
    if (!startDate && !endDate) return 'All time';
    if (!startDate) return `Until ${endDate?.toLocaleDateString()}`;
    if (!endDate) return `From ${startDate?.toLocaleDateString()}`;
    return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  };

  const handleDateFilterChange = useCallback((filter: string) => {
    setDateFilter(filter);
  }, []);

  const handleDateFieldChange = useCallback((field: string) => {
    setDateField(field as DateField);
    setSortBy('date');
  }, []);

  const handleDateSortChange = useCallback((order: 'asc' | 'desc') => {
    setDateSortOrder(order);
  }, []);

  const filteredBills = useMemo(() => {
    const filterService = BillFilterService.getInstance();
    const lastInteractionDays = dateFilter === 'all' ? undefined : 
                              dateFilter === 'custom' ? undefined : 
                              parseInt(dateFilter);
    
    return filterService.filterBills(bills, {
      searchText: searchText.trim(),
      searchType,
      royalAssentFilter,
      lastInteractionDays,
      startDate,
      endDate,
      sortBy,
      dateField,
      liked: likedFilter,
      watched: watchedFilter,
      sortOrder: dateSortOrder
    });
  }, [bills, searchText, searchType, royalAssentFilter, dateFilter, startDate, endDate, sortBy, dateField, dateSortOrder, likedFilter, watchedFilter]);

  const renderItem = useCallback(({ item }: { item: ApiBill }) => (
    <View style={styles.cardContainer}>
      <BillCard
        BillId={item.BillId}
        BillNumberFormatted={item.BillNumberFormatted}
        LongTitleEn={item.LongTitleEn}
        ParlSessionEn={item.ParlSessionEn}
        SponsorEn={item.SponsorEn}
        BillTypeEn={item.BillTypeEn}
        CurrentStatusEn={item.CurrentStatusEn}
        LatestCompletedMajorStageEn={item.LatestCompletedMajorStageEn}
        PassedHouseFirstReadingDateTime={item.PassedHouseFirstReadingDateTime}
        PassedHouseSecondReadingDateTime={item.PassedHouseSecondReadingDateTime}
        PassedHouseThirdReadingDateTime={item.PassedHouseThirdReadingDateTime}
        PassedSenateFirstReadingDateTime={item.PassedSenateFirstReadingDateTime}
        PassedSenateSecondReadingDateTime={item.PassedSenateSecondReadingDateTime}
        PassedSenateThirdReadingDateTime={item.PassedSenateThirdReadingDateTime}
        ReceivedRoyalAssentDateTime={item.ReceivedRoyalAssentDateTime}
        number={item.BillNumberFormatted}
        session={item.ParlSessionCode}
      />
    </View>
  ), []);

  const keyExtractor = useCallback((item: ApiBill) => item.BillId.toString(), []);

  const renderFooter = useCallback(() => {
    if (loading) {
      return <ActivityIndicator size="large" color="#b22234" />;
    }
    return null;
  }, [loading]);

  const renderEmpty = useCallback(() => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="search-off" size={48} color="#666" />
        <Text style={styles.emptyText}>No bills found matching your criteria</Text>
      </View>
    );
  }, [loading]);

  return (
    <View style={styles.container}>
      <BillFilterBar
        parliament={parliament}
        session={session}
        onParliamentChange={setParliament}
        onSessionChange={setSession}
        onBillsChange={setBills}
        onLoadingChange={setLoading}
        searchType={searchType}
        onSearchTypeChange={setSearchType}
        royalAssentFilter={royalAssentFilter}
        onRoyalAssentFilterChange={setRoyalAssentFilter}
        onDateRangeChange={handleDateRangeChange}
        searchText={searchText}
        onSearchTextChange={handleSearchTextChange}
        dateFilter={dateFilter}
        onDateFilterChange={handleDateFilterChange}
        onDateFieldChange={handleDateFieldChange}
        onDateSortChange={handleDateSortChange}
        allowEmptySelection={false}
      />
      <View style={styles.listWrapper}>
        <FlatList
          data={filteredBills}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          initialNumToRender={5}
          windowSize={3}
          removeClippedSubviews={true}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => Keyboard.dismiss()}
          onTouchStart={() => Keyboard.dismiss()}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4',
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    paddingTop: 12,
  },
  cardContainer: {
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    minHeight: 200,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
  },
});