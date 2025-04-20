/**
 * Parliament API Service
 * 
 * Service for interacting with the OpenParliament API
 * API Documentation: https://api.openparliament.ca/
 */

import axios from 'axios';
import { PoliticianFilters, PoliticianResponse, Politician } from '../types/parliament';
import CacheService from './CacheService';

const BASE_URL = 'https://api.openparliament.ca';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Cache categories
const CACHE_CATEGORIES = {
  POLITICIANS: 'politicians',
  POLITICIAN_IMAGES: 'politician_images',
  BILLS: 'bills',
  DEBATES: 'debates',
  COMMITTEES: 'committees'
};

// Configure timeout and batch settings with reasonable values
const CONFIG = {
  REQUEST_TIMEOUT: 3000, // 3 seconds timeout instead of 5
  POLITICIAN_BATCH_SIZE: 5, // Increase from 3 to 5
  BATCH_DELAY: 500, // Decrease from 1000ms to 500ms
};

/**
 * Processes an image URL to ensure it's a valid absolute URL
 * 
 * @param imageUrl Relative or absolute image URL
 * @returns Proper absolute URL
 */
const processImageUrl = (imageUrl: string | undefined): string | undefined => {
  if (!imageUrl) return undefined;
  
  // Clean up the URL
  const cleanUrl = imageUrl.replace(/\s/g, '');
  
  // OpenParliament API provides relative URLs
  if (!cleanUrl.startsWith('http')) {
    // The correct URL format appears to be from the OpenParliament API
    return `https://api.openparliament.ca${cleanUrl}`;
  }
  
  return cleanUrl;
};

/**
 * Caches a politician's image locally
 * 
 * @param politician The politician object with image URL
 * @returns Updated politician with local image URL if successful
 */
const cachePoliticianImage = async (politician: Politician): Promise<Politician> => {
  if (!politician.image) return politician;
  
  try {
    const cacheService = CacheService.getInstance();
    const remoteImageUrl = processImageUrl(politician.image);
    
    if (!remoteImageUrl) return politician;
    
    // Cache the image locally
    const localImagePath = await cacheService.ensureImageCached(
      remoteImageUrl,
      CACHE_CATEGORIES.POLITICIAN_IMAGES,
      ONE_WEEK_MS
    );
    
    if (localImagePath) {
      // Return a new politician object with the local image path
      return {
        ...politician,
        cached_image: localImagePath,
        image: remoteImageUrl // Keep the original as well
      };
    }
    
    return politician;
  } catch (error) {
    console.error('Error caching politician image:', error);
    return politician;
  }
};

/**
 * Fetches data from the OpenParliament API
 * 
 * @param route - API route to hit (e.g., '/bills/', '/debates/')
 * @param params - Additional query parameters
 * @returns Promise with the response data
 */
export const fetchParliamentData = async (route: string, params: Record<string, any> = {}) => {
  try {
    // Ensure route starts with a slash
    const formattedRoute = route.startsWith('/') ? route : `/${route}`;
    
    // Always include format=json in the parameters
    const queryParams = {
      format: 'json',
      ...params,
    };
    
    const response = await axios.get(`${BASE_URL}${formattedRoute}`, {
      params: queryParams,
    });
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Parliament API Error:', error.response?.data || error.message);
      throw new Error(`Parliament API Error: ${error.response?.status} - ${error.message}`);
    }
    console.error('Parliament API Error:', error);
    throw error;
  }
};

/**
 * Fetches detailed information for a specific politician using their URL
 * 
 * @param url - The relative URL for the politician (e.g., '/politicians/pierre-poilievre/')
 * @param forceFresh - If true, bypass cache and fetch fresh data
 * @returns Promise with detailed politician data
 */
export const fetchPoliticianDetails = async (url: string, forceFresh: boolean = false): Promise<Politician> => {
  // Some URLs might already include the format=json parameter, so check for that
  const separator = url.includes('?') ? '&' : '?';
  const requestUrl = url.includes('format=json') ? url : `${url}${separator}format=json`;
  
  // Create a cache key from the URL
  const cacheKey = `politician_details_${url.replace(/\W/g, '_')}`;
  const cacheService = CacheService.getInstance();
  
  try {
    // Try to get from cache first if not forcing fresh data
    if (!forceFresh) {
      const cachedData = await cacheService.getFromCache<Politician>(cacheKey, ONE_WEEK_MS);
      if (cachedData) {
        console.log(`Retrieved politician details for ${url} from cache`);
        return cachedData;
      }
    }
    
    // If not in cache or forcing fresh, fetch from API
    const response = await axios.get(`${BASE_URL}${requestUrl}`, {
      // Add timeout to avoid long-hanging requests
      timeout: CONFIG.REQUEST_TIMEOUT,
    });
    
    // Process the politician's image for local caching
    const processedPolitician = await cachePoliticianImage(response.data);
    
    // Cache the result
    await cacheService.saveToCache(cacheKey, processedPolitician, CACHE_CATEGORIES.POLITICIANS);
    
    return processedPolitician;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Check specifically for rate limiting errors (HTTP 429)
      if (error.response?.status === 429) {
        console.error('Rate limit exceeded when fetching politician details');
        // Try to return cached data even if it's stale, as a fallback
        const staleData = await cacheService.getFromCache<Politician>(cacheKey, Infinity);
        if (staleData) {
          console.log(`Using stale cached data for ${url} due to rate limiting`);
          return staleData;
        }
        throw new Error(`Rate limit exceeded: ${error.message}`);
      }
      
      console.error('Error fetching politician details:', error.response?.data || error.message);
      throw new Error(`Failed to fetch politician details: ${error.response?.status} - ${error.message}`);
    }
    console.error('Error fetching politician details:', error);
    throw error;
  }
};

/**
 * Fetches list of bills
 * 
 * @param params - Additional query parameters like session, status, etc.
 */
export const fetchBills = async (params: Record<string, any> = {}) => {
  return fetchParliamentData('/bills/', params);
};

/**
 * Fetches a specific bill by ID
 * 
 * @param billId - The bill ID (e.g., 'C-11')
 * @param params - Additional query parameters
 */
export const fetchBillById = async (billId: string, params: Record<string, any> = {}) => {
  return fetchParliamentData(`/bills/${billId}/`, params);
};

/**
 * Fetches list of MPs (Members of Parliament)
 * 
 * @param params - Additional query parameters
 */
export const fetchMPs = async (params: Record<string, any> = {}) => {
  return fetchParliamentData('/politicians/', params);
};

/**
 * Processes a list of politicians to cache their images
 * 
 * @param politicians List of politicians to process
 * @returns Updated list with cached images
 */
const processPoliticiansImages = async (politicians: Politician[]): Promise<Politician[]> => {
  if (!politicians.length) return politicians;
  
  try {
    // Process each politician in parallel
    const processedPoliticians = await Promise.all(
      politicians.map(politician => cachePoliticianImage(politician))
    );
    
    return processedPoliticians;
  } catch (error) {
    console.error('Error processing politicians images:', error);
    return politicians;
  }
};

/**
 * Fetches politicians based on filters
 * 
 * @param filters - Filters to apply (family_name, given_name, include, name)
 * @param loadDetails - Whether to load detailed information for each politician
 * @param forceFresh - If true, bypass cache and fetch fresh data
 * @param skipFresh - If true, only use cached data and never fetch from API
 * @returns Promise with politicians data
 */
export const fetchPoliticians = async (
  filters: PoliticianFilters = {}, 
  loadDetails: boolean = false,
  forceFresh: boolean = false,
  skipFresh: boolean = false
): Promise<PoliticianResponse> => {
  const params: Record<string, any> = {};
  
  if (filters.family_name) {
    params.family_name = filters.family_name;
  }
  
  if (filters.given_name) {
    params.given_name = filters.given_name;
  }
  
  if (filters.name) {
    params.name = filters.name;
  }
  
  if (filters.include) {
    params.include = filters.include;
  }
  
  if (filters.limit) {
    params.limit = filters.limit;
  }
  
  if (filters.offset) {
    params.offset = filters.offset;
  }
  
  // Create a cache key based on the filters
  const cacheKey = `politicians_${JSON.stringify(params)}_details_${loadDetails}`;
  const cacheService = CacheService.getInstance();
  
  try {
    // Try to get from cache first if not forcing fresh data
    if (!forceFresh) {
      const cachedData = await cacheService.getFromCache<PoliticianResponse>(cacheKey, ONE_WEEK_MS);
      if (cachedData) {
        console.log('Retrieved politicians list from cache');
        return cachedData;
      }
    }
    
    // If skipFresh is true, don't fetch from API, try to get stale data from cache
    if (skipFresh) {
      console.log('skipFresh is true, trying to get stale data from cache');
      const staleData = await cacheService.getFromCache<PoliticianResponse>(cacheKey, Infinity);
      if (staleData) {
        console.log('Using stale cached data');
        return staleData;
      }
      
      // If no data found in cache, return empty response
      console.log('No cached data found, returning empty response');
      return {
        objects: [],
        pagination: {
          next_url: null,
          previous_url: null,
          offset: 0,
          limit: filters.limit || 0
        }
      };
    }
    
    // If not in cache or forcing fresh, fetch from API
    const response = await fetchParliamentData('/politicians/', params) as PoliticianResponse;

    // Process images for the basic politician objects and save the initial response
    response.objects = await processPoliticiansImages(response.objects);
    
    // Save basic data to cache immediately so subsequent requests have something to work with
    await cacheService.saveToCache(cacheKey, response, CACHE_CATEGORIES.POLITICIANS);

    // If loadDetails is true, fetch full details for each politician
    if (loadDetails && response.objects.length > 0) {
      // We'll process in parallel batches to speed things up while still managing rate limits
      const BATCH_SIZE = CONFIG.POLITICIAN_BATCH_SIZE;
      const DELAY_BETWEEN_BATCHES = CONFIG.BATCH_DELAY;
      const detailedPoliticians: Politician[] = [];
      
      // Split politicians into batches
      const batches: Politician[][] = [];
      for (let i = 0; i < response.objects.length; i += BATCH_SIZE) {
        batches.push(response.objects.slice(i, i + BATCH_SIZE));
      }
      
      // Process batches with a slight delay between them
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`Processing batch ${batchIndex + 1} of ${batches.length}`);
        
        // Process current batch
        const batchPromises = batch.map(async (politician) => {
          try {
            // Fetch detailed data using the politician's URL
            const details = await fetchPoliticianDetails(politician.url, forceFresh);
            console.log(details)
            return { ...politician, ...details };
          } catch (error) {
            // If we hit a rate limit, don't fail the whole batch
            if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
              console.error(`Rate limiting detected for ${politician.name}, using basic data`);
              return politician;
            }
            
            console.error(`Error fetching details for ${politician.name}:`, error);
            return politician;
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        detailedPoliticians.push(...batchResults);
        
        // If we detect a rate limit in this batch, break early
        if (batchResults.some(p => p.memberships === undefined)) {
          console.warn('Rate limiting detected, stopping detail fetches');
          // Add remaining politicians without details
          for (let j = batchIndex + 1; j < batches.length; j++) {
            detailedPoliticians.push(...batches[j]);
          }
          break;
        }
        
        // Save intermediate results to cache so if it fails later, we have some detailed data
        if (detailedPoliticians.length > 0) {
          const intermediateResponse = { ...response, objects: detailedPoliticians };
          await cacheService.saveToCache(cacheKey, intermediateResponse, CACHE_CATEGORIES.POLITICIANS);
        }
        
        // If not the last batch, add a delay
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
      }
      
      // Replace the original politicians with the detailed ones
      response.objects = detailedPoliticians;
    }
    
    // Cache the final result
    await cacheService.saveToCache(cacheKey, response, CACHE_CATEGORIES.POLITICIANS);
    
    return response;
  } catch (error) {
    // Check for rate limiting
    if (error instanceof Error && error.message.includes('429')) {
      console.error('Rate limit exceeded when fetching politicians list');
      
      // Try to return stale cached data as a fallback
      const staleData = await cacheService.getFromCache<PoliticianResponse>(cacheKey, Infinity);
      if (staleData) {
        console.log('Using stale cached data due to rate limiting');
        return staleData;
      }
    }
    
    console.error('Error fetching politicians:', error);
    throw error;
  }
};

/**
 * Fetches a specific MP by ID
 * 
 * @param mpId - The MP's identifier
 * @param params - Additional query parameters
 */
export const fetchMPById = async (mpId: string, params: Record<string, any> = {}) => {
  return fetchParliamentData(`/politicians/${mpId}/`, params);
};

/**
 * Fetches debates
 * 
 * @param params - Additional query parameters like date
 */
export const fetchDebates = async (params: Record<string, any> = {}) => {
  return fetchParliamentData('/debates/', params);
};

/**
 * Fetches committees
 * 
 * @param params - Additional query parameters
 */
export const fetchCommittees = async (params: Record<string, any> = {}) => {
  return fetchParliamentData('/committees/', params);
};

/**
 * Searches across the parliamentary data
 * 
 * @param query - Search query
 * @param params - Additional query parameters
 */
export const searchParliament = async (query: string, params: Record<string, any> = {}) => {
  return fetchParliamentData('/search/', { 
    q: query,
    ...params 
  });
};

/**
 * Forces a refresh of all politician data in the cache
 */
export const refreshPoliticiansCache = async (): Promise<void> => {
  try {
    const cacheService = CacheService.getInstance();
    await cacheService.clearCategoryCache(CACHE_CATEGORIES.POLITICIANS);
    console.log('Politicians cache cleared, will be refreshed on next fetch');
  } catch (error) {
    console.error('Error refreshing politicians cache:', error);
  }
};

/**
 * Forces a refresh of all politician images in the cache
 */
export const refreshPoliticianImagesCache = async (): Promise<void> => {
  try {
    const cacheService = CacheService.getInstance();
    await cacheService.clearCategoryImageCache(CACHE_CATEGORIES.POLITICIAN_IMAGES);
    console.log('Politician images cache cleared, will be re-downloaded on next fetch');
  } catch (error) {
    console.error('Error refreshing politician images cache:', error);
  }
};

export default {
  fetchParliamentData,
  fetchBills,
  fetchBillById,
  fetchMPs,
  fetchMPById,
  fetchDebates,
  fetchCommittees,
  searchParliament,
  fetchPoliticians,
  fetchPoliticianDetails,
  refreshPoliticiansCache,
  refreshPoliticianImagesCache
}; 