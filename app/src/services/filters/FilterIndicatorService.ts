import { BillFilterOptions, RoyalAssentFilter, SearchType } from './BillFilterService';

/**
 * Service to calculate the number of active filters based on filter options
 */
export class FilterIndicatorService {
  private static instance: FilterIndicatorService;

  private constructor() {}

  public static getInstance(): FilterIndicatorService {
    if (!FilterIndicatorService.instance) {
      FilterIndicatorService.instance = new FilterIndicatorService();
    }
    return FilterIndicatorService.instance;
  }

  /**
   * Calculate the number of active filters
   * @param options Filter options
   * @returns Number of active filters
   */
  public countActiveFilters(options: BillFilterOptions): number {
    let count = 0;

    // Count search text as a filter if present
    if (options.searchText && options.searchText.trim().length > 0) {
      count++;
    }

    // Count search type as a filter if not default
    if (options.searchType && options.searchType !== 'default') {
      count++;
    }

    // Count Royal Assent filter if not set to both (both = no filter)
    if (options.royalAssentFilter && options.royalAssentFilter !== 'both') {
      count++;
    }

    // Count date filter if present
    if (options.startDate || options.endDate) {
      count++;
    }

    // Count status filter if not set to all (all = no filter)
    if (options.statusFilter && options.statusFilter !== 'all') {
      count++;
    }

    return count;
  }

  /**
   * Get detailed breakdown of active filters
   */
  public getActiveFiltersBreakdown(options: BillFilterOptions): {
    hasSearchText: boolean;
    hasNonDefaultSearchType: boolean;
    hasRoyalAssentFilter: boolean;
    hasDateFilter: boolean;
    hasStatusFilter: boolean;
  } {
    return {
      hasSearchText: !!(options.searchText && options.searchText.trim().length > 0),
      hasNonDefaultSearchType: !!(options.searchType && options.searchType !== 'default'),
      hasRoyalAssentFilter: !!(options.royalAssentFilter && options.royalAssentFilter !== 'both'),
      hasDateFilter: !!(options.startDate || options.endDate),
      hasStatusFilter: !!(options.statusFilter && options.statusFilter !== 'all')
    };
  }
} 