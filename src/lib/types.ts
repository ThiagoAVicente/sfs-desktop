export type Theme = 'light' | 'dark' | 'system';

// Pagination interfaces
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// Search V2 interfaces
export interface SearchRequestV2 {
  query: string;
  collections?: string[] | null;
  score_threshold?: number;
  limit?: number;
  page?: number;
}

export interface SearchResultV2 {
  score: number;
  collection: string;
  payload: {
    file_path: string;
    text: string;
    start: number;
    end: number;
    chunk_index: number;
  };
}

// Files V2 interfaces
export interface FileInfoV2 {
  collection: string;
  name: string;
  path: string;
}

// Collections interface
export interface CollectionsResponse {
  collections: string[];
  count: number;
}

// Settings interface
export interface Settings {
  apiUrl: string;
  apiKey: string;
  downloadPath: string;
  theme: Theme;
  searchLimit: number;
  searchScoreThreshold: number;
  defaultCollection: string;
  searchAllCollections: boolean;
}

export const defaultSettings: Settings = {
  apiUrl: 'https://localhost',
  apiKey: '',
  downloadPath: '',
  theme: 'system',
  searchLimit: 20,
  searchScoreThreshold: 0.5,
  defaultCollection: 'default',
  searchAllCollections: true,
};
