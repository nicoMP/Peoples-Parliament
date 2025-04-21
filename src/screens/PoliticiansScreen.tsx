import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Text } from 'react-native';
import { usePoliticians } from '../hooks/usePoliticians';
import PoliticianList from '../components/PoliticianList';
import PoliticianFilterBar from '../components/features/PoliticianFilterBar';
import { WatchedPoliticiansService } from '../services/WatchedPoliticiansService';
import { Politician, PoliticianFilters } from '../types/parliament';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PoliticiansStackParamList } from '../navigation/stacks/PoliticiansStack';
import PoliticianFilterService from '../services/filters/PoliticianFilterService';

type NavigationProp = NativeStackNavigationProp<PoliticiansStackParamList, 'PoliticiansList'>;

export default function PoliticiansScreen() {
  const [searchText, setSearchText] = useState('');
  const [partyFilter, setPartyFilter] = useState<string>('');
  const [provinceFilter, setProvinceFilter] = useState<string>('');
  const [includeOption, setIncludeOption] = useState<string>('');
  const [useCurrentOnly, setUseCurrentOnly] = useState<boolean>(true);
  const [showWatchedOnly, setShowWatchedOnly] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filteredPoliticians, setFilteredPoliticians] = useState<Politician[]>([]);
  const navigation = useNavigation<NavigationProp>();
  
  const {
    politicians,
    loading,
    error,
    applyFilters,
    refreshPoliticians,
    setUseCurrentOnly: hookSetUseCurrentOnly,
    loadMore,
    updatePoliticianDetails
  } = usePoliticians();

  const watchedPoliticiansService = WatchedPoliticiansService.getInstance();
  const filterService = PoliticianFilterService.getInstance();

  // Filter politicians based on watch status - memoized to prevent rerenders
  const updateFilteredPoliticians = useCallback(async () => {
    console.log(`[updateFilteredPoliticians] Running. Current showWatchedOnly=${showWatchedOnly}, loading=${loading}`);
    if (loading) {
        console.log('[updateFilteredPoliticians] Skipping update because loading=true');
        return;
    }

    try {
      if (showWatchedOnly) {
        console.log('[updateFilteredPoliticians] Fetching ONLY watched politicians.');
        const watchedPoliticians = await watchedPoliticiansService.getAllWatchedPoliticians();
        console.log(`[updateFilteredPoliticians] Got ${watchedPoliticians.length} watched politicians.`);
        setFilteredPoliticians(watchedPoliticians);
      } else {
        console.log('[updateFilteredPoliticians] Fetching main list and updating watch status.');
        if (politicians.length > 0) {
          const updatedPoliticians = await watchedPoliticiansService.updateWatchStatusInList(politicians);
          console.log(`[updateFilteredPoliticians] Updated ${updatedPoliticians.length} politicians with watch status.`);
          setFilteredPoliticians(updatedPoliticians);
        } else {
          console.log('[updateFilteredPoliticians] Main politicians list is empty, setting filtered list to empty.');
          setFilteredPoliticians([]);
        }
      }
    } catch (error) {
      console.error('[updateFilteredPoliticians] Error:', error);
      // Fallback to unfiltered list if possible
      if (!showWatchedOnly && politicians.length > 0) {
        setFilteredPoliticians(politicians);
      } else {
        setFilteredPoliticians([]);
      }
    }
  }, [politicians, showWatchedOnly, loading, watchedPoliticiansService]);

  // Run the filter effect with proper dependencies
  useEffect(() => {
    console.log(`[useEffect] Triggered. showWatchedOnly=${showWatchedOnly}, politicians.length=${politicians.length}. Calling updateFilteredPoliticians.`);
    updateFilteredPoliticians();
    // Ensure politicians.length is included if updateFilteredPoliticians depends on it indirectly
  }, [updateFilteredPoliticians, showWatchedOnly, politicians.length]);

  // Set up navigation options
  useEffect(() => {
    navigation.setOptions({
      headerTitle: "Politicians",
      headerShown: true
    });
  }, [navigation]);

  // Toggle watched-only mode
  const handleToggleWatchedOnly = useCallback(() => {
    console.log(`[handleToggleWatchedOnly] Called. Current showWatchedOnly=${showWatchedOnly}`);
    
    // First update local state for immediate feedback
    setShowWatchedOnly(prev => !prev);
    
    // Then explicitly update filtered politicians based on new state
    const newWatchedState = !showWatchedOnly;
    
    // Create a complete filters object including the new watched state
    const updatedFilters: PoliticianFilters = {
      name: searchText || undefined,
      party: partyFilter || undefined,
      province: provinceFilter || undefined,
    };
    
    // Add include filter if we're showing former/all
    if (!useCurrentOnly) {
      updatedFilters.include = (includeOption || 'former') as 'former' | 'all';
    }
    
    // Add watched_only if toggling on
    if (newWatchedState) {
      updatedFilters.watched_only = true;
    }
    
    // Apply filters with complete filter set to ensure data consistency
    applyFilters(updatedFilters);
    
    // Force an update of filtered politicians to refresh the list with latest watch status
    updateFilteredPoliticians();
    
  }, [showWatchedOnly, searchText, partyFilter, provinceFilter, useCurrentOnly, includeOption, applyFilters, updateFilteredPoliticians]);

  // Just refresh data when explicitly requested
  const handleRefresh = useCallback(async () => {
    console.log('[handleRefresh] Explicitly refreshing politicians');
    await refreshPoliticians();
    // After refreshing the politicians, update the filtered list
    // updateFilteredPoliticians(); // This is handled by the useEffect watching politicians.length
  }, [refreshPoliticians]);

  // Handle filter changes
  const handleApplyFilters = useCallback((filters: PoliticianFilters) => {
    console.log('[handleApplyFilters] Applying filters:', filters);
    // Update local state
    if (filters.name !== undefined) setSearchText(filters.name);
    if (filters.party !== undefined) setPartyFilter(filters.party);
    if (filters.province !== undefined) setProvinceFilter(filters.province);
    
    // Update include option
    setIncludeOption(filters.include || '');
    
    // Update useCurrentOnly state to match
    if (filters.include) {
      setUseCurrentOnly(false);
    } else {
      setUseCurrentOnly(true);
    }
    
    // Handle watched_only state explicitly
    if ('watched_only' in filters) {
      setShowWatchedOnly(!!filters.watched_only);
    }
    
    // Apply filters in the hook
    applyFilters(filters);
  }, [applyFilters]);

  // Handle current/former toggle
  const handleUseCurrentOnlyChange = useCallback((value: boolean) => {
    console.log(`[handleUseCurrentOnlyChange] Setting useCurrentOnly to: ${value}`);
    // Update local state
    setUseCurrentOnly(value);
    
    // Update hook state
    hookSetUseCurrentOnly(value);
    
    // Update includeOption for UI
    if (value) {
      setIncludeOption('');
    } else if (!value && !includeOption) {
      setIncludeOption('former');
    }
    
    // Create filter based on all current filter settings
    const newFilters: PoliticianFilters = {
      name: searchText || undefined,
      party: partyFilter || undefined,
      province: provinceFilter || undefined
    };
    
    // Add include filter if we're showing former/all
    if (!value) {
      newFilters.include = (includeOption || 'former') as 'former' | 'all';
    }
    
    // Apply filters - hook will handle the filtering
    applyFilters(newFilters);
  }, [includeOption, hookSetUseCurrentOnly, searchText, partyFilter, provinceFilter, applyFilters]);

  // Handle watch toggling - now with details update
  const handleToggleWatch = useCallback(async (politician: Politician) => {
    console.log(`[handleToggleWatch] Called for: ${politician.name} (${politician.url}). Current showWatchedOnly=${showWatchedOnly}`);
    try {
      // Check if we need to fetch detailed info first - use the hasFullDetails property if available
      const politicianWithStatus = politician as (Politician & { hasFullDetails?: boolean });
      const hasDetails = politicianWithStatus.hasFullDetails === true || 
        politician.email || politician.voice || politician.links || politician.memberships;
        
      if (!hasDetails) {
        console.log(`Fetching details for ${politician.name} before toggling watch status`);
        const detailedPolitician = await updatePoliticianDetails(politician);
        if (detailedPolitician) {
          politician = detailedPolitician;
        }
      }
      
      const isWatching = await watchedPoliticiansService.isWatchingPolitician(politician.url);
      console.log(`[handleToggleWatch] ${politician.name} is currently watched: ${isWatching}`);

      if (isWatching) {
        console.log(`[handleToggleWatch] Unwatching ${politician.name}`);
        await watchedPoliticiansService.unwatchPolitician(politician.url);
      } else {
        console.log(`[handleToggleWatch] Watching ${politician.name}`);
        await watchedPoliticiansService.watchPolitician(politician);
      }

      console.log(`[handleToggleWatch] DB update complete. Calling updateFilteredPoliticians to refresh list.`);
      // Update filtered politicians explicitly after DB change
      await updateFilteredPoliticians(); 
    } catch (error) {
      console.error('[handleToggleWatch] Error toggling watch status:', error);
    }
  }, [watchedPoliticiansService, updateFilteredPoliticians, showWatchedOnly, updatePoliticianDetails]);

  // Handle navigation to details - fetch details if needed
  const handleNavigateToDetails = useCallback(async (politician: Politician) => {
    // Check if we need to update details - use the hasFullDetails property if available
    const politicianWithStatus = politician as (Politician & { hasFullDetails?: boolean });
    const hasDetails = politicianWithStatus.hasFullDetails === true || 
      politician.email || politician.voice || politician.links || politician.memberships;
      
    if (!hasDetails) {
      console.log(`Fetching details for ${politician.name} before navigation`);
      await updatePoliticianDetails(politician);
    } else {
      console.log(`${politician.name} already has complete details, navigating directly`);
    }
    
    if (!politician?.url) return;
    const id = politician.url.split('/').filter(Boolean).pop() || '';
    navigation.navigate('PoliticianDetails', { id });
  }, [navigation, updatePoliticianDetails]);

  // Memoize the refresh callback to avoid recreating it on every render
  const handleRefreshCallback = useCallback(async () => {
    setRefreshing(true);
    await handleRefresh();
    setRefreshing(false);
  }, [handleRefresh]);

  // Determine which politicians to display
  const politiciansToDisplay = filteredPoliticians;
  console.log(`[Render] Rendering PoliticiansScreen. showWatchedOnly=${showWatchedOnly}, politiciansToDisplay.length=${politiciansToDisplay.length}`);
  console.log(`[Render] handleToggleWatch type: ${typeof handleToggleWatch}`);

  return (
    <SafeAreaView style={styles.container}>
      <PoliticianFilterBar
        onApplyFilters={handleApplyFilters}
        onRefresh={handleRefresh}
        onUseCurrentOnlyChange={handleUseCurrentOnlyChange}
        useCurrentOnly={useCurrentOnly}
        loading={loading}
        initialSearchText={searchText}
        initialParty={partyFilter}
        initialProvince={provinceFilter}
        initialIncludeOption={includeOption}
        showWatchedOnly={showWatchedOnly}
        onToggleWatchedOnly={handleToggleWatchedOnly}
      />
      
      <PoliticianList
        politicians={politiciansToDisplay}
        loading={loading}
        error={error}
        refreshing={refreshing}
        onRefresh={handleRefreshCallback}
        onToggleWatch={handleToggleWatch}
        onLoadMore={!showWatchedOnly ? loadMore : undefined}
        onCardPress={handleNavigateToDetails}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4',
  },
  watchedButton: {
    marginRight: 16,
    padding: 8,
    backgroundColor: '#3a86ff',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  watchedBanner: {
    flexDirection: 'row',
    backgroundColor: '#3a86ff',
    padding: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  watchedBannerText: {
    color: 'white',
    fontWeight: 'bold',
  },
  watchedBannerButton: {
    color: 'white',
    textDecorationLine: 'underline',
  },
}); 