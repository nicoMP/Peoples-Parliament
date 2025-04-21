import { Politician, PoliticianFilters } from '@src/types/parliament';

export type PoliticianIncludeOption = 'all' | 'former' | 'current';
export type PoliticianSortBy = 'name' | 'party' | 'province' | 'watching';

export class PoliticianFilterService {
  private static instance: PoliticianFilterService;

  private constructor() {}

  public static getInstance(): PoliticianFilterService {
    if (!PoliticianFilterService.instance) {
      PoliticianFilterService.instance = new PoliticianFilterService();
    }
    return PoliticianFilterService.instance;
  }

  /**
   * Filter politicians based on provided options
   */
  public filterPoliticians(politicians: Politician[], options: PoliticianFilters, useCurrentOnly: boolean): Politician[] {
    console.log(`[PoliticianFilterService] Filtering ${politicians.length} politicians with options:`, options);
    
    // Return early if no politicians
    if (politicians.length === 0) return [];
    
    // Create a new array to avoid mutating the original
    let filtered = [...politicians];
    
    // Apply watched_only filter - takes precedence if set
    if (options.watched_only) {
      filtered = filtered.filter(p => p.isWatching === true);
      console.log(`[PoliticianFilterService] After watched_only filter: ${filtered.length} politicians`);
    } else {
      // Apply current MPs filter if needed
      if (useCurrentOnly) {
        filtered = filtered.filter(p => p.current_riding && p.current_party);
        console.log(`[PoliticianFilterService] After current-only filter: ${filtered.length} politicians`);
      } else if (options.include === 'former') {
        // Only former MPs
        filtered = filtered.filter(p => !(p.current_riding && p.current_party));
        console.log(`[PoliticianFilterService] After former-only filter: ${filtered.length} politicians`);
      }
      
      // Apply improved name filter
      if (options.name) {
        const searchTerms = this.prepareSearchTerms(options.name);
        
        // If multiple search terms, require all terms to match (AND behavior)
        if (searchTerms.length > 0) {
          filtered = filtered.filter(p => {
            // Extract normalized politician name parts
            const nameParts = this.extractNameParts(p);
            
            // Each search term must match at least one name part
            return searchTerms.every(term => 
              nameParts.some(part => part.includes(term))
            );
          });
        }
        
        console.log(`[PoliticianFilterService] After name filter: ${filtered.length} politicians`);
      }
      
      // Apply party filter
      if (options.party) {
        const lowercaseParty = options.party.toLowerCase();
        filtered = filtered.filter(p => {
          const currentPartyShortName = p.current_party?.short_name?.en?.toLowerCase();
          const membershipParties = p.memberships?.some(m => 
            (m.party?.short_name?.en && m.party.short_name.en.toLowerCase().includes(lowercaseParty)) ||
            (m.party?.name?.en && m.party.name.en.toLowerCase().includes(lowercaseParty))
          );
          return (currentPartyShortName && currentPartyShortName.includes(lowercaseParty)) || 
                membershipParties === true;
        });
        console.log(`[PoliticianFilterService] After party filter: ${filtered.length} politicians`);
      }
      
      // Apply province filter
      if (options.province) {
        const lowercaseProvince = options.province.toLowerCase();
        filtered = filtered.filter(p => 
          p.current_riding?.province?.toLowerCase() === lowercaseProvince
        );
        console.log(`[PoliticianFilterService] After province filter: ${filtered.length} politicians`);
      }
    }
    
    // Sort politicians based on options
    this.sortPoliticians(filtered, options);
    
    console.log(`[PoliticianFilterService] Final sorted list has ${filtered.length} politicians`);
    return filtered;
  }
  
  /**
   * Extracts and normalizes all name parts from a politician
   * @param politician The politician object
   * @returns Array of lowercase name parts for searching
   */
  private extractNameParts(politician: Politician): string[] {
    const parts: string[] = [];
    
    // Add full name if available
    if (politician.name) {
      parts.push(politician.name.toLowerCase());
      
      // Also add individual name parts from full name
      politician.name.split(/\s+/).forEach(part => {
        if (part.length > 1) { // Skip single character parts
          parts.push(part.toLowerCase());
        }
      });
    }
    
    // Add given and family names separately
    if (politician.given_name) {
      parts.push(politician.given_name.toLowerCase());
    }
    
    if (politician.family_name) {
      parts.push(politician.family_name.toLowerCase());
    }
    
    return parts.filter(Boolean);
  }
  
  /**
   * Prepare search terms by normalizing and splitting into parts
   * @param searchText The search text entered by the user
   * @returns Array of lowercase, cleaned search terms
   */
  private prepareSearchTerms(searchText: string): string[] {
    if (!searchText) return [];
    
    // Trim, lowercase, and split by spaces
    const terms = searchText.trim().toLowerCase().split(/\s+/);
    
    // Filter out single character terms and empty terms
    return terms.filter(term => term.length > 1);
  }
  
  /**
   * Sort politicians based on provided options
   */
  private sortPoliticians(politicians: Politician[], options: PoliticianFilters): void {
    politicians.sort((a, b) => {
      // First sort by watch status (watched politicians first)
      if (a.isWatching && !b.isWatching) return -1;
      if (!a.isWatching && b.isWatching) return 1;
      
      // Then sort alphabetically by name
      return (a.name || '').localeCompare(b.name || '');
    });
  }
  
  /**
   * Method to check if two sets of filter options are equal
   */
  public areFiltersEqual(a: PoliticianFilters, b: PoliticianFilters): boolean {
    return (
      a.name === b.name &&
      a.party === b.party &&
      a.province === b.province &&
      a.include === b.include &&
      a.watched_only === b.watched_only
    );
  }
  
  /**
   * Check if this is only a watched_only toggle
   */
  public isWatchedOnlyToggle(newFilters: PoliticianFilters, oldFilters: PoliticianFilters): boolean {
    const keys1 = Object.keys(newFilters);
    const keys2 = Object.keys(oldFilters);
    
    // Special case: toggling watched_only on and off
    const isTogglingWatchedOnly = 
      (keys1.length === 1 && keys1[0] === 'watched_only' && keys2.length === 0) || 
      (keys2.length === 1 && keys2[0] === 'watched_only' && keys1.length === 0) ||
      (keys1.includes('watched_only') && keys2.includes('watched_only') && 
        newFilters.watched_only !== oldFilters.watched_only &&
        Object.keys(newFilters).length === Object.keys(oldFilters).length);
        
    return isTogglingWatchedOnly;
  }
  
  /**
   * Update a politician's position in the list when their watch status changes
   * This method efficiently updates a single politician without refiltering the entire list
   */
  public updatePoliticianWatchPosition(
    politicians: Politician[],
    updatedPolitician: Politician,
    options: PoliticianFilters,
    useCurrentOnly: boolean
  ): Politician[] {
    // Make a copy of the politicians array to avoid mutating the original
    let updatedList = [...politicians];
    
    // Remove the politician with the matching URL (old version)
    updatedList = updatedList.filter(p => p.url !== updatedPolitician.url);
    
    // Add the updated politician
    updatedList.push(updatedPolitician);
    
    // Re-sort the list with the updated politician
    this.sortPoliticians(updatedList, options);
    
    return updatedList;
  }
}

export default PoliticianFilterService; 