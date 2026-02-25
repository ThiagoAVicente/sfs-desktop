import { useState, useRef } from 'react';
import { api } from '../lib/api';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import type { FileInfoV2 } from '../lib/types';

export function useFiles() {
  const [files, setFiles] = useState<FileInfoV2[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  // Store last load options so pagination buttons can re-use them
  const lastLoadOptions = useRef<{ collection?: string; limit?: number }>({});

  const loadFiles = async (options: { collection?: string; page?: number; limit?: number } = {}) => {
    // Store non-page options for pagination re-use
    lastLoadOptions.current = { collection: options.collection, limit: options.limit };

    setLoading(true);
    setError('');

    try {
      const response = await api.listFiles({
        collection: options.collection,
        page: options.page ?? 1,
        limit: options.limit || 20,
      });
      setFiles(response.data.items || []);
      setPage(response.data.page);
      setTotalPages(response.data.total_pages);
      setTotal(response.data.total);
      setHasNext(response.data.has_next);
      setHasPrev(response.data.has_prev);
    } catch (err: any) {
      setError(err.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const nextPage = () => {
    if (hasNext) {
      loadFiles({ ...lastLoadOptions.current, page: page + 1 });
    }
  };

  const prevPage = () => {
    if (hasPrev) {
      loadFiles({ ...lastLoadOptions.current, page: page - 1 });
    }
  };

  const deleteFile = async (collection: string, fileName: string) => {
    const fileKey = `${collection}/${fileName}`;
    setDeleting(fileKey);
    try {
      await api.deleteFile(collection, fileName);
      setFiles((prev) => prev.filter((f) => f.path !== fileKey));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete file');
    } finally {
      setDeleting(null);
    }
  };

  const downloadFile = async (collection: string, fileName: string, defaultPath?: string) => {
    const fileKey = `${collection}/${fileName}`;
    setDownloading(fileKey);
    try {
      const response = await api.downloadFile(collection, fileName);

      const savePath = await save({
        defaultPath: defaultPath || fileName,
        filters: [{
          name: 'All Files',
          extensions: ['*']
        }]
      });

      if (savePath) {
        const arrayBuffer = await response.data.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        await writeFile(savePath, uint8Array);
      }
    } catch (err: any) {
      console.error('Download failed:', err);
      throw err;
    } finally {
      setDownloading(null);
    }
  };

  const filterFiles = (searchQuery: string) => {
    return files.filter((file) =>
      file.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  return {
    files,
    loading,
    error,
    deleting,
    downloading,
    page,
    totalPages,
    total,
    hasNext,
    hasPrev,
    loadFiles,
    deleteFile,
    downloadFile,
    filterFiles,
    nextPage,
    prevPage,
  };
}
