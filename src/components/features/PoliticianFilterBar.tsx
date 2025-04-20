import React, { useState, useCallback, useEffect, useRef, useMemo, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Keyboard, Platform } from 'react-native';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Dropdown from '../Dropdown';
import SearchBar from '../common/SearchBar';
import { PoliticianFilters } from '../../types/parliament';
import { WatchedPoliticiansService } from '../../services/WatchedPoliticiansService';

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

// Active riding filter options
const ACTIVE_RIDING_OPTIONS = [
  { label: 'Currently Active MPs Only', value: true },
  { label: 'Include Former MPs', value: false },
];

// Component interfaces
interface PartyDropdownProps {
  selectedParty: string;
  setSelectedParty: (party: string) => void;
}

interface ProvinceDropdownProps {
  selectedProvince: string;
  setSelectedProvince: (province: string) => void;
}

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
}

// Memoized dropdown options components
const MemoizedPartyDropdown = memo(({ selectedParty, setSelectedParty }: PartyDropdownProps) => (
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
));

const MemoizedProvinceDropdown = memo(({ selectedProvince, setSelectedProvince }: ProvinceDropdownProps) => (
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
));

// Memoized search component 
const MemoizedSearchBar = memo(({ value, onChangeText, onSubmit }: SearchBarProps) => (
  <View style={styles.searchBarContainer}>
    <SearchBar 
      value={value}
      onChangeText={onChangeText}
      placeholder="Search by name..."
      onSubmit={onSubmit}
    />
  </View>
));

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
  showWatchedOnly?: boolean;
  onToggleWatchedOnly?: () => void;
}

function PoliticianFilterBar({
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
  showWatchedOnly = false,
  onToggleWatchedOnly,
}: PoliticianFilterBarProps) {
  const insets = useSafeAreaInsets();
  
  // State
  const [searchText, setSearchText] = useState<string>(initialSearchText);
  const [searchInputText, setSearchInputText] = useState<string>(initialSearchText);
  const [selectedParty, setSelectedParty] = useState<string>(initialParty);
  const [selectedProvince, setSelectedProvince] = useState<string>(initialProvince);
  const [includeOption, setIncludeOption] = useState<string>(initialIncludeOption);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  
  // Create a dedicated state for watched filter that's ONLY managed by this component
  const [watchedFilter, setWatchedFilter] = useState<boolean>(showWatchedOnly);
  
  // Refs
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastAppliedFiltersRef = useRef<PoliticianFilters>({});
  const isFilterChangingRef = useRef<boolean>(false);
  
  // Update our watchedFilter state when the prop changes
  useEffect(() => {
    if (watchedFilter !== showWatchedOnly) {
      setWatchedFilter(showWatchedOnly);
    }
  }, [showWatchedOnly]);
  
  // Debounce search text changes to reduce filter calls
  const handleSearchChange = useCallback((text: string) => {
    setSearchInputText(text);
    
    // Clear any existing timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    // Set a timeout to actually update the search after typing stops
    searchTimeout.current = setTimeout(() => {
      setSearchText(text);
    }, 300); // 300ms debounce
  }, []);

  // Submit search immediately on Enter
  const handleSubmitSearch = useCallback(() => {
    // Clear timeout so the current input text is used immediately
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
      searchTimeout.current = null;
    }
    
    // Update search text immediately
    setSearchText(searchInputText);
    Keyboard.dismiss();
  }, [searchInputText]);

  // Memoize the filters object construction to avoid rebuilding it on every render
  const currentFilters = useMemo(() => {
    const filters: PoliticianFilters = {};
    
    if (searchText) filters.name = searchText;
    if (selectedParty) filters.party = selectedParty;
    if (selectedProvince) filters.province = selectedProvince;
    if (includeOption) filters.include = includeOption as 'former' | 'all';
    
    // Add watched_only filter based on our dedicated watchedFilter state
    if (watchedFilter) filters.watched_only = true;
    
    return filters;
  }, [searchText, selectedParty, selectedProvince, includeOption, watchedFilter]);

  // Efficiently apply filters only when they change
  useEffect(() => {
    // Skip if filters are already being applied or haven't changed
    if (isFilterChangingRef.current) return;
    
    // Fast shallow comparison of filter objects
    const hasChanged = JSON.stringify(currentFilters) !== JSON.stringify(lastAppliedFiltersRef.current);
    
    if (hasChanged) {
      console.log('PoliticianFilterBar: Filters changed, applying new filters');
      // Set flag to prevent additional calls during filter application
      isFilterChangingRef.current = true;
      
      // Apply filters with batch update for better performance
      onApplyFilters(currentFilters);
      
      // Also call the dedicated callback if the watched filter changed
      const wasWatched = 'watched_only' in lastAppliedFiltersRef.current;
      const isWatched = 'watched_only' in currentFilters;
      
      if (wasWatched !== isWatched && onToggleWatchedOnly) {
        onToggleWatchedOnly();
      }
      
      // Update last applied filters reference
      lastAppliedFiltersRef.current = { ...currentFilters };
      
      // Allow new filters to be applied again after a short delay
      setTimeout(() => {
        isFilterChangingRef.current = false;
      }, 50);
    }
  }, [currentFilters, onApplyFilters, onToggleWatchedOnly]);

  // Make the refresh more explicit by adding a message
  const handleRefresh = useCallback(() => {
    console.log('Explicitly refreshing politicians from API');
    onRefresh();
  }, [onRefresh]);
  
  // Handle the watch toggle - direct filter component with no parent dependency
  const handleWatchedToggle = useCallback(() => {
    console.log(`Toggling watched only from ${watchedFilter} to ${!watchedFilter}`);
    
    // Update our local state first for immediate visual feedback
    const newWatchedState = !watchedFilter;
    setWatchedFilter(newWatchedState);
    
    // Apply the filter directly for immediate effect, ensuring newly watched politicians are included
    const watchFilter: PoliticianFilters = {};
    
    // Include existing filters
    if (searchText) watchFilter.name = searchText;
    if (selectedParty) watchFilter.party = selectedParty;
    if (selectedProvince) watchFilter.province = selectedProvince;
    if (includeOption) watchFilter.include = includeOption as 'former' | 'all';
    
    // Add watched_only if toggling on
    if (newWatchedState) {
      watchFilter.watched_only = true;
    }
    
    // Apply the filter directly
    onApplyFilters(watchFilter);
    
    // Also call the parent callback if provided
    if (onToggleWatchedOnly) {
      onToggleWatchedOnly();
    }
    
    // The filter will also be applied via the useEffect watching currentFilters
  }, [watchedFilter, searchText, selectedParty, selectedProvince, includeOption, onApplyFilters, onToggleWatchedOnly]);

  // Optimized filter reset that batches state updates
  const handleResetFilters = useCallback(() => {
    // Batch all state updates together for better performance
    setSearchText('');
    setSearchInputText('');
    setSelectedParty('');
    setSelectedProvince('');
    setIncludeOption('');
    setWatchedFilter(false); // Reset watched filter
    onUseCurrentOnlyChange(true);
  }, [onUseCurrentOnlyChange]);

  // Memoized party selection handler for improved performance
  const handlePartySelect = useCallback((party: string) => {
    setSelectedParty(party);
  }, []);
  
  // Memoized province selection handler for improved performance
  const handleProvinceSelect = useCallback((province: string) => {
    setSelectedProvince(province);
  }, []);

  // Memoize the action buttons to prevent unnecessary rerenders
  const actionButtons = useMemo(() => (
    <View style={styles.actionsContainer}>
      {/* Watch toggle button - Star icon changes based on filter state */}
      <TouchableOpacity 
        style={[
          styles.iconButton, 
          watchedFilter && styles.activeIconButton
        ]}
        onPress={handleWatchedToggle}
        accessibilityRole="button"
        accessibilityLabel={watchedFilter ? "Hide starred politicians" : "Show starred politicians only"}
        accessibilityState={{ selected: watchedFilter }}
      >
        <FontAwesome 
          name={watchedFilter ? "star" : "star-o"} 
          size={26} 
          color="#FFD700" 
        />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.iconButton}
        onPress={() => setShowFilters(prev => !prev)}
      >
        <MaterialIcons 
          name={showFilters ? "filter-list" : "filter-list-off"} 
          size={26} 
          color="#b22234" 
        />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.iconButton, loading && styles.refreshButtonDisabled]}
        onPress={handleRefresh}
        disabled={loading}
      >
        <MaterialIcons 
          name="refresh" 
          size={26} 
          color={loading ? '#999' : '#b22234'} 
        />
        {loading && <View style={styles.refreshIndicator} />}
      </TouchableOpacity>
    </View>
  ), [watchedFilter, showFilters, loading, handleWatchedToggle, handleRefresh]);

  // Memoize the watched banner to prevent unnecessary rerenders
  const watchedBanner = useMemo(() => {
    if (!watchedFilter) return null;
    
    return (
      <View style={styles.watchBanner}>
        <Text style={styles.watchBannerText}>
          Showing starred politicians only
        </Text>
        <TouchableOpacity onPress={handleWatchedToggle}>
          <Text style={styles.watchBannerButton}>
            Show All
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [watchedFilter, handleWatchedToggle]);

  // Memoize the filters section
  const filtersSection = useMemo(() => {
    if (!showFilters) return null;
    
    return (
      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          <MemoizedPartyDropdown 
            selectedParty={selectedParty} 
            setSelectedParty={handlePartySelect} 
          />
          
          <MemoizedProvinceDropdown 
            selectedProvince={selectedProvince} 
            setSelectedProvince={handleProvinceSelect} 
          />
          
          <View style={styles.refreshButtonWrapper}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={handleResetFilters}
            >
              <MaterialIcons 
                name="refresh" 
                size={26} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }, [showFilters, selectedParty, selectedProvince, handlePartySelect, handleProvinceSelect, handleResetFilters]);

  return (
    <View style={[
      styles.container, 
      { paddingTop: disableSafeArea ? 8 : insets.top + 8 }
    ]}>
      <View style={styles.mainContent} onTouchStart={() => Keyboard.dismiss()}>
        {/* Header Row with Search Bar */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Members of Parliament</Text>
          {actionButtons}
        </View>
        
        {/* Show a watched-only indicator if active */}
        {watchedBanner}
        
        {/* Search Bar - Always Visible */}
        <View style={styles.searchRow}>
          <MemoizedSearchBar 
            value={searchInputText}
            onChangeText={handleSearchChange}
            onSubmit={handleSubmitSearch}
          />
        </View>
        
        {/* Additional Filters */}
        {filtersSection}
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
    alignItems: 'center',
    width: '100%',
  },
  mainContent: {
    marginBottom: 4,
    width: '100%',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 48,
    width: '100%',
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
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIconButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 20,
  },
  refreshButtonDisabled: {
    opacity: 0.6,
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
    width: '100%',
    justifyContent: 'center',
  },
  searchBarContainer: {
    width: '100%',
    maxWidth: 800,
  },
  filtersContainer: {
    width: '100%',
    alignItems: 'center',
  },
  filterRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
  },
  filterDropdown: {
    marginHorizontal: 10,
  },
  filterLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  refreshButtonWrapper: {
    paddingTop: 16, // This accounts for the label height
    marginHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginBottom: 8,
    width: '90%',
    maxWidth: 800,
  },
  watchBannerText: {
    color: '#333',
    fontWeight: 'bold',
  },
  watchBannerButton: {
    color: '#b22234',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});

// Export as a React memo to prevent unnecessary re-renders
export default memo(PoliticianFilterBar); 