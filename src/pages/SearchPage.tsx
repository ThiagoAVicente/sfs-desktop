import { useState, useEffect } from 'react';
import { useSearch } from '../hooks/useSearch';
import { useSettingsStore } from '../stores/settingsStore';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [collectionsInput, setCollectionsInput] = useState('');
  const { 
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
    nextPage,
    prevPage,
  } = useSearch();

  // Use store for search settings
  const limit = useSettingsStore((state) => state.searchLimit);
  const scoreThreshold = useSettingsStore((state) => state.searchScoreThreshold);
  const setLimit = useSettingsStore((state) => state.setSearchLimit);
  const setScoreThreshold = useSettingsStore((state) => state.setSearchScoreThreshold);
  const saveSettings = useSettingsStore((state) => state.saveSettings);
  const downloadPath = useSettingsStore((state) => state.downloadPath);
  const searchAllCollections = useSettingsStore((state) => state.searchAllCollections);

  // Save settings when limit or threshold changes
  useEffect(() => {
    saveSettings();
  }, [limit, scoreThreshold]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await search(query, limit, scoreThreshold);
  };

  const handleDownload = async (collection: string, filePath: string) => {
    try {
      await downloadFile(collection, filePath, downloadPath);
    } catch (err: any) {
      console.error('Download failed:', err);
    }
  };

  // Parse collections input (comma-separated)
  useEffect(() => {
    if (collectionsInput.trim()) {
      const collections = collectionsInput.split(',').map(c => c.trim()).filter(Boolean);
      setSelectedCollections(collections);
    } else {
      setSelectedCollections([]);
    }
  }, [collectionsInput]);

  return (
    <div className="min-h-full bg-neutral-50 dark:bg-neutral-950">
      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Search
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Search your indexed files
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Enter your search query..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Collections {searchAllCollections && '(searching all)'}
            </label>
            <input
              type="text"
              placeholder="Leave empty for all, or enter collections separated by commas (e.g., default, reports)"
              value={collectionsInput}
              onChange={(e) => setCollectionsInput(e.target.value)}
              disabled={searchAllCollections}
              className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent transition-all disabled:opacity-50"
            />
            {selectedCollections.length > 0 && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Searching: {selectedCollections.join(', ')}
              </p>
            )}
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                Results per Page: {limit}
              </label>
              <input
                type="range"
                min="5"
                max="50"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex-1">
              <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                Score Threshold: {scoreThreshold.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={scoreThreshold}
                onChange={(e) => setScoreThreshold(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="w-full px-4 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Results ({results.length} of {total} total, page {page} of {totalPages})
              </h2>
            </div>

            {results.map((result, index) => (
              <div
                key={index}
                className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg"
              >
                <p className="text-neutral-900 dark:text-white mb-3 leading-relaxed whitespace-pre-wrap">
                  {result.payload.text}
                </p>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4 text-neutral-500 dark:text-neutral-400">
                    <span className="font-mono">{result.payload.file_path}</span>
                    <span className="font-semibold">Collection: {result.collection}</span>
                    <span>Position: {result.payload.start}-{result.payload.end}</span>
                    <span>Score: {result.score.toFixed(3)}</span>
                  </div>

                  <button
                    onClick={() => handleDownload(result.collection, result.payload.file_path)}
                    className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded text-xs font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
                  >
                    Download
                  </button>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={prevPage}
                    disabled={!hasPrev}
                    className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={nextPage}
                    disabled={!hasNext}
                    className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* No Results */}
        {!searching && results.length === 0 && query && !error && (
          <div className="mt-8 text-center py-12">
            <p className="text-neutral-500 dark:text-neutral-400">No results found</p>
          </div>
        )}
      </div>
    </div>
  );
}
