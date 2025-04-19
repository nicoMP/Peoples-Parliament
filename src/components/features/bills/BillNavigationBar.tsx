import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Modal, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Dropdown from '@components/Dropdown';
import Sessions from '@constants/Sessions.json';
import axios from 'axios';
import { baseParliamentUrl } from '@constants/constants';
import { initDatabase, saveBills, getBills, clearOldData, getSessions, saveSessions } from '@services/database';
import { ApiBill } from '@src/types/bill';
import { SearchType, RoyalAssentFilter } from '@services/filters/BillFilterService';
import { SEARCH_TYPES } from '@services/filters/FilterConstants';
import DateFilterModal from '../../modals/DateFilterModal';
import SearchBar from '../common/SearchBar';

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
}: BillNavigationBarProps) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [sessionDates, setSessionDates] = useState<Readonly<{ startDate: string; endDate: string }> | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [selectedDateField, setSelectedDateField] = useState('LastUpdatedDateTime');
  const [dateSortOrder, setDateSortOrder] = useState<'asc' | 'desc'>('desc');

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
  }, []);

  const getSearchTypeLabel = () => {
    const type = SEARCH_TYPES.find(t => t.value === searchType);
    return type ? type.label : SEARCH_TYPES[0].label;
  };

  const handleDateFieldChange = (field: string) => {
    setSelectedDateField(field);
    onDateFieldChange(field);
  };

  const handleDateSortChange = (order: 'asc' | 'desc') => {
    setDateSortOrder(order);
    onDateSortChange(order);
  };

  const handleDateFilterSelect = (filter: string) => {
    onDateFilterChange(filter);
    setShowDatePicker(false);
  };

  // Initialize selectedDateField in parent when component mounts
  useEffect(() => {
    // Pass initial date field to parent
    onDateFieldChange(selectedDateField);
  }, [selectedDateField, onDateFieldChange]);

  const handleSubmitSearch = () => {
    Keyboard.dismiss();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
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
              <MaterialIcons 
                name={showFilters ? "search" : "search-off"} 
                size={20} 
                color="#b22234" 
              />
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
            <MaterialIcons name="calendar-today" size={14} color="#666" />
            <Text style={styles.sessionDateText}>
              {formatDate(sessionDates.startDate)} - {sessionDates.endDate ? formatDate(sessionDates.endDate) : 'Present'}
            </Text>
          </View>
        )}

        {/* Row 2: Type and RA Filter (can be hidden) */}
        {showFilters && (
          <View style={styles.filterRow}>
            <View style={styles.searchTypeContainer}>
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
            <TouchableOpacity 
              style={[
                styles.royalAssentButton,
                royalAssentFilter !== 'both' && styles.royalAssentButtonActive
              ]}
              onPress={() => {
                const nextFilter = royalAssentFilter === 'both' ? 'in_progress' : 
                                 royalAssentFilter === 'in_progress' ? 'none' : 'both';
                onRoyalAssentFilterChange(nextFilter);
              }}
            >
              {royalAssentFilter === 'both' ? (
                <MaterialIcons 
                  name="stars" 
                  size={20} 
                  color="#999" 
                />
              ) : royalAssentFilter === 'in_progress' ? (
                <MaterialIcons 
                  name="check-circle" 
                  size={20} 
                  color="#fff" 
                />
              ) : (
                <MaterialIcons 
                  name="cancel" 
                  size={20} 
                  color="#fff" 
                />
              )}
              <Text style={[
                styles.royalAssentText,
                royalAssentFilter !== 'both' && styles.royalAssentTextActive
              ]}>
                {royalAssentFilter === 'in_progress' ? 'RA ✓' : 
                 royalAssentFilter === 'none' ? 'RA ✕' : 'RA'}
              </Text>
            </TouchableOpacity>
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
              <TouchableOpacity 
                style={[
                  styles.dateFilterButton,
                  dateFilter !== 'all' && styles.dateFilterButtonActive
                ]}
                onPress={() => {
                  Keyboard.dismiss();
                  setShowDatePicker(true);
                }}
              >
                <MaterialIcons 
                  name="access-time" 
                  size={20} 
                  color={dateFilter !== 'all' ? '#fff' : '#b22234'} 
                />
              </TouchableOpacity>
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
          onDateRangeChange={onDateRangeChange}
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
  royalAssentButton: {
    flex: 0.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#b22234',
    gap: 4,
    height: 36,
    minWidth: 60,
  },
  royalAssentButtonActive: {
    backgroundColor: '#b22234',
  },
  royalAssentText: {
    color: '#999',
    fontWeight: '500',
    fontSize: 14,
  },
  royalAssentTextActive: {
    color: '#fff',
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
    flex: 0.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#b22234',
    height: 32,
    minWidth: 60,
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
    marginBottom: 12,
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
}); 