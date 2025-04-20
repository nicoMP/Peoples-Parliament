/**
 * Parliament API Types
 * 
 * Types for interacting with the OpenParliament API
 */

export interface Politician {
  name: string;
  url: string;
  given_name?: string;
  family_name?: string;
  gender?: string;
  image: string;
  cached_image?: string;  // Local cached image path
  isWatching?: boolean;   // Added for tracking watch status
  current_party: {
    short_name: {
      en: string;
    };
  };
  current_riding: {
    province: string;
    name: {
      en: string;
    };
  };
  other_info?: {
    parl_affil_id?: string[];
    alternate_name?: string[];
    parl_id?: string[];
    freebase_id?: string[];
    wikipedia_id?: string[];
    parlinfo_id?: string[];
    twitter_id?: string[];
    twitter?: string[];
    wordcloud?: string[];
    favourite_word?: string[];
    parl_mp_id?: string[];
    constituency_offices?: string[];
  };
  links?: Array<{
    url: string;
    note: string;
  }>;
  email?: string;
  voice?: string;
  memberships?: Array<{
    url: string;
    start_date: string;
    end_date: string | null;
    party: {
      name: {
        en: string;
      };
      short_name: {
        en: string;
      };
    };
    label: {
      en: string;
    };
    riding: {
      name: {
        en: string;
      };
      province: string;
      id: number;
    };
  }>;
  related?: {
    speeches_url?: string;
    ballots_url?: string;
    sponsored_bills_url?: string;
    activity_rss_url?: string;
  };
}

export interface PaginatedResponse<T> {
  objects: T[];
  pagination: {
    offset: number;
    limit: number;
    next_url: string | null;
    previous_url: string | null;
  };
}

export interface PoliticianFilters {
  family_name?: string;
  given_name?: string;
  name?: string;
  party?: string;
  province?: string;
  include?: 'former' | 'all' | undefined;
  limit?: number;
  offset?: number;
  watched_only?: boolean;
}

export interface PoliticianResponse extends PaginatedResponse<Politician> {} 