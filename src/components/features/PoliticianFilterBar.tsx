import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Keyboard, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Dropdown from '../Dropdown';
import SearchBar from '../common/SearchBar';
import { PoliticianFilters } from '../../types/parliament';

// Common parties for filter dropdown
const COMMON_PARTIES = [
  { label: 'All Parties', value: '' },
  { label: 'Liberal', value: 'Liberal' },
  { label: 'Conservative', value: 'Conservative' },
  { label: 'NDP', value: 'NDP' },
  { label: 'Bloc Québécois', value: 'Bloc' },
  { label: 'Green', value: 'Green' },
  { label: 'Independent', value: 'Independent' },
];

// Common provinces for filter dropdown
const PROVINCES = [
  { label: 'All Provinces', value: '' },
  { label: 'Alberta', value: 'AB' },
  { label: 'British Columbia', value: 'BC' },
  { label: 'Manitoba', value: 'MB' },
  { label: 'New Brunswick', value: 'NB' },
  { label: 'Newfoundland and Labrador', value: 'NL' },
  { label: 'Nova Scotia', value: 'NS' },
  { label: 'Ontario', value: 'ON' },
  { label: 'Prince Edward Island', value: 'PE' },
  { label: 'Quebec', value: 'QC' },
  { label: 'Saskatchewan', value: 'SK' },
  { label: 'Northwest Territories', value: 'NT' },
  { label: 'Nunavut', value: 'NU' },
  { label: 'Yukon', value: 'YT' },
];

// Options for the include dropdown
const INCLUDE_OPTIONS = [
  { label: 'Current MPs only', value: '' },
  { label: 'Former MPs only', value: 'former' },
  { label: 'Both current and former', value: 'all' },
];

// Active riding filter options
const ACTIVE_RIDING_OPTIONS = [
  { label: 'Currently Active MPs Only', value: true },
  { label: 'Include Former MPs', value: false },
];

interface PoliticianFilterBarProps {
  onApplyFilters: (filters: PoliticianFilters) => void;
  onRefresh: () => void;
  onUseCurrentOnlyChange: (value: boolean) => void;
  useCurrentOnly: boolean;
  loading: boolean;
  disableSafeArea?: boolean;
  initialSearchText?: string;
  initialParty?: string;
  initialProvince?: string;
  initialIncludeOption?: string;
}

export default function PoliticianFilterBar({
  onApplyFilters,
  onRefresh,
  onUseCurrentOnlyChange,
  useCurrentOnly,
  loading,
  disableSafeArea = false,
  initialSearchText = '',
  initialParty = '',
  initialProvince = '',
  initialIncludeOption = '',
}: PoliticianFilterBarProps) {
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState<string>(initialSearchText);
  const [selectedParty, setSelectedParty] = useState<string>(initialParty);
  const [selectedProvince, setSelectedProvince] = useState<string>(initialProvince);
  const [includeOption, setIncludeOption] = useState<string>(initialIncludeOption);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [isInitialRender, setIsInitialRender] = useState<boolean>(true);

  // Improve synchronization between includeOption and useCurrentOnly
  useEffect(() => {
    if (isInitialRender) {
      setIsInitialRender(false);
      return;
    }

    // Update useCurrentOnly based on includeOption
    if (includeOption === '') {
      // Only current MPs
      if (!useCurrentOnly) {
        console.log("Setting useCurrentOnly to true because includeOption is empty");
        onUseCurrentOnlyChange(true);
      }
    } else {
      // Former or all MPs
      if (useCurrentOnly) {
        console.log("Setting useCurrentOnly to false because includeOption is", includeOption);
        onUseCurrentOnlyChange(false);
      }
    }
  }, [includeOption, onUseCurrentOnlyChange, useCurrentOnly]);

  // Watch for changes to useCurrentOnly and update includeOption accordingly
  useEffect(() => {
    if (isInitialRender) return;
    
    if (useCurrentOnly && includeOption !== '') {
      console.log("Setting includeOption to empty because useCurrentOnly is true");
      setIncludeOption('');
    } else if (!useCurrentOnly && includeOption === '') {
      console.log("Setting includeOption to 'former' because useCurrentOnly is false");
      setIncludeOption('former');
    }
  }, [useCurrentOnly]);

  // Create a function to apply filters that will be called automatically
  const applyFilters = useCallback(() => {
    const filters: PoliticianFilters = {};
    
    if (searchText) filters.name = searchText;
    if (selectedParty) filters.party = selectedParty;
    if (selectedProvince) filters.province = selectedProvince;
    
    // Type assertion to ensure correct type for include
    if (includeOption) {
      filters.include = includeOption as 'former' | 'all';
    }
    
    onApplyFilters(filters);
  }, [searchText, selectedParty, selectedProvince, includeOption, onApplyFilters]);

  // Apply filters automatically when any filter changes
  useEffect(() => {
    if (!isInitialRender) {
      applyFilters();
    }
  }, [searchText, selectedParty, selectedProvince, applyFilters, isInitialRender]);

  const handleResetFilters = () => {
    setSearchText('');
    setSelectedParty('');
    setSelectedProvince('');
    setIncludeOption('');
    onUseCurrentOnlyChange(true); // Reset to default (active only)
  };

  const handleSearchChange = (text: string) => {
    setSearchText(text);
  };

  const handleSubmitSearch = () => {
    Keyboard.dismiss();
  };

  // Updated handle include option change function to be more explicit
  const handleIncludeOptionChange = (label: string) => {
    const option = INCLUDE_OPTIONS.find(o => o.label === label)?.value || '';
    console.log("Selected include option:", option);
    setIncludeOption(option);
    
    // Explicitly update useCurrentOnly based on the selection
    if (option === '') {
      // Current MPs only
      onUseCurrentOnlyChange(true);
    } else if (option === 'former') {
      // Former MPs only
      onUseCurrentOnlyChange(false);
    } else if (option === 'all') {
      // Both current and former
      onUseCurrentOnlyChange(false);
    }
  };

  // Make the refresh more explicit by adding a message
  const handleRefresh = () => {
    // Show alert/toast that we're fetching fresh data (could be implemented if needed)
    console.log('Explicitly refreshing politicians from API');
    onRefresh();
  };

  return (
    <View style={[
      styles.container, 
      { paddingTop: disableSafeArea ? 8 : insets.top + 8 }
    ]}>
      <View style={styles.mainContent} onTouchStart={() => Keyboard.dismiss()}>
        {/* Header Row with Search Bar */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Members of Parliament</Text>
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={styles.filterToggleButton}
              onPress={() => setShowFilters(!showFilters)}
            >
              <View style={styles.filterButtonWrapper}>
                <MaterialIcons 
                  name={showFilters ? "filter-list" : "filter-list-off"} 
                  size={20} 
                  color="#b22234" 
                />
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.refreshButton, loading ? styles.refreshButtonDisabled : null]}
              onPress={handleRefresh}
              disabled={loading}
            >
              <MaterialIcons 
                name="refresh" 
                size={24} 
                color={loading ? '#999' : '#b22234'} 
              />
              {loading && <View style={styles.refreshIndicator} />}
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Search Bar - Always Visible */}
        <View style={styles.searchRow}>
          <SearchBar 
            value={searchText}
            onChangeText={handleSearchChange}
            placeholder="Search by name..."
            onSubmit={handleSubmitSearch}
          />
        </View>
        
        {/* Additional Filters */}
        {showFilters && (
          <View style={styles.filtersContainer}>
            <View style={styles.filterRow}>
              <View style={styles.filterDropdown}>
                <Text style={styles.filterLabel}>Party</Text>
                <Dropdown
                  label=""
                  options={COMMON_PARTIES.map(p => p.label)}
                  selectedValue={COMMON_PARTIES.find(p => p.value === selectedParty)?.label || 'All Parties'}
                  onSelect={(label: string) => {
                    const party = COMMON_PARTIES.find(p => p.label === label)?.value || '';
                    setSelectedParty(party);
                  }}
                  textColor="#b22234"
                  width={150}
                  height={36}
                />
              </View>
              
              <View style={styles.filterDropdown}>
                <Text style={styles.filterLabel}>Province</Text>
                <Dropdown
                  label=""
                  options={PROVINCES.map(p => p.label)}
                  selectedValue={PROVINCES.find(p => p.value === selectedProvince)?.label || 'All Provinces'}
                  onSelect={(label: string) => {
                    const province = PROVINCES.find(p => p.label === label)?.value || '';
                    setSelectedProvince(province);
                  }}
                  textColor="#b22234"
                  width={150}
                  height={36}
                />
              </View>
            </View>
            
            <View style={styles.filterRow}>
              <View style={styles.filterDropdown}>
                <Text style={styles.filterLabel}>Include</Text>
                <Dropdown
                  label=""
                  options={INCLUDE_OPTIONS.map(o => o.label)}
                  selectedValue={INCLUDE_OPTIONS.find(o => o.value === includeOption)?.label || 'Current MPs only'}
                  onSelect={handleIncludeOptionChange}
                  textColor="#b22234"
                  width={240}
                  height={36}
                />
              </View>
              
              <View style={styles.resetButtonContainer}>
                <TouchableOpacity 
                  style={styles.resetButton}
                  onPress={handleResetFilters}
                >
                  <Text style={styles.resetButtonText}>Reset</Text>
                </TouchableOpacity>
              </View>
            </View>
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
    paddingHorizontal: 16,
    height: 48,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
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
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterButtonWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  refreshButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    position: 'relative', // Added for positioning the refresh indicator
  },
  refreshButtonDisabled: {
    opacity: 0.6,
    backgroundColor: '#f9f9f9',
  },
  refreshIndicator: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#b22234',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
    paddingHorizontal: 8,
    width: '100%',
  },
  filtersContainer: {
    marginTop: 4,
    marginBottom: 8,
    gap: 8,
    paddingHorizontal: 16,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  filterDropdown: {
    flex: 1,
  },
  resetButtonContainer: {
    flex: 0.5,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    paddingTop: 16,
  },
  filterLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  resetButton: {
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 16,
  },
  resetButtonText: {
    color: '#333',
    fontWeight: '500',
  },
}); 