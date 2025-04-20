import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, SafeAreaView, StatusBar, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import PoliticianList from '../components/PoliticianList';
import PoliticianFilterBar from '../components/features/PoliticianFilterBar';
import usePoliticians from '../hooks/usePoliticians';
import { PoliticianFilters } from '../types/parliament';
import PoliticiansCacheService from '../services/CachePoliticiansService';

const Politicians = () => {
  const navigation = useNavigation();
  const [searchText, setSearchText] = useState<string>('');
  const [selectedParty, setSelectedParty] = useState<string>('');
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [includeOption, setIncludeOption] = useState<string>('');
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
  
  // Initialize cache on component mount
  useEffect(() => {
    const initCache = async () => {
      await PoliticiansCacheService.initPoliticiansDatabase();
    };
    
    initCache();
  }, []);
  
  const {
    politicians,
    loading,
    refreshing,
    error,
    totalCount,
    loadMore,
    refreshPoliticians,
    filters,
    applyFilters,
    useCurrentOnly,
    setUseCurrentOnly
  } = usePoliticians();

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // When initial load is complete, mark it as finished
  useEffect(() => {
    if (!loading && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [loading, isInitialLoad]);

  // Handle filter application with debounce to avoid excessive updates
  const handleApplyFilters = useCallback((newFilters: PoliticianFilters) => {
    // Skip filter updates during initial load
    if (isInitialLoad) return;
    
    setSearchText(newFilters.name || '');
    setSelectedParty(newFilters.party || '');
    setSelectedProvince(newFilters.province || '');
    
    // Only update includeOption if it's different to avoid circular updates
    const newIncludeOption = newFilters.include || '';
    if (newIncludeOption !== includeOption) {
      setIncludeOption(newIncludeOption);
    }
    
    applyFilters(newFilters);
  }, [includeOption, isInitialLoad, applyFilters]);

  // Handle the useCurrentOnly change
  const handleUseCurrentOnlyChange = useCallback((newValue: boolean) => {
    // Skip during initial load
    if (isInitialLoad) return;
    
    setUseCurrentOnly(newValue);
    
    // Update includeOption to match the current status
    if (newValue && includeOption !== '') {
      setIncludeOption('');
    } else if (!newValue && includeOption === '') {
      setIncludeOption('former');
    }
  }, [includeOption, isInitialLoad, setUseCurrentOnly]);

  const handleRefresh = useCallback(() => {
    refreshPoliticians();
  }, [refreshPoliticians]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <PoliticianFilterBar
        onApplyFilters={handleApplyFilters}
        onRefresh={handleRefresh}
        onUseCurrentOnlyChange={handleUseCurrentOnlyChange}
        useCurrentOnly={useCurrentOnly}
        loading={loading || refreshing}
        initialSearchText={searchText}
        initialParty={selectedParty}
        initialProvince={selectedProvince}
        initialIncludeOption={includeOption}
      />
      
      <PoliticianList 
        politicians={politicians}
        loading={loading}
        error={error}
        onLoadMore={loadMore}
        refreshing={refreshing}
        onRefresh={refreshPoliticians}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4',
  },
});

export default Politicians; 