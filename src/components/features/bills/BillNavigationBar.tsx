import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Modal, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Dropdown, { DropdownOption } from '@components/Dropdown';
import Sessions from '@constants/Sessions.json';
import axios from 'axios';
import { baseParliamentUrl } from '@constants/constants';
import { initDatabase, saveBills, getBills, clearOldData, getSessions, saveSessions } from '@services/database';
import { ApiBill } from '@src/types/bill';
import { SearchType, RoyalAssentFilter, BillFilterOptions, StatusFilter } from '@services/filters/BillFilterService';
import { SEARCH_TYPES } from '@services/filters/FilterConstants';
import DateFilterModal from '../../modals/DateFilterModal';
import SearchBar from '../common/SearchBar';
import { FilterIndicatorService } from '@services/filters/FilterIndicatorService';

// Interface for status filter items with proper icon type
interface StatusFilterItem {
  label: string;
  value: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color?: string;
}

// Constants for status filters with icons
const STATUS_FILTERS: DropdownOption[] = [
  { label: 'All Bills', value: 'all', icon: 'list', iconColor: '#666' },
  { label: 'Liked', value: 'liked', icon: 'thumb-up', iconColor: '#4CAF50' },
  { label: 'Disliked', value: 'disliked', icon: 'thumb-down', iconColor: '#F44336' },
  { label: 'Saved', value: 'saved', icon: 'save', iconColor: '#007AFF' },
  { label: 'Watching', value: 'watching', icon: 'visibility', iconColor: '#FF9800' },
];

// Constants for royal assent filters with icons
const RA_FILTERS: DropdownOption[] = [
  { label: 'All Bills', value: 'both', icon: 'stars', iconColor: '#666' },
  { label: 'With Royal Assent', value: 'in_progress', icon: 'check-circle', iconColor: '#4CAF50' },
  { label: 'Without Royal Assent', value: 'none', icon: 'cancel', iconColor: '#F44336' },
];

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

interface BillNavigationBarProps {
  parliament: string;
  session: string;
  onParliamentChange: (value: string) => void;
  onSessionChange: (value: string) => void;
  onBillsChange: (bills: ApiBill[] | ((prev: ApiBill[]) => ApiBill[])) => void;
  onLoadingChange: (loading: boolean) => void;
  searchType?: SearchType;
  onSearchTypeChange?: (type: SearchType) => void;
  royalAssentFilter?: RoyalAssentFilter;
  onRoyalAssentFilterChange?: (filter: RoyalAssentFilter) => void;
  onDateRangeChange?: (startDate?: Date, endDate?: Date) => void;
  searchText?: string;
  onSearchTextChange?: (text: string) => void;
  dateFilter?: string;
  onDateFilterChange?: (filter: string) => void;
  onDateFieldChange?: (field: string) => void;
  onDateSortChange?: (order: 'asc' | 'desc') => void;
  statusFilter?: StatusFilter;
  onStatusFilterChange?: (filter: StatusFilter) => void;
  showStatusFilter?: boolean;
  disableSafeArea?: boolean;
}

export default function BillNavigationBar({
  parliament,
  session,
  onParliamentChange,
  onSessionChange,
  onBillsChange,
  onLoadingChange,
  searchType = 'default',
  onSearchTypeChange = () => {},
  royalAssentFilter = 'both',
  onRoyalAssentFilterChange = () => {},
  onDateRangeChange = () => {},
  searchText = '',
  onSearchTextChange = () => {},
  dateFilter = 'all',
  onDateFilterChange = () => {},
  onDateFieldChange = () => {},
  onDateSortChange = () => {},
  statusFilter = 'all',
  onStatusFilterChange = () => {},
  showStatusFilter = false,
  disableSafeArea = false,
}: BillNavigationBarProps) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [sessionDates, setSessionDates] = useState<Readonly<{ startDate: string; endDate: string }> | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [selectedDateField, setSelectedDateField] = useState<string>('LastUpdatedDateTime');
  const [dateSortOrder, setDateSortOrder] = useState<'asc' | 'desc'>('desc');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const filterIndicatorService = useMemo(() => FilterIndicatorService.getInstance(), []);

  const parliaments = useMemo(() => Sessions.parliaments.map((p) => p.parliament.toString()), []);
  const selectedParliamentSessions = useMemo(() => {
    return Sessions.parliaments.find((p) => p.parliament.toString() === parliament)?.sessions || [];
  }, [parliament]);

  const fetchBills = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && !hasMore) return;
    onLoadingChange(true);

    try {
      if (!forceRefresh) {
        const cachedBills = await getBills(parseInt(parliament), parseInt(session));
        if (cachedBills.length > 0) {
          onBillsChange(cachedBills as ApiBill[]);
          onLoadingChange(false);
          return;
        }
      }

      if (forceRefresh) {
        await clearOldData();
      }

      const params = {
        parliament: parseInt(parliament),
        session: parseInt(session),
        page,
        pageSize: 10,
        lang: 'en',
        parlsession: `${parliament}-${session}`
      };

      const response = await axios.get<ApiBill[]>(baseParliamentUrl, { params });

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid response format from API');
      }

      const newBills = response.data;
      saveBills(newBills);
      
      onBillsChange((prev: ApiBill[]) => {
        const uniqueNewBills = newBills.filter(
          (newBill) => !prev.some((existingBill) => existingBill.BillId === newBill.BillId)
        );
        return [...prev, ...uniqueNewBills];
      });

      setHasMore(newBills.length === 10);
    } catch (error) {
      console.error('Failed to fetch bills:', error);
      onBillsChange([]);
    } finally {
      onLoadingChange(false);
      setRefreshing(false);
    }
  }, [parliament, session, page, onBillsChange, onLoadingChange]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    onBillsChange([]);
    fetchBills(true);
  }, [fetchBills, onBillsChange]);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    onBillsChange([]);
  }, [parliament, session, onBillsChange]);

  useEffect(() => {
    fetchBills();
  }, [page, fetchBills]);

  useEffect(() => {
    const loadSessionDates = () => {
      const selectedSession = Sessions.parliaments
        .find(p => p.parliament.toString() === parliament)
        ?.sessions.find(s => s.session.toString() === session);
      
      if (selectedSession) {
        setSessionDates(Object.freeze({
          startDate: selectedSession.start_date,
          endDate: selectedSession.end_date
        }));
      }
    };
    loadSessionDates();
  }, [parliament, session]);

  useEffect(() => {
    initDatabase();
    
    // Set default date field and sort order
    console.log('Initializing navigation bar with defaults:', 'LastUpdatedDateTime', 'desc');
    setSelectedDateField('LastUpdatedDateTime');
    setDateSortOrder('desc');
    onDateFieldChange('LastUpdatedDateTime');
    onDateSortChange('desc');
  }, []);

  const getSearchTypeLabel = () => {
    const type = SEARCH_TYPES.find(t => t.value === searchType);
    return type ? type.label : SEARCH_TYPES[0].label;
  };

  const getStatusFilterLabel = () => {
    const filter = STATUS_FILTERS.find(f => f.value === statusFilter);
    return filter ? filter.label : STATUS_FILTERS[0].label;
  };

  const handleDateFieldChange = (field: string) => {
    // console.log('BillNavigationBar: Date field changed to', field);
    if (field && field !== selectedDateField) {
      setSelectedDateField(field);
      onDateFieldChange(field);
    }
  };

  const handleDateSortChange = (order: 'asc' | 'desc') => {
    // console.log('BillNavigationBar: Sort order changed to', order);
    if (order && order !== dateSortOrder) {
      setDateSortOrder(order);
      onDateSortChange(order);
    }
  };

  const handleDateFilterSelect = (filter: string) => {
    onDateFilterChange(filter);
    setShowDatePicker(false);
  };

  // Re-apply filters when opening date picker
  const openDatePicker = () => {
    // Make sure current values are applied before opening modal
    console.log('Opening date picker with:', selectedDateField, dateSortOrder);
    onDateFieldChange(selectedDateField || 'LastUpdatedDateTime');
    onDateSortChange(dateSortOrder || 'desc');
    Keyboard.dismiss();
    setShowDatePicker(true);
  };

  const handleSubmitSearch = () => {
    Keyboard.dismiss();
  };

  // Calculate active filters count
  const activeFiltersCount = useMemo(() => {
    const options: BillFilterOptions = {
      searchText,
      searchType,
      royalAssentFilter,
      startDate,
      endDate,
      statusFilter
    };
    return filterIndicatorService.countActiveFilters(options);
  }, [searchText, searchType, royalAssentFilter, startDate, endDate, statusFilter, filterIndicatorService]);

  // Add handler for custom date range changes
  useEffect(() => {
    if (dateFilter === 'custom' && startDate && endDate) {
      onDateRangeChange(startDate, endDate);
    } else if (dateFilter === 'all') {
      setStartDate(undefined);
      setEndDate(undefined);
      onDateRangeChange(undefined, undefined);
    }
  }, [dateFilter, startDate, endDate, onDateRangeChange]);

  const handleDateRangeChange = (start?: Date, end?: Date) => {
    setStartDate(start);
    setEndDate(end);
    onDateRangeChange(start, end);
    
    // If we're setting a custom date range, change dateFilter to 'custom'
    if (start && end && dateFilter !== 'custom') {
      onDateFilterChange('custom');
    }
  };

  return (
    <View style={[
      styles.container, 
      { paddingTop: disableSafeArea ? 8 : insets.top + 8 }
    ]}>
      <View style={styles.mainContent} onTouchStart={() => Keyboard.dismiss()}>
        {/* Row 1: Parliament and Session */}
        <View style={styles.headerRow}>
          <View style={styles.parliamentSection}>
            <View style={styles.parliamentControls}>
              <Text style={styles.headerText}>Parliament</Text>
              <View style={styles.numberContainer}>
                <Dropdown
                  label=""
                  options={parliaments}
                  selectedValue={parliament}
                  onSelect={onParliamentChange}
                  textColor="#b22234"
                  width={40}
                  height={36}
                  maxWidth={60}
                  isTextLike={true}
                />
              </View>
              <Text style={styles.headerText}>Session</Text>
              <View style={styles.numberContainer}>
                <Dropdown
                  label=""
                  options={selectedParliamentSessions.map((s) => s.session.toString())}
                  selectedValue={session}
                  onSelect={onSessionChange}
                  textColor="#b22234"
                  width={40}
                  height={36}
                  maxWidth={60}
                  isTextLike={true}
                />
              </View>
            </View>
          </View>
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={styles.filterToggleButton}
              onPress={() => setShowFilters(!showFilters)}
            >
              <View style={styles.filterButtonWrapper}>
                <MaterialIcons 
                  name={showFilters ? "search" : "search-off"} 
                  size={20} 
                  color="#b22234" 
                />
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={onRefresh}
              disabled={refreshing}
            >
              <MaterialIcons 
                name="refresh" 
                size={24} 
                color={refreshing ? '#999' : '#b22234'} 
              />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Session date displayed separately but attached to the header */}
        {sessionDates && (
          <View style={styles.sessionDateContainer}>
            <MaterialIcons 
              name="date-range" 
              size={20} 
              color={dateFilter && dateFilter !== 'all' ? '#b22234' : '#666'} 
            />
            <Text style={styles.sessionDateText}>
              {formatDate(sessionDates.startDate)} - {sessionDates.endDate ? formatDate(sessionDates.endDate) : 'Present'}
            </Text>
          </View>
        )}

        {/* Row 2: Type and RA Filter (can be hidden) */}
        {showFilters && (
          <View style={styles.filterRow}>
            <View style={styles.searchTypeContainer}>
              <View style={styles.dropdownWrapper}>
                <View style={styles.filterLabelContainer}>
                  <Text style={styles.filterLabel}>Filter by:</Text>
                </View>
                <Dropdown
                  label=""
                  options={SEARCH_TYPES.map(type => type.label)}
                  selectedValue={getSearchTypeLabel()}
                  onSelect={(label) => {
                    const type = SEARCH_TYPES.find(t => t.label === label)?.value || 'default';
                    onSearchTypeChange(type as SearchType);
                  }}
                  textColor="#b22234"
                  width={200}
                  height={36}
                  maxWidth={300}
                />
              </View>
            </View>
            {showStatusFilter ? (
              <View style={styles.statusFilterContainer}>
                <View style={[styles.dropdownWrapper, styles.statusDropdownWrapper]}>
                  <Dropdown
                    label=""
                    options={STATUS_FILTERS}
                    selectedValue={statusFilter}
                    onSelect={(value) => onStatusFilterChange(value as StatusFilter)}
                    textColor="#b22234"
                    width={60}
                    height={36}
                    maxWidth={200}
                    showIconOnly={true}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.raFilterContainer}>
                <Dropdown
                  label=""
                  options={RA_FILTERS}
                  selectedValue={royalAssentFilter}
                  onSelect={(value) => onRoyalAssentFilterChange(value as RoyalAssentFilter)}
                  textColor="#b22234"
                  width={60}
                  height={36}
                  maxWidth={250}
                  showIconOnly={true}
                />
              </View>
            )}
          </View>
        )}

        {/* Row 3: Search and Date Filter */}
        <View style={styles.searchRow}>
          <SearchBar
            value={searchText}
            onChangeText={onSearchTextChange}
            placeholder="Search bills..."
            onSubmit={handleSubmitSearch}
            rightButton={
              <View style={styles.dateFilterButtonWrapper}>
                <TouchableOpacity 
                  style={styles.dateFilterButton}
                  onPress={openDatePicker}
                >
                  <MaterialIcons 
                    name="event" 
                    size={26} 
                    color='#b22234'
                  />
                </TouchableOpacity>
              </View>
            }
          />
        </View>

        <DateFilterModal
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          dateFilter={dateFilter}
          onDateFilterChange={handleDateFilterSelect}
          onDateFieldChange={handleDateFieldChange}
          onDateSortChange={handleDateSortChange}
          onDateRangeChange={handleDateRangeChange}
          selectedDateField={selectedDateField}
          dateSortOrder={dateSortOrder}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  mainContent: {
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
    paddingHorizontal: 16,
    height: 48,
  },
  parliamentSection: {
    flex: 1,
  },
  parliamentControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginRight: 4,
  },
  numberContainer: {
    width: 40,
    marginRight: 0,
    marginLeft: 0,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 16,
  },
  filterToggleButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  refreshButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  dateRow: {
    marginBottom: 8,
    alignItems: 'center',
    height: 24,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  searchTypeContainer: {
    flex: 0.8,
    minWidth: 200,
    maxWidth: 300,
  },
  statusFilterContainer: {
    flex: 0.2,
    minWidth: 60,
    maxWidth: 80,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  raFilterContainer: {
    flex: 0.2,
    minWidth: 60,
    maxWidth: 80,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingHorizontal: 16,
    gap: 8,
  },
  dateFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 4,
    paddingVertical: 4,
    height: 36,
    minWidth: 36,
  },
  dateFilterButtonActive: {
    backgroundColor: '#b22234',
  },
  dateFilterOptions: {
    marginVertical: 16,
    gap: 8,
  },
  dateFilterOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b22234',
    backgroundColor: '#fff',
  },
  dateFilterOptionActive: {
    backgroundColor: '#b22234',
  },
  dateFilterOptionText: {
    color: '#b22234',
    fontSize: 16,
    textAlign: 'center',
  },
  dateFilterOptionTextActive: {
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#b22234',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: '#666',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sessionDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 18,
    marginTop: -10,
    height: 20,
    gap: 4,
  },
  sessionDateText: {
    fontSize: 12,
    color: '#666',
  },
  dateFieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  dateFieldLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  sortButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b22234',
  },
  filterButtonWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  dropdownWrapper: {
    position: 'relative', 
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateFilterButtonWrapper: {
    position: 'relative',
  },
  dateFilterBadgeContainer: {
    position: 'absolute',
    top: -6,
    right: -6,
    zIndex: 1,
  },
  filterLabelContainer: {
    marginRight: 8,
    justifyContent: 'center',
  },
  filterLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  statusDropdownWrapper: {
    justifyContent: 'flex-end',
  },
}); 