import BillCard from '@components/BillCard';
import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  Dimensions,
  StyleSheet,
  View,
  FlatList,
  ActivityIndicator,
  TextInput,
  Text,
} from 'react-native';
import BillNavigationBar from './BillNavigationBar';
import { ApiBill } from '@src/types/bill';
import { MaterialIcons } from '@expo/vector-icons';
import Dropdown from '@components/Dropdown';
import { BillFilterService, SearchType, RoyalAssentFilter, SortBy } from '@services/filters/BillFilterService';
import { SEARCH_TYPES, DATE_FILTERS } from '@services/filters/FilterConstants';

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
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const handleSearchTextChange = useCallback((text: string) => {
    setSearchText(text);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      // Force a re-render of the filtered bills
      setBills(prev => [...prev]);
    }, 300);
  }, []);

  const filteredBills = useMemo(() => {
    const filterService = BillFilterService.getInstance();
    return filterService.filterBills(bills, {
      searchText: searchText.trim(),
      searchType,
      royalAssentFilter,
      lastInteractionDays: dateFilter === 'all' ? undefined : parseInt(dateFilter),
      sortBy,
    });
  }, [bills, searchText, searchType, royalAssentFilter, dateFilter, sortBy]);

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
      <BillNavigationBar
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
      />
      <View style={styles.listWrapper}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <MaterialIcons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search bills..."
              value={searchText}
              onChangeText={handleSearchTextChange}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="default"
              returnKeyType="search"
            />
          </View>
          <View style={styles.dateFilterContainer}>
            <Dropdown
              label=""
              options={DATE_FILTERS.map(filter => filter.label)}
              selectedValue={DATE_FILTERS.find(f => f.value === dateFilter)?.label || 'All time'}
              onSelect={(label) => {
                const filter = DATE_FILTERS.find(f => f.label === label)?.value || 'all';
                setDateFilter(filter);
              }}
              textColor="#b22234"
            />
          </View>
        </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    paddingVertical: 4,
  },
  dateFilterContainer: {
    minWidth: 120,
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
});