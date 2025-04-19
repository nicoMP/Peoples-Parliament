import { ApiBill } from '@src/types/bill';

export interface BillFilters {
  searchText?: string;
  searchType?: 'default' | 'sponsor' | 'status' | 'type';
  royalAssentFilter?: 'in_progress' | 'none' | 'both';
  lastInteractionDays?: number;
  sortBy?: 'date' | 'status' | 'number';
}

export const filterBills = (bills: ApiBill[], filters: BillFilters): ApiBill[] => {
  return bills.filter(bill => {
    // Text search across multiple fields
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      let matchesSearch = false;

      switch (filters.searchType) {
        case 'default':
          matchesSearch = 
            bill.BillNumberFormatted.toLowerCase().includes(searchLower) ||
            bill.LongTitleEn.toLowerCase().includes(searchLower);
          break;
        case 'sponsor':
          matchesSearch = bill.SponsorEn.toLowerCase().includes(searchLower);
          break;
        case 'status':
          matchesSearch = bill.CurrentStatusEn.toLowerCase().includes(searchLower);
          break;
        case 'type':
          matchesSearch = bill.BillTypeEn.toLowerCase().includes(searchLower);
          break;
        default:
          matchesSearch = 
            bill.BillNumberFormatted.toLowerCase().includes(searchLower) ||
            bill.CurrentStatusEn.toLowerCase().includes(searchLower) ||
            bill.SponsorEn.toLowerCase().includes(searchLower) ||
            bill.BillTypeEn.toLowerCase().includes(searchLower);
      }
      
      if (!matchesSearch) return false;
    }

    // Royal Assent filter
    if (filters.royalAssentFilter) {
      const hasAssent = !!bill.ReceivedRoyalAssentDateTime;
      const isInProgress = bill.CurrentStatusEn.toLowerCase().includes('royal assent');
      
      switch (filters.royalAssentFilter) {
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

    // Last interaction date filter
    if (filters.lastInteractionDays !== undefined) {
      const lastInteractionDate = getLastInteractionDate(bill);
      const daysSinceInteraction = getDaysSince(lastInteractionDate);
      if (daysSinceInteraction > filters.lastInteractionDays) return false;
    }

    return true;
  }).sort((a, b) => {
    switch (filters.sortBy) {
      case 'date':
        return compareDates(getLastInteractionDate(b), getLastInteractionDate(a));
      case 'status':
        return a.CurrentStatusEn.localeCompare(b.CurrentStatusEn);
      case 'number':
        return a.BillNumber - b.BillNumber;
      default:
        return 0;
    }
  });
};

const getLastInteractionDate = (bill: ApiBill): Date => {
  const dates = [
    bill.ReceivedRoyalAssentDateTime,
    bill.PassedHouseThirdReadingDateTime,
    bill.PassedHouseSecondReadingDateTime,
    bill.PassedHouseFirstReadingDateTime,
    bill.PassedSenateThirdReadingDateTime,
    bill.PassedSenateSecondReadingDateTime,
    bill.PassedSenateFirstReadingDateTime,
  ].filter(date => date) as string[];

  return dates.length > 0 ? new Date(Math.max(...dates.map(d => new Date(d).getTime()))) : new Date(0);
};

const getDaysSince = (date: Date): number => {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const compareDates = (date1: Date, date2: Date): number => {
  return date1.getTime() - date2.getTime();
}; 