import { SearchType, RoyalAssentFilter, SortBy } from './BillFilterService';

export const SEARCH_TYPES: { label: string; value: SearchType }[] = [
  { label: 'Bill # & Name', value: 'default' },
  { label: 'Sponsor', value: 'sponsor' },
  { label: 'Status', value: 'status' },
  { label: 'Type', value: 'type' }
];

export const ROYAL_ASSENT_FILTERS: { label: string; value: RoyalAssentFilter }[] = [
  { label: 'RA All', value: 'both' },
  { label: 'RA in Progress', value: 'in_progress' },
  { label: 'No RA', value: 'none' }
];

export const SORT_OPTIONS: { label: string; value: SortBy }[] = [
  { label: 'Date', value: 'date' },
  { label: 'Status', value: 'status' },
  { label: 'Number', value: 'number' }
];

export const DATE_FILTERS = [
  { label: 'Last 7 days', value: '7' },
  { label: 'Last 30 days', value: '30' },
  { label: 'Last 90 days', value: '90' },
  { label: 'Last 6 months', value: '180' },
  { label: 'Last year', value: '365' },
  { label: 'Last 4 years', value: '1460' },
  { label: 'All time', value: 'all' },
]; 