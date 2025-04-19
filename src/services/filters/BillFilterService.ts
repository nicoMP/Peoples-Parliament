import { ApiBill } from '@src/types/bill';

export type SearchType = 'default' | 'sponsor' | 'status' | 'type';
export type RoyalAssentFilter = 'in_progress' | 'none' | 'both';
export type SortBy = 'date' | 'status' | 'number';
export type DateField = keyof Pick<ApiBill, 
  'LatestActivityDateTime' | 
  'PassedHouseFirstReadingDateTime' | 
  'PassedHouseSecondReadingDateTime' | 
  'PassedHouseThirdReadingDateTime' | 
  'PassedSenateFirstReadingDateTime' | 
  'PassedSenateSecondReadingDateTime' | 
  'PassedSenateThirdReadingDateTime' | 
  'ReceivedRoyalAssentDateTime'
>;

export interface BillFilterOptions {
  searchText?: string;
  searchType?: SearchType;
  royalAssentFilter?: RoyalAssentFilter;
  lastInteractionDays?: number;
  sortBy?: SortBy;
  startDate?: Date;
  endDate?: Date;
  dateField?: DateField;
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
      .sort((a, b) => this.sortBills(a, b, options.sortBy, options.dateField));
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
      if (daysSinceInteraction > options.lastInteractionDays) {
        return false;
      }
    }

    if (options.startDate || options.endDate) {
      const dateField = options.dateField || 'LatestActivityDateTime';
      const date = new Date(bill[dateField] || 0);
      const dateTime = date.getTime();

      if (options.startDate && dateTime < options.startDate.getTime()) {
        return false;
      }

      if (options.endDate && dateTime > options.endDate.getTime()) {
        return false;
      }
    }

    return true;
  }

  private sortBills(a: ApiBill, b: ApiBill, sortBy?: SortBy, dateField?: DateField): number {
    switch (sortBy) {
      case 'date':
        const field = dateField || 'LatestActivityDateTime';
        return this.compareDates(
          new Date(b[field] || 0),
          new Date(a[field] || 0)
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

    if (dates.length === 0) {
      return new Date(0); // Return a very old date if no interaction dates exist
    }

    const maxDate = new Date(Math.max(...dates.map(d => new Date(d).getTime())));
    return maxDate;
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