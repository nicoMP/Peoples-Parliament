import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
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
}: BillNavigationBarProps) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [sessionDates, setSessionDates] = useState<Readonly<{ startDate: string; endDate: string }> | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(false);

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

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.mainContent}>
        <View style={styles.headerRow}>
          <View style={styles.parliamentSection}>
            <Text style={styles.headerText}>Parliament </Text>
            <View style={styles.numberContainer}>
              <Dropdown
                label=""
                options={parliaments}
                selectedValue={parliament}
                onSelect={onParliamentChange}
                textColor="#b22234"
              />
            </View>
            <Text style={styles.headerText}> Session </Text>
            <View style={styles.numberContainer}>
              <Dropdown
                label=""
                options={selectedParliamentSessions.map((s) => s.session.toString())}
                selectedValue={session}
                onSelect={onSessionChange}
                textColor="#b22234"
              />
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

        {sessionDates && (
          <View style={styles.dateRow}>
            <Text style={styles.dateText}>
              Session: {new Date(sessionDates.startDate).toLocaleDateString()} - {sessionDates.endDate ? new Date(sessionDates.endDate).toLocaleDateString() : 'Present'}
            </Text>
          </View>
        )}

        {showFilters && (
          <View style={styles.searchSection}>
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
              <MaterialIcons 
                name="stars" 
                size={20} 
                color={royalAssentFilter !== 'both' ? '#fff' : '#b22234'} 
              />
              <Text style={[
                styles.royalAssentText,
                royalAssentFilter !== 'both' && styles.royalAssentTextActive
              ]} numberOfLines={1}>
                {royalAssentFilter === 'in_progress' ? 'RA in Progress' : 
                 royalAssentFilter === 'none' ? 'No RA' : 'RA All'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
    marginBottom: 4,
    height: 40,
  },
  parliamentSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  numberContainer: {
    width: 60,
    marginHorizontal: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterToggleButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b22234',
  },
  refreshButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateRow: {
    marginBottom: 4,
    alignItems: 'center',
    height: 20,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  searchTypeContainer: {
    flex: 1,
    minWidth: 100,
  },
  royalAssentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#b22234',
    gap: 4,
    width: 120,
    height: 36,
  },
  royalAssentButtonActive: {
    backgroundColor: '#b22234',
  },
  royalAssentText: {
    color: '#b22234',
    fontWeight: '500',
    fontSize: 14,
  },
  royalAssentTextActive: {
    color: '#fff',
  },
}); 