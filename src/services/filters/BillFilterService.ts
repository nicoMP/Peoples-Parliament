import { ApiBill } from '@src/types/bill';

export type SearchType = 'default' | 'sponsor' | 'status' | 'type';
export type RoyalAssentFilter = 'in_progress' | 'none' | 'both';
export type SortBy = 'date' | 'status' | 'number';

export interface BillFilterOptions {
  searchText?: string;
  searchType?: SearchType;
  royalAssentFilter?: RoyalAssentFilter;
  lastInteractionDays?: number;
  sortBy?: SortBy;
}

export class BillFilterService {
  private static instance: BillFilterService;
  private readonly SEARCH_TYPES = {
    default: (bill: ApiBill, searchText: string) => {
      const searchLower = searchText.toLowerCase();
      return (
        bill.BillNumberFormatted.toLowerCase().includes(searchLower) ||
        bill.LongTitleEn.toLowerCase().includes(searchLower) ||
        bill.SponsorEn.toLowerCase().includes(searchLower) ||
        bill.CurrentStatusEn.toLowerCase().includes(searchLower) ||
        bill.BillTypeEn.toLowerCase().includes(searchLower)
      );
    },
    sponsor: (bill: ApiBill, searchText: string) => 
      bill.SponsorEn.toLowerCase().includes(searchText),
    status: (bill: ApiBill, searchText: string) => 
      bill.CurrentStatusEn.toLowerCase().includes(searchText),
    type: (bill: ApiBill, searchText: string) => 
      bill.BillTypeEn.toLowerCase().includes(searchText),
  };

  private constructor() {}

  public static getInstance(): BillFilterService {
    if (!BillFilterService.instance) {
      BillFilterService.instance = new BillFilterService();
    }
    return BillFilterService.instance;
  }

  public filterBills(bills: ApiBill[], options: BillFilterOptions): ApiBill[] {
    return bills
      .filter(bill => this.applyFilters(bill, options))
      .sort((a, b) => this.sortBills(a, b, options.sortBy));
  }

  private applyFilters(bill: ApiBill, options: BillFilterOptions): boolean {
    if (options.searchText) {
      const searchLower = options.searchText.toLowerCase();
      const searchType = options.searchType || 'default';
      const searchFunction = this.SEARCH_TYPES[searchType];
      
      if (!searchFunction(bill, searchLower)) {
        return false;
      }
    }

    if (options.royalAssentFilter) {
      const hasAssent = !!bill.ReceivedRoyalAssentDateTime;
      const isInProgress = bill.CurrentStatusEn.toLowerCase().includes('royal assent');
      
      switch (options.royalAssentFilter) {
        case 'in_progress':
          if (!isInProgress) return false;
          break;
        case 'none':
          if (hasAssent || isInProgress) return false;
          break;
        case 'both':
          // No filtering needed
          break;
      }
    }

    if (options.lastInteractionDays !== undefined) {
      const lastInteractionDate = this.getLastInteractionDate(bill);
      const daysSinceInteraction = this.getDaysSince(lastInteractionDate);
      if (daysSinceInteraction > options.lastInteractionDays) return false;
    }

    return true;
  }

  private sortBills(a: ApiBill, b: ApiBill, sortBy?: SortBy): number {
    switch (sortBy) {
      case 'date':
        return this.compareDates(
          this.getLastInteractionDate(b),
          this.getLastInteractionDate(a)
        );
      case 'status':
        return a.CurrentStatusEn.localeCompare(b.CurrentStatusEn);
      case 'number':
        return a.BillNumber - b.BillNumber;
      default:
        return 0;
    }
  }

  private getLastInteractionDate(bill: ApiBill): Date {
    const dates = [
      bill.ReceivedRoyalAssentDateTime,
      bill.PassedHouseThirdReadingDateTime,
      bill.PassedHouseSecondReadingDateTime,
      bill.PassedHouseFirstReadingDateTime,
      bill.PassedSenateThirdReadingDateTime,
      bill.PassedSenateSecondReadingDateTime,
      bill.PassedSenateFirstReadingDateTime,
    ].filter(date => date) as string[];

    return dates.length > 0 
      ? new Date(Math.max(...dates.map(d => new Date(d).getTime()))) 
      : new Date(0);
  }

  private getDaysSince(date: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private compareDates(date1: Date, date2: Date): number {
    return date1.getTime() - date2.getTime();
  }
} 