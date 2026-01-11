import axios from 'axios';

const getApiClient = () => {
  const apiUrl = localStorage.getItem('sfs-settings');
  const settings = apiUrl ? JSON.parse(apiUrl) : null;

  return axios.create({
    baseURL: settings?.apiUrl || 'https://localhost',
    headers: {
      'X-API-Key': settings?.apiKey || '',
    },
  });
};

export const api = {
  // Upload and index a file
  uploadFile: async (file: File, update: boolean = false) => {
    const client = getApiClient();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('update', String(update));

    return client.post<{ job_id: string }>('/index', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Check indexing job status
  getJobStatus: async (jobId: string) => {
    const client = getApiClient();
    return client.get<{ job_id: string; status: string }>(`/index/status/${jobId}`);
  },

  // Test connection
  healthCheck: async () => {
    const client = getApiClient();
    return client.get('/health');
  },

  // List all files
  listFiles: async (prefix?: string) => {
    const client = getApiClient();
    return client.get<{ files: string[]; count: number }>('/files/', {
      params: { prefix },
    });
  },

  // Download a file
  downloadFile: async (fileName: string) => {
    const client = getApiClient();
    return client.get(`/files/${fileName}`, {
      responseType: 'blob',
    });
  },

  // Delete a file
  deleteFile: async (fileName: string) => {
    const client = getApiClient();
    return client.delete<{ job_id: string }>(`/index/${fileName}`);
  },

  // Search
  search: async (query: string, limit: number = 5, scoreThreshold: number = 0.5) => {
    const client = getApiClient();
    return client.post('/search', {
      query,
      limit,
      score_threshold: scoreThreshold,
    });
  },
};
