import { useState } from 'react';
import { api } from '../lib/api';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import type { SearchResultV2 } from '../lib/types';
import { useSettingsStore } from '../stores/settingsStore';

export function useSearch() {
  const [results, setResults] = useState<SearchResultV2[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const searchAllCollections = useSettingsStore((state) => state.searchAllCollections);

  const search = async (query: string, limit: number, scoreThreshold: number, pageNum?: number) => {
    if (!query.trim()) return;

    setSearching(true);
    setError('');

    try {
      const response = await api.search({
        query,
        collections: searchAllCollections || selectedCollections.length === 0 ? null : selectedCollections,
        limit,
        page: pageNum || page,
        scoreThreshold,
      });
      
      setResults(response.data.items || []);
      setPage(response.data.page);
      setTotalPages(response.data.total_pages);
      setTotal(response.data.total);
      setHasNext(response.data.has_next);
      setHasPrev(response.data.has_prev);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const downloadFile = async (collection: string, filePath: string, downloadPath?: string) => {
    try {
      const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'download';
      const response = await api.downloadFile(collection, fileName);

      const savePath = await save({
        defaultPath: downloadPath ? `${downloadPath}/${fileName}` : fileName,
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
    }
  };

  const clearResults = () => {
    setResults([]);
    setError('');
    setPage(1);
    setTotalPages(1);
    setTotal(0);
    setHasNext(false);
    setHasPrev(false);
  };

  const nextPage = () => {
    if (hasNext) {
      setPage((prev) => prev + 1);
    }
  };

  const prevPage = () => {
    if (hasPrev) {
      setPage((prev) => prev - 1);
    }
  };

  return {
    results,
    searching,
    error,
    page,
    totalPages,
    total,
    hasNext,
    hasPrev,
    selectedCollections,
    setSelectedCollections,
    search,
    downloadFile,
    clearResults,
    nextPage,
    prevPage,
  };
}
