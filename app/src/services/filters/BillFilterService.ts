import { ApiBill } from '@/app/src/types/bill';
import { SavedBill } from '@/app/src/services/BillPdfService';

export type SearchType = 'default' | 'sponsor' | 'status' | 'type';
export type RoyalAssentFilter = 'in_progress' | 'none' | 'both';
export type SortBy = 'date' | 'status' | 'number';
export type StatusFilter = 'all' | 'liked' | 'disliked' | 'saved' | 'watching';
export type DateField = 
  | 'LatestActivityDateTime'
  | 'PassedHouseFirstReadingDateTime'
  | 'PassedHouseSecondReadingDateTime'
  | 'PassedHouseThirdReadingDateTime'
  | 'PassedSenateFirstReadingDateTime'
  | 'PassedSenateSecondReadingDateTime'
  | 'PassedSenateThirdReadingDateTime'
  | 'ReceivedRoyalAssentDateTime'
  | 'LastUpdatedDateTime';

// Mapping SavedBill fields to ApiBill fields for uniform filtering
const SAVED_BILL_FIELD_MAP = {
  'LatestActivityDateTime': 'lastUpdated',
  'BillNumberFormatted': 'billNumber',
  'BillTypeEn': 'billType',
  'LongTitleEn': 'title',
};

export interface BillFilterOptions {
  searchText?: string;
  searchType?: SearchType;
  royalAssentFilter?: RoyalAssentFilter;
  lastInteractionDays?: number;
  sortBy?: SortBy;
  startDate?: Date;
  endDate?: Date;
  dateField?: DateField;
  statusFilter?: StatusFilter;
  savedBills?: SavedBill[];
  liked?: boolean;
  watched?: boolean;
  sortOrder?: 'asc' | 'desc';
}

export class BillFilterService {
  private static instance: BillFilterService;
  private readonly SEARCH_TYPES = {
    default: (bill: ApiBill, searchText: string) => {
      const searchLower = searchText.toLowerCase();
      return (
        bill.BillNumberFormatted.toLowerCase().includes(searchLower) ||
        bill.LongTitleEn.toLowerCase().includes(searchLower) ||
        bill.SponsorEn?.toLowerCase().includes(searchLower) ||
        bill.CurrentStatusEn?.toLowerCase().includes(searchLower) ||
        bill.BillTypeEn?.toLowerCase().includes(searchLower)
      );
    },
    sponsor: (bill: ApiBill, searchText: string) => 
      bill.SponsorEn?.toLowerCase().includes(searchText),
    status: (bill: ApiBill, searchText: string) => 
      bill.CurrentStatusEn?.toLowerCase().includes(searchText),
    type: (bill: ApiBill, searchText: string) => 
      bill.BillTypeEn?.toLowerCase().includes(searchText),
  };

  private constructor() {}

  public static getInstance(): BillFilterService {
    if (!BillFilterService.instance) {
      BillFilterService.instance = new BillFilterService();
    }
    return BillFilterService.instance;
  }

  public filterBills(bills: ApiBill[], options: BillFilterOptions): ApiBill[] {
    let sortBy = options.sortBy || 'date';
    let dateField = options.dateField as DateField || 'LatestActivityDateTime';
    let sortOrder = options.sortOrder || 'desc';
    
    console.log(`FilterBills called with sortBy: ${sortBy}, field: ${dateField}, order: ${sortOrder}`);
    
    return bills
      .filter(bill => this.applyFilters(bill, options))
      .sort((a, b) => this.sortBills(a, b, sortBy, dateField, sortOrder));
  }

  /**
   * Filter saved bills using the same filtering logic as ApiBills
   * We'll map SavedBill properties to ApiBill properties where needed
   */
  public filterSavedBills(bills: SavedBill[], options: BillFilterOptions): SavedBill[] {
    return bills
      .filter(bill => this.applySavedBillFilters(bill, options))
      .sort((a, b) => this.sortSavedBills(a, b, options.sortBy, options.dateField, options.sortOrder));
  }

  private applySavedBillFilters(savedBill: SavedBill, options: BillFilterOptions): boolean {
    // Apply text search
    if (options.searchText?.trim()) {
      const searchLower = options.searchText.toLowerCase().trim();
      if (
        !savedBill.billNumber.toLowerCase().includes(searchLower) &&
        !savedBill.title.toLowerCase().includes(searchLower) &&
        !savedBill.billType.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }
    
    // Apply status filter
    if (options.statusFilter && options.statusFilter !== 'all') {
      switch (options.statusFilter) {
        case 'liked':
          if (savedBill.isLiked !== 1) return false;
          break;
        case 'disliked':
          if (savedBill.isDisliked !== 1) return false;
          break;
        case 'watching':
          if (savedBill.isWatching !== 1) return false;
          break;
        // All saved bills satisfy the 'saved' filter
      }
    }
    
    // Apply date filters (lastInteractionDays or custom date range)
    if (options.lastInteractionDays !== undefined) {
      const billDate = new Date(savedBill.lastUpdated);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - options.lastInteractionDays);
      if (billDate < cutoffDate) {
        return false;
      }
    }
    
    if (options.startDate || options.endDate) {
      const billDate = new Date(savedBill.lastUpdated);
      
      if (options.startDate && billDate < options.startDate) {
        return false;
      }
      
      if (options.endDate && billDate > options.endDate) {
        return false;
      }
    }
    
    // Apply liked/watched filters if specified
    if (options.liked !== undefined && savedBill.isLiked !== (options.liked ? 1 : 0)) {
      return false;
    }
    
    if (options.watched !== undefined && savedBill.isWatching !== (options.watched ? 1 : 0)) {
      return false;
    }
    
    return true;
  }

  private sortSavedBills(
    a: SavedBill, 
    b: SavedBill, 
    sortBy?: SortBy, 
    dateField?: DateField,
    sortOrder: 'asc' | 'desc' = 'desc'
  ): number {
    const sortMultiplier = sortOrder === 'asc' ? 1 : -1;
    
    if (sortBy === 'status') {
      // For saved bills, we don't have status info so default to sorting by date
      const dateA = new Date(a.lastUpdated).getTime();
      const dateB = new Date(b.lastUpdated).getTime();
      return (dateB - dateA) * sortMultiplier;
    }
    
    if (sortBy === 'number') {
      // Extract numeric part of bill number for sorting
      const numA = this.extractBillNumber(a.billNumber);
      const numB = this.extractBillNumber(b.billNumber);
      return (numA - numB) * sortMultiplier;
    }
    
    // Default to date sorting
    const dateA = new Date(a.lastUpdated).getTime();
    const dateB = new Date(b.lastUpdated).getTime();
    return (dateB - dateA) * sortMultiplier;
  }

  private extractBillNumber(billNumber: string): number {
    // Extract numeric part from bill number (e.g. "C-123" -> 123)
    const match = billNumber.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
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
      const isInProgress = bill.CurrentStatusEn?.toLowerCase().includes('royal assent');
      
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
      let dateTime: number;
      
      // Handle LastUpdatedDateTime specially
      if (dateField === 'LastUpdatedDateTime') {
        dateTime = this.getLastActivityTimestamp(bill);
      } else {
        // For other fields, get the value directly
        const fieldName = dateField as keyof Pick<ApiBill, 
          'LatestActivityDateTime' | 
          'PassedHouseFirstReadingDateTime' | 
          'PassedHouseSecondReadingDateTime' | 
          'PassedHouseThirdReadingDateTime' | 
          'PassedSenateFirstReadingDateTime' | 
          'PassedSenateSecondReadingDateTime' | 
          'PassedSenateThirdReadingDateTime' | 
          'ReceivedRoyalAssentDateTime'>;
        
        dateTime = new Date(bill[fieldName] || 0).getTime();
      }

      if (options.startDate && dateTime < options.startDate.getTime()) {
        return false;
      }

      if (options.endDate && dateTime > options.endDate.getTime()) {
        return false;
      }
    }

    if (options.statusFilter && options.statusFilter !== 'all' && options.savedBills && options.savedBills.length > 0) {
      const savedBill = options.savedBills.find(
        saved => 
          saved.billNumber === bill.BillNumberFormatted &&
          saved.parliament === bill.ParliamentNumber.toString() &&
          saved.session === bill.SessionNumber.toString()
      );
      
      switch (options.statusFilter) {
        case 'liked':
          if (!savedBill || savedBill.isLiked !== 1) return false;
          break;
        case 'disliked':
          if (!savedBill || savedBill.isDisliked !== 1) return false;
          break;
        case 'watching':
          if (!savedBill || savedBill.isWatching !== 1) return false;
          break;
        case 'saved':
          if (!savedBill) return false;
          break;
      }
    }

    // Apply liked/watched filters directly if we have savedBills data
    if ((options.liked !== undefined || options.watched !== undefined) && 
        options.savedBills && options.savedBills.length > 0) {
      
      const savedBill = options.savedBills.find(
        saved => 
          saved.billNumber === bill.BillNumberFormatted &&
          saved.parliament === bill.ParliamentNumber.toString() &&
          saved.session === bill.SessionNumber.toString()
      );
      
      if (options.liked !== undefined && 
          (!savedBill || savedBill.isLiked !== (options.liked ? 1 : 0))) {
        return false;
      }
      
      if (options.watched !== undefined && 
          (!savedBill || savedBill.isWatching !== (options.watched ? 1 : 0))) {
        return false;
      }
    }

    return true;
  }

  private sortBills(a: ApiBill, b: ApiBill, sortBy?: SortBy, dateField?: DateField, sortOrder: 'asc' | 'desc' = 'desc'): number {
    // console.log(`Sorting bills by ${sortBy}, field: ${dateField}, order: ${sortOrder}`);
    
    // Special handling for LastUpdatedDateTime
    if (!dateField || dateField === 'LastUpdatedDateTime') {
      // For LastUpdatedDateTime, use the last activity timestamp
      const dateA = this.getLastActivityTimestamp(a);
      const dateB = this.getLastActivityTimestamp(b);
      
      // Apply sort order
      const dateComparison = sortOrder === 'asc' 
        ? dateA - dateB  // ascending: oldest first
        : dateB - dateA; // descending: newest first
        
      if (sortBy === 'date' || !sortBy) {
        return dateComparison;
      }
    } else {
      // For all other date fields, get the specific field
      // This ensures TypeScript knows we're only using fields that exist on ApiBill
      let dateA: number = 0;
      let dateB: number = 0;
      
      // Handle each field explicitly to satisfy TypeScript
      switch (dateField) {
        case 'LatestActivityDateTime':
          dateA = a.LatestActivityDateTime ? new Date(a.LatestActivityDateTime).getTime() : 0;
          dateB = b.LatestActivityDateTime ? new Date(b.LatestActivityDateTime).getTime() : 0;
          break;
        case 'PassedHouseFirstReadingDateTime':
          dateA = a.PassedHouseFirstReadingDateTime ? new Date(a.PassedHouseFirstReadingDateTime).getTime() : 0;
          dateB = b.PassedHouseFirstReadingDateTime ? new Date(b.PassedHouseFirstReadingDateTime).getTime() : 0;
          break;
        case 'PassedHouseSecondReadingDateTime':
          dateA = a.PassedHouseSecondReadingDateTime ? new Date(a.PassedHouseSecondReadingDateTime).getTime() : 0;
          dateB = b.PassedHouseSecondReadingDateTime ? new Date(b.PassedHouseSecondReadingDateTime).getTime() : 0;
          break;
        case 'PassedHouseThirdReadingDateTime':
          dateA = a.PassedHouseThirdReadingDateTime ? new Date(a.PassedHouseThirdReadingDateTime).getTime() : 0;
          dateB = b.PassedHouseThirdReadingDateTime ? new Date(b.PassedHouseThirdReadingDateTime).getTime() : 0;
          break;
        case 'PassedSenateFirstReadingDateTime':
          dateA = a.PassedSenateFirstReadingDateTime ? new Date(a.PassedSenateFirstReadingDateTime).getTime() : 0;
          dateB = b.PassedSenateFirstReadingDateTime ? new Date(b.PassedSenateFirstReadingDateTime).getTime() : 0;
          break;
        case 'PassedSenateSecondReadingDateTime':
          dateA = a.PassedSenateSecondReadingDateTime ? new Date(a.PassedSenateSecondReadingDateTime).getTime() : 0;
          dateB = b.PassedSenateSecondReadingDateTime ? new Date(b.PassedSenateSecondReadingDateTime).getTime() : 0;
          break;
        case 'PassedSenateThirdReadingDateTime':
          dateA = a.PassedSenateThirdReadingDateTime ? new Date(a.PassedSenateThirdReadingDateTime).getTime() : 0;
          dateB = b.PassedSenateThirdReadingDateTime ? new Date(b.PassedSenateThirdReadingDateTime).getTime() : 0;
          break;
        case 'ReceivedRoyalAssentDateTime':
          dateA = a.ReceivedRoyalAssentDateTime ? new Date(a.ReceivedRoyalAssentDateTime).getTime() : 0;
          dateB = b.ReceivedRoyalAssentDateTime ? new Date(b.ReceivedRoyalAssentDateTime).getTime() : 0;
          break;
      }
      
      // Apply sort order
      const dateComparison = sortOrder === 'asc' 
        ? dateA - dateB  // ascending: oldest first
        : dateB - dateA; // descending: newest first
        
      if (sortBy === 'date' || !sortBy) {
        return dateComparison;
      }
    }
    
    // For non-date sorting
    switch (sortBy) {
      case 'status':
        return a.CurrentStatusEn.localeCompare(b.CurrentStatusEn);
      case 'number':
        return a.BillNumber - b.BillNumber;
      default:
        // Default to sorting by LastUpdatedDateTime if not a specific sort type
        const dateA = this.getLastActivityTimestamp(a);
        const dateB = this.getLastActivityTimestamp(b);
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    }
  }

  /**
   * Get the timestamp of the most recent date across all bill stages
   */
  private getLastActivityTimestamp(bill: ApiBill): number {
    // Collect all date fields with proper typing
    const dateFields: (string | null)[] = [
      bill.LatestActivityDateTime,
      bill.ReceivedRoyalAssentDateTime,
      bill.PassedHouseThirdReadingDateTime,
      bill.PassedHouseSecondReadingDateTime,
      bill.PassedHouseFirstReadingDateTime,
      bill.PassedSenateThirdReadingDateTime,
      bill.PassedSenateSecondReadingDateTime,
      bill.PassedSenateFirstReadingDateTime
    ];
    
    // Filter out null values and convert valid dates to timestamps
    const timestamps: number[] = dateFields
      .filter((date): date is string => !!date) // Type guard to ensure non-null strings
      .map(date => new Date(date).getTime());
    
    // Return the most recent timestamp or 0 if no valid dates
    return timestamps.length > 0 ? Math.max(...timestamps) : 0;
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