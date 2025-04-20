import { useState, useEffect, useCallback } from 'react';
import { fetchPoliticians } from '../services/parliamentService';
import { Politician, PoliticianFilters, PoliticianResponse } from '../types/parliament';

interface UsePoliticiansResult {
  politicians: Politician[];
  loading: boolean;
  refreshing: boolean;
  error: Error | null;
  totalCount: number;
  loadMore: () => Promise<void>;
  refreshPoliticians: () => Promise<void>;
  filters: PoliticianFilters;
  setFilter: (key: keyof PoliticianFilters, value: string) => void;
  clearFilters: () => void;
  hasMorePages: boolean;
  useCurrentOnly: boolean;
  setUseCurrentOnly: (value: boolean) => void;
  applyFilters: (newFilters: PoliticianFilters) => void;
}

// Maximum number of politicians to fetch in one request
const MAX_PAGE_SIZE = 250;

/**
 * Hook for fetching and filtering politicians from the Parliament API
 * 
 * @param initialFilters - Initial filters to apply
 * @returns Object with politicians data, loading states, and methods to load more or filter
 */
export function usePoliticians(
  initialFilters: PoliticianFilters = {}
): UsePoliticiansResult {
  // Politicians to display (after filtering)
  const [displayedPoliticians, setDisplayedPoliticians] = useState<Politician[]>([]);
  // All politicians we've fetched so far (before filtering)
  const [allPoliticians, setAllPoliticians] = useState<Politician[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState<number>(1);
  const [hasMorePages, setHasMorePages] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [useCurrentOnly, setUseCurrentOnly] = useState<boolean>(true);
  const [initialLoadDone, setInitialLoadDone] = useState<boolean>(false);
  
  const [filters, setFilters] = useState<PoliticianFilters>({
    ...initialFilters,
  });

  // Fetch politicians from API - ONLY when explicitly refreshing via the refresh button
  const fetchPoliticiansFromAPI = useCallback(async (explicitRefresh: boolean = false) => {
    try {
      if (!explicitRefresh) {
        console.log('API fetch requested but not an explicit refresh - using cache only');
        // Load from cache only with skipFresh=true parameter
        const apiFilters: PoliticianFilters = {
          limit: MAX_PAGE_SIZE,
          offset: 0
        };
        
        // Add include filter based on currentOnly setting
        if (!useCurrentOnly) {
          apiFilters.include = filters.include || 'all';
        }
        
        if (filters.name) apiFilters.name = filters.name;
        if (filters.family_name) apiFilters.family_name = filters.family_name;
        if (filters.given_name) apiFilters.given_name = filters.given_name;
        
        // This uses skipFresh=true to only use cache
        const response = await fetchPoliticians(apiFilters, true, false, true);
        
        if (response?.objects && response.objects.length > 0) {
          const politicians = response.objects;
          setAllPoliticians(politicians);
          
          if (response.pagination && 'total_count' in response.pagination) {
            setTotalCount(response.pagination.total_count as number);
            setHasMorePages(politicians.length < (response.pagination.total_count as number));
          }
          
          return politicians;
        }
      }
      
      // Only continue with API fetch if explicitRefresh is true
      if (explicitRefresh) {
        console.log('Explicit refresh requested - fetching fresh data from API');
        // Configure API filters
        const apiFilters: PoliticianFilters = {
          limit: MAX_PAGE_SIZE,
          offset: 0
        };
        
        // Add include filter based on currentOnly setting
        if (!useCurrentOnly) {
          apiFilters.include = filters.include || 'all';
        }
        
        // Send name, family_name and given_name to API to help with initial results
        if (filters.name) apiFilters.name = filters.name;
        if (filters.family_name) apiFilters.family_name = filters.family_name;
        if (filters.given_name) apiFilters.given_name = filters.given_name;
        
        // Fetch politician data with details included (true) and forceFresh=true
        const response = await fetchPoliticians(apiFilters, true, true);
        console.log(response)
        if (!response?.objects) {
          throw new Error('Invalid API response');
        }
        
        const politicians = response.objects;
        
        // Update pagination state
        if (response.pagination && 'total_count' in response.pagination) {
          setTotalCount(response.pagination.total_count as number);
          setHasMorePages(politicians.length < (response.pagination.total_count as number));
        } else {
          setHasMorePages(false);
        }
        
        // Set politicians data
        if (politicians.length > 0) {
          setAllPoliticians(politicians);
        }
        return politicians;
      }
      
      return null;
    } catch (err) {
      console.error('Error fetching politicians:', err);
      
      // Handle rate limit errors specially
      if (err instanceof Error && err.message.includes('429')) {
        setError(new Error('Rate limit exceeded. Please try again later.'));
      } else {
        const error = err instanceof Error ? err : new Error('An unknown error occurred');
        setError(error);
      }
      return null;
    }
  }, [
    filters.name, 
    filters.family_name, 
    filters.given_name,
    filters.include,
    useCurrentOnly
  ]);

  // Apply filters to the list of all fetched politicians
  const applyFilters = useCallback(() => {
    let filtered = [...allPoliticians];
    
    // Filter by current MPs only if the flag is set
    if (useCurrentOnly) {
      filtered = filtered.filter(p => 
        // Check if they have a current riding and party (active MPs)
        p.current_riding && p.current_party
      );
    } else if (filters.include === 'former') {
      // Only former MPs
      filtered = filtered.filter(p => 
        // Check if they DON'T have a current riding and party (former MPs)
        !(p.current_riding && p.current_party)
      );
    }
    // When include is 'all', we don't filter out anyone
    
    // Apply name filter (more comprehensive search)
    if (filters.name) {
      const lowercaseName = filters.name.toLowerCase();
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(lowercaseName) ||
        (p.family_name && p.family_name.toLowerCase().includes(lowercaseName)) ||
        (p.given_name && p.given_name.toLowerCase().includes(lowercaseName))
      );
    }
    
    // Apply party filter
    if (filters.party) {
      const lowercaseParty = filters.party.toLowerCase();
      filtered = filtered.filter(p => {
        // Check the current_party's short_name
        const currentPartyShortName = p.current_party?.short_name?.en?.toLowerCase();
        
        // Also check memberships for historical party affiliations
        const membershipParties = p.memberships?.some(m => 
          m.party?.short_name?.en?.toLowerCase().includes(lowercaseParty) ||
          m.party?.name?.en?.toLowerCase().includes(lowercaseParty)
        );
        
        return (currentPartyShortName && currentPartyShortName.includes(lowercaseParty)) || 
               membershipParties === true;
      });
    }
    
    // Apply province filter
    if (filters.province) {
      const lowercaseProvince = filters.province.toLowerCase();
      filtered = filtered.filter(p => 
        p.current_riding?.province?.toLowerCase() === lowercaseProvince
      );
    }
    
    setDisplayedPoliticians(filtered);
  }, [allPoliticians, filters, useCurrentOnly]);

  // Initial load - ONLY use cache, never hit API on initial load
  useEffect(() => {
    const initLoad = async () => {
      if (initialLoadDone) {
        // If we already did the initial load, just apply filters
        applyFilters();
        return;
      }
      
      setLoading(true);
      setError(null);
      setPage(1);
      
      if (allPoliticians.length === 0) {
        // Never force refresh on initial load, only use cache (false parameter)
        await fetchPoliticiansFromAPI(false);
      }
      
      setInitialLoadDone(true);
      setLoading(false);
    };
    
    initLoad();
  }, [fetchPoliticiansFromAPI, initialLoadDone, applyFilters, allPoliticians.length]);

  // Apply filters whenever our list of all politicians changes or when filters change
  useEffect(() => {
    applyFilters();
  }, [allPoliticians, applyFilters, filters.party, filters.province, filters.include, useCurrentOnly]);

  // Function to load more politicians - with improved error handling and cache-only mode
  const loadMore = useCallback(async () => {
    if (!hasMorePages || loading || loadingMore || refreshing) return;
    
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      setPage(nextPage);
      
      const moreFilters: PoliticianFilters = {
        limit: MAX_PAGE_SIZE,
        offset: (nextPage - 1) * MAX_PAGE_SIZE
      };
      
      // Add include filter based on currentOnly setting
      if (!useCurrentOnly) {
        moreFilters.include = filters.include || 'all';
      }
      
      // Get existing URLs to avoid duplicates
      const existingUrls = new Set(allPoliticians.map(p => p.url));
      
      // Fetch more politicians with details BUT always use cache (never force fresh)
      const response = await fetchPoliticians(moreFilters, true, false, true);
      if (response?.objects && response.objects.length > 0) {
        // Deduplicate in case the API returns overlapping results
        const uniqueNew = response.objects.filter(p => !existingUrls.has(p.url));
        
        if (uniqueNew.length > 0) {
          setAllPoliticians(prev => [...prev, ...uniqueNew]);
        }
        
        // Update pagination
        if (response.pagination && 'total_count' in response.pagination) {
          setTotalCount(response.pagination.total_count as number);
          const newTotal = allPoliticians.length + uniqueNew.length;
          setHasMorePages(newTotal < (response.pagination.total_count as number));
        } else {
          setHasMorePages(false);
        }
      } else {
        setHasMorePages(false);
      }
    } catch (err) {
      console.error('Error loading more politicians:', err);
      
      // Handle rate limit errors specially
      if (err instanceof Error && err.message.includes('429')) {
        setError(new Error('Rate limit exceeded. Please try again later.'));
      }
    } finally {
      setLoadingMore(false);
    }
  }, [
    fetchPoliticians, 
    hasMorePages, 
    loading, 
    loadingMore,
    refreshing,
    page, 
    allPoliticians,
    useCurrentOnly,
    filters.include
  ]);

  // Function to refresh the politicians list - ONLY explicit user action through the refresh button
  const refreshPoliticians = useCallback(async () => {
    if (loading || refreshing) return;
    
    setRefreshing(true);
    setError(null);
    setPage(1);
    
    // Force a refresh from the API - this is the ONLY place we should explicitly refresh
    // Pass true to indicate this is an explicit refresh
    await fetchPoliticiansFromAPI(true);
    
    setRefreshing(false);
  }, [fetchPoliticiansFromAPI, loading, refreshing]);

  // Function to set a single filter
  const setFilter = useCallback((key: keyof PoliticianFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Function to clear all filters
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);
  
  // Function to apply new filters
  const applyFilterObj = useCallback((newFilters: PoliticianFilters) => {
    setFilters(newFilters);
  }, []);

  return {
    politicians: displayedPoliticians,
    hasMorePages,
    loading: loading || loadingMore,
    refreshing,
    loadMore,
    refreshPoliticians,
    totalCount,
    filters,
    setFilter,
    clearFilters,
    error,
    useCurrentOnly,
    setUseCurrentOnly,
    applyFilters: applyFilterObj
  };
}

export default usePoliticians; 