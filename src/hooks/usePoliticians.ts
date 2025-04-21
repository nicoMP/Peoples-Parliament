import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchPoliticians, fetchPoliticianDetails } from '../services/parliamentService';
import { Politician, PoliticianFilters, PoliticianResponse } from '../types/parliament';
import { isPoliticiansCacheStale } from '../services/CachePoliticiansService';
import { WatchedPoliticiansService } from '../services/WatchedPoliticiansService';
import PoliticianFilterService from '../services/filters/PoliticianFilterService';

// New interface to track detailed loading status
interface PoliticianWithLoadStatus extends Politician {
  hasFullDetails?: boolean;
}

// Interface to expose from the hook
interface UsePoliticiansResult {
  politicians: PoliticianWithLoadStatus[];
  loading: boolean; // Represents initial loading or background refresh
  refreshing: boolean; // Explicit user pull-to-refresh
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
  updatePoliticianDetails: (politician: Politician) => Promise<Politician | null>;
}

// Maximum number of politicians to fetch in one request
const MAX_PAGE_SIZE = 250;
// Names to watch by default
const DEFAULT_WATCHED_NAMES = [
  'Jagmeet Singh',
  'Pierre Poilievre',
  'Yves-François Blanchet'
];

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
  const [displayedPoliticians, setDisplayedPoliticians] = useState<PoliticianWithLoadStatus[]>([]);
  // All politicians we've fetched so far (before filtering)
  const [allPoliticians, setAllPoliticians] = useState<PoliticianWithLoadStatus[]>([]);
  
  // Combined loading state for initial load or background refresh
  const [loading, setLoading] = useState<boolean>(true); 
  const [loadingMore, setLoadingMore] = useState<boolean>(false); 
  // Separate state for explicit pull-to-refresh
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

  // Create an instance of filter service
  const filterService = useMemo(() => PoliticianFilterService.getInstance(), []);
  
  // Get instance of WatchedPoliticiansService
  const watchedService = useMemo(() => WatchedPoliticiansService.getInstance(), []);

  // Memoize filtered politicians to avoid unnecessary re-calculations
  const filteredPoliticians = useMemo(() => {
    if (!initialLoadDone || allPoliticians.length === 0) return [];
    
    console.log(`[usePoliticians] Running memoized filter with ${allPoliticians.length} politicians`);
    return filterService.filterPoliticians(allPoliticians, filters, useCurrentOnly);
  }, [allPoliticians, filters, useCurrentOnly, initialLoadDone, filterService]);
  
  // Update displayed politicians when filteredPoliticians changes
  useEffect(() => {
    setDisplayedPoliticians(filteredPoliticians);
  }, [filteredPoliticians]);

  // Function to apply default watched status - only watches if not already explicitly watched/unwatched
  const applyDefaultWatches = useCallback(async (politiciansToCheck: Politician[]) => {
    console.log(`Checking default watches for ${politiciansToCheck.length} politicians`);
    // Keep track if any default watches were applied this run
    let defaultsApplied = false; 

    for (const politician of politiciansToCheck) {
        if (DEFAULT_WATCHED_NAMES.includes(politician.name)) {
            try {
                // Check if this politician is currently marked as watched in the DB
                const isCurrentlyWatched = await watchedService.isWatchingPolitician(politician.url);
                
                // Only apply the default watch if they are NOT currently in the watched table
                if (!isCurrentlyWatched) {
                    console.log(`Applying default watch to: ${politician.name} (not currently watched)`);
                    await watchedService.watchPolitician(politician);
                    defaultsApplied = true;
                }
            } catch (error) {
                console.error(`Error applying default watch check for ${politician.name}:`, error);
            }
        }
    }
    
    // If defaults were applied, we need to ensure the allPoliticians list reflects this.
    // We fetch the updated watch status for *all* politicians after defaults might have changed.
    if (defaultsApplied) {
        console.log('Defaults were applied, updating watch status for the entire list...');
        const listWithUpdatedStatus = await watchedService.updateWatchStatusInList(politiciansToCheck);
        return listWithUpdatedStatus;
    } else {
        // If no defaults were applied, still run updateWatchStatus to ensure consistency
        // This handles cases where a politician was unwatched in a previous session
        console.log('No defaults applied, but ensuring watch status consistency...');
        const listWithConsistentStatus = await watchedService.updateWatchStatusInList(politiciansToCheck);
        return listWithConsistentStatus;
    }

}, [watchedService]);
  
  /**
   * Check if a politician has complete details
   */
  const checkForCompleteDetails = useCallback((politician: Politician): PoliticianWithLoadStatus => {
    const hasContactInfo = !!(politician?.email || politician?.voice);
    const hasSocials = !!(
      politician?.other_info?.twitter_id || 
      politician?.other_info?.wikipedia_id || 
      politician?.links?.find(link => 
        link?.url?.includes('facebook.com') || 
        link?.url?.includes('twitter.com')
      )
    );
    const hasMemberships = !!(politician?.memberships && politician.memberships.length > 0);
    
    return {
      ...politician,
      hasFullDetails: !!(hasContactInfo || hasSocials || hasMemberships)
    };
  }, []);
  
  /**
   * Process a list of politicians to mark those with complete details
   */
  const markPoliticiansWithCompleteDetails = useCallback((politicians: Politician[]): PoliticianWithLoadStatus[] => {
    return politicians.map(politician => checkForCompleteDetails(politician));
  }, [checkForCompleteDetails]);
  
  // Fetch politicians from API or Cache - updated to mark details status
  const fetchPoliticiansData = useCallback(async (options: {
    forceRefresh?: boolean;
    skipRefresh?: boolean;
    loadMorePage?: number;
    isBackground?: boolean; // Flag for silent background fetches
    loadDetailsCompletely?: boolean;
  } = {}) => {
    const { forceRefresh = false, skipRefresh = false, loadMorePage, isBackground = false, loadDetailsCompletely = false } = options;
    
    // Only show loading indicator if it's NOT a background task or loadMore
    if (!isBackground && !loadMorePage) {
        setLoading(true); 
    }
    setError(null);
    
    let fetchedPoliticians: Politician[] | null = null;

    try {
      const apiFilters: PoliticianFilters = {
        limit: MAX_PAGE_SIZE * 2, // Increased limit
        offset: loadMorePage ? (loadMorePage - 1) * (MAX_PAGE_SIZE * 2) : 0
      };
      
      // Add include filter based on currentOnly setting
      if (!useCurrentOnly) {
        apiFilters.include = filters.include || 'all';
      }
      
      // Add other filters only if they exist (for API optimization if possible)
      if (filters.name) apiFilters.name = filters.name;
      if (filters.family_name) apiFilters.family_name = filters.family_name;
      if (filters.given_name) apiFilters.given_name = filters.given_name;
      
      console.log(`Fetching politicians with options:`, { forceRefresh, skipRefresh, loadMorePage, isBackground, apiFilters });
      
      // Fetch data using the parliamentService
      const response = await fetchPoliticians(apiFilters, true, forceRefresh, skipRefresh, loadDetailsCompletely);
      console.log('API Response:', response ? `Got ${response.objects?.length || 0} politicians` : 'No response');
      
      if (!response?.objects) {
        // If skipRefresh was true and we got nothing, it's not necessarily an error, just empty cache
        if (skipRefresh) return null;
        throw new Error('Invalid API response');
      }
      
      fetchedPoliticians = response.objects;
      
      // Update pagination state
      if (response.pagination && 'total_count' in response.pagination) {
        setTotalCount(response.pagination.total_count as number);
        const currentTotal = loadMorePage ? allPoliticians.length : 0;
        const newTotal = currentTotal + fetchedPoliticians.length;
        setHasMorePages(newTotal < (response.pagination.total_count as number));
      } else {
        setHasMorePages(false);
      }
      
    } catch (err) {
      console.error('Error fetching politicians:', err);
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      // Handle rate limit errors specially
      if (error.message.includes('429') || error.message.includes('Rate limit')) {
        setError(new Error('Rate limit exceeded. Please try again later.'));
      } else {
        setError(error);
      }
    } finally {
        // Ensure loading indicator is turned off if it wasn't a background task
        if (!isBackground && !loadMorePage) {
            setLoading(false);
        }
    }
    
    // Apply default watches and update watch status *after* fetching
    if (fetchedPoliticians && fetchedPoliticians.length > 0) {
      const updatedList = await applyDefaultWatches(fetchedPoliticians);
      
      // Mark politicians with complete details
      const markedList = markPoliticiansWithCompleteDetails(updatedList || fetchedPoliticians);
      
      return markedList; // Return the list with defaults applied, status updated, and details completeness marked
    }
    
    return fetchedPoliticians ? markPoliticiansWithCompleteDetails(fetchedPoliticians) : null;

  }, [
    filters.name, 
    filters.family_name, 
    filters.given_name,
    filters.include,
    useCurrentOnly,
    allPoliticians.length, // Needed for pagination calculation
    applyDefaultWatches,  // Include applyDefaultWatches dependency
    markPoliticiansWithCompleteDetails // Include marking function
  ]);

  // Initial load effect
  useEffect(() => {
    const initialLoad = async () => {
      console.log('Starting initial load...');
      setLoading(true); // Show loading for initial cache attempt
      
      // Step 1: Load from cache ONLY first
      // applyDefaultWatches will run inside fetchPoliticiansData
      const cachedPoliticians = await fetchPoliticiansData({ skipRefresh: true });
      
      // Step 2: Cache Hit?
      if (cachedPoliticians && cachedPoliticians.length > 0) {
        console.log(`Cache Hit: Loaded ${cachedPoliticians.length} politicians from cache initially.`);
        // Set state with data that potentially had defaults applied + status updated
        setAllPoliticians(cachedPoliticians);
        setLoading(false); // Hide loading indicator
        setInitialLoadDone(true);

        // Step 3: Check Staleness (only if cache hit)
        const isStale = await isPoliticiansCacheStale();
        if (isStale) {
          console.log('Cache is stale. Fetching fresh data silently in background...');
          // Fetch fresh data in the background - don't show loading indicator
          // Pass isBackground: true. applyDefaultWatches will run again.
          const freshPoliticians = await fetchPoliticiansData({ forceRefresh: true, isBackground: true });
          if (freshPoliticians) {
            console.log(`Background fetch completed with ${freshPoliticians.length} politicians.`);
            // Update the main list silently with potentially updated defaults/status
            setAllPoliticians(freshPoliticians);
          }
        } else {
          console.log('Cache is fresh, no background fetch needed.');
        }
      } else {
        // Step 4: Cache Miss or Empty
        console.log('Cache Miss or Empty. Fetching fresh data from API...');
        // setLoading(true) is already set
        // applyDefaultWatches will run inside fetchPoliticiansData
        const freshPoliticians = await fetchPoliticiansData({ forceRefresh: true });
        if (freshPoliticians) {
          console.log(`API fetch completed with ${freshPoliticians.length} politicians.`);
          // Set state with data that had defaults applied + status updated
          setAllPoliticians(freshPoliticians);
        } else {
          console.log('API fetch failed or returned empty.');
          setAllPoliticians([]); // Ensure it's empty on failure
        }
        setLoading(false); // Hide loading indicator after API fetch
        setInitialLoadDone(true);
      }
    };

    if (!initialLoadDone) {
      initialLoad();
    }
  }, [initialLoadDone, fetchPoliticiansData]); // Depend on fetchPoliticiansData

  // Function to load more politicians
  const loadMore = useCallback(async () => {
    if (!hasMorePages || loading || loadingMore || refreshing) return;
    
    console.log('Loading more politicians...');
    setLoadingMore(true);
    
    const nextPage = page + 1;
    // Load more fetches fresh for subsequent pages - applyDefaultWatches runs within fetchPoliticiansData
    const morePoliticians = await fetchPoliticiansData({ loadMorePage: nextPage, forceRefresh: false }); 
    
    if (morePoliticians && morePoliticians.length > 0) {
      const existingUrls = new Set(allPoliticians.map(p => p.url));
      // Filter out duplicates *before* setting state
      const uniqueNew = morePoliticians.filter(p => !existingUrls.has(p.url));
      if (uniqueNew.length > 0) {
        console.log(`Loaded ${uniqueNew.length} more unique politicians`);
        // Append the new, unique politicians (with defaults applied and status updated)
        setAllPoliticians(prev => [...prev, ...uniqueNew]);
        setPage(nextPage); // Only increment page if successful
      }
    } else {
      console.log('Load more returned no new politicians.');
      setHasMorePages(false); // Stop loading more if no results
    }
    
    setLoadingMore(false);
  }, [
    hasMorePages, 
    loading, 
    loadingMore, 
    refreshing, 
    page, 
    fetchPoliticiansData,
    allPoliticians // Needed for deduplication
  ]);

  // Function to refresh the politicians list (explicit user action)
  const refreshPoliticians = useCallback(async () => {
    if (loading || refreshing) return;
    
    console.log('User triggered refresh...');
    setRefreshing(true);
    setPage(1); // Reset page on refresh
    
    // Add loadDetailsCompletely: true to force fetching detailed information including social media
    const freshPoliticians = await fetchPoliticiansData({ forceRefresh: true, loadDetailsCompletely: true });
    if (freshPoliticians) {
      console.log(`Refresh completed with ${freshPoliticians.length} politicians with details`);
      setAllPoliticians(freshPoliticians);
    } else {
      // Handle potential error during refresh, maybe keep old data?
      console.warn('Refresh failed, keeping existing data if any.');
    }
    
    setRefreshing(false);
  }, [fetchPoliticiansData, loading, refreshing]);

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
  
  // Function to apply new filter object (used by FilterBar)
  const applyFilterObj = useCallback((newFilters: PoliticianFilters) => {
    console.log('[usePoliticians] applyFilterObj called with:', newFilters);
    
    // Use filter service to check if filters are equal
    if (filterService.areFiltersEqual(filters, newFilters)) {
      console.log('[usePoliticians] Filters unchanged, skipping update');
      return;
    }
    
    // Check if this is just a watched toggle using the filter service
    const isWatchedToggleOnly = filterService.isWatchedOnlyToggle(newFilters, filters);
    
    if (isWatchedToggleOnly) {
      console.log('[usePoliticians] Watch toggle only, using fast path');
      
      // Fast path for watched_only toggle (optimized)
      const newWatchedState = 'watched_only' in newFilters ? newFilters.watched_only : false;
      
      // Update the filters
      setFilters(prev => {
        if (newWatchedState) {
          return { ...prev, watched_only: true };
        } else {
          // Remove watched_only flag if present
          const { watched_only, ...rest } = prev;
          return rest;
        }
      });
      
      // If turning on watched_only, we can directly filter just for watched politicians
      if (newWatchedState) {
        // Get just the watched politicians
        const watched = allPoliticians.filter(p => p.isWatching === true);
        
        // Sort watched politicians
        watched.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        
        // Directly update displayed politicians for immediate UI feedback
        setDisplayedPoliticians(watched);
      }
      // If turning off, the memoized filter will handle it
    } else {
      // Normal filter update - just update the filters state and let
      // the memoized filteredPoliticians handle the actual filtering
      setFilters(newFilters);
    }
  }, [filters, allPoliticians, filterService]);

  // New function to fetch and update details for a specific politician
  const updatePoliticianDetails = useCallback(async (politician: Politician): Promise<Politician | null> => {
    if (!politician?.url) {
      console.error('Cannot update details for politician without URL');
      return null;
    }
    
    try {
      console.log(`Fetching detailed information for ${politician.name}`);
      
      // Fetch detailed information from API
      const detailedPolitician = await fetchPoliticianDetails(politician.url, true);
      
      // Preserve important fields from original politician
      if (politician.isWatching !== undefined) {
        detailedPolitician.isWatching = politician.isWatching;
      }
      
      if (politician.cached_image && !detailedPolitician.cached_image) {
        detailedPolitician.cached_image = politician.cached_image;
      }
      
      // Mark as having full details
      const markedPolitician = checkForCompleteDetails(detailedPolitician);
      markedPolitician.hasFullDetails = true; // Explicitly mark as having full details
      
      // Update the politician in the main list
      setAllPoliticians(prev => 
        prev.map(p => 
          p.url === politician.url ? markedPolitician : p
        )
      );
      
      console.log(`Successfully updated details for ${politician.name}`);
      return markedPolitician;
    } catch (error) {
      console.error(`Error updating details for ${politician.name}:`, error);
      return null;
    }
  }, [checkForCompleteDetails]);

  return {
    politicians: displayedPoliticians,
    hasMorePages,
    // Combine loading states for the UI - make sure initialLoadDone is considered
    loading: (loading || !initialLoadDone) && !refreshing && !loadingMore, 
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
    applyFilters: applyFilterObj,
    updatePoliticianDetails
  };
}

export default usePoliticians; 