import { invoke } from '@tauri-apps/api/core';
import { useSettingsStore } from '../stores/settingsStore';
import type { PaginatedResponse, SearchResultV2, FileInfoV2, CollectionsResponse } from './types';

const getApiConfig = () => {
  // Use Zustand store instead of localStorage
  const state = useSettingsStore.getState();
  return {
    baseURL: state.apiUrl || 'https://localhost',
    apiKey: state.apiKey || '',
  };
};

// Custom fetch wrapper that uses Tauri command to accept self-signed certs
const secureFetch = async (url: string, options: {
  method: string;
  headers: Record<string, string>;
  body?: string;
}) => {
  const response = await invoke<{ ok: boolean; status: number; body: string }>('secure_fetch', {
    url,
    options: {
      method: options.method,
      headers: options.headers,
      body: options.body || null,
    },
  });

  return {
    ok: response.ok,
    status: response.status,
    text: async () => response.body,
    json: async () => JSON.parse(response.body),
    blob: async () => new Blob([response.body]),
  };
};

export const api = {
  // Upload and index a file (V2)
  uploadFile: async (filePath: string, fileName: string, collection: string, update: boolean = false) => {
    const config = getApiConfig();

    const response = await invoke<{ ok: boolean; status: number; body: string }>('secure_upload', {
      url: `${config.baseURL}/v2/index`,
      filePath: filePath,
      fileName: fileName,
      collection: collection,
      apiKey: config.apiKey,
      update,
    });

    if (!response.ok) {
      throw new Error(response.body || 'Upload failed');
    }

    return { data: JSON.parse(response.body) as { job_id: string } };
  },

  // Check indexing job status (V2)
  getJobStatus: async (jobId: string) => {
    const config = getApiConfig();

    const response = await secureFetch(`${config.baseURL}/v2/index/status/${jobId}`, {
      method: 'GET',
      headers: {
        'X-API-Key': config.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Status check failed');
    }

    return { data: await response.json() as { job_id: string; status: string } };
  },

  // Test connection
  healthCheck: async () => {
    const config = getApiConfig();

    const response = await secureFetch(`${config.baseURL}/health`, {
      method: 'GET',
      headers: {
        'X-API-Key': config.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Health check failed');
    }

    return { data: await response.json() };
  },

  // List all files (V2 with pagination and collection filter)
  listFiles: async (options: { collection?: string; page?: number; limit?: number } = {}) => {
    const config = getApiConfig();
    const url = new URL(`${config.baseURL}/v2/files/`);
    
    if (options.collection) {
      url.searchParams.append('collection', options.collection);
    }
    if (options.page) {
      url.searchParams.append('page', options.page.toString());
    }
    if (options.limit) {
      url.searchParams.append('limit', options.limit.toString());
    }

    const response = await secureFetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-API-Key': config.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to list files');
    }

    return { data: await response.json() as PaginatedResponse<FileInfoV2> };
  },

  // Download a file (V2 with collection)
  downloadFile: async (collection: string, fileName: string) => {
    const config = getApiConfig();

    const response = await secureFetch(`${config.baseURL}/v2/files/${encodeURIComponent(collection)}/${encodeURIComponent(fileName)}`, {
      method: 'GET',
      headers: {
        'X-API-Key': config.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Download failed');
    }

    return { data: await response.blob() };
  },

  // Delete a file (V2 with collection)
  deleteFile: async (collection: string, fileName: string) => {
    const config = getApiConfig();

    const response = await secureFetch(`${config.baseURL}/v2/index/${encodeURIComponent(collection)}/${encodeURIComponent(fileName)}`, {
      method: 'DELETE',
      headers: {
        'X-API-Key': config.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Delete failed');
    }

    return { data: await response.json() as { job_id: string } };
  },

  // Search (V2 with collections and pagination)
  search: async (options: {
    query: string;
    collections?: string[] | null;
    limit?: number;
    page?: number;
    scoreThreshold?: number;
  }) => {
    const config = getApiConfig();

    const response = await secureFetch(`${config.baseURL}/v2/search`, {
      method: 'POST',
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: options.query,
        collections: options.collections,
        limit: options.limit || 20,
        page: options.page || 1,
        score_threshold: options.scoreThreshold || 0.5,
      }),
    });

    if (!response.ok) {
      throw new Error('Search failed');
    }

    return { data: await response.json() as PaginatedResponse<SearchResultV2> };
  },

  // List all collections (V2)
  listCollections: async () => {
    const config = getApiConfig();

    const response = await secureFetch(`${config.baseURL}/v2/collections`, {
      method: 'GET',
      headers: {
        'X-API-Key': config.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to list collections');
    }

    return { data: await response.json() as CollectionsResponse };
  },
};
