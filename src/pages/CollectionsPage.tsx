import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useSettingsStore } from '../stores/settingsStore';

export function CollectionsPage() {
  const [collections, setCollections] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const defaultCollection = useSettingsStore((state) => state.defaultCollection);

  const loadCollections = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.listCollections();
      setCollections(response.data.collections || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load collections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollections();
  }, []);

  return (
    <div className="min-h-full bg-neutral-50 dark:bg-neutral-950">
      <div className="px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Collections
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            View all available collections ({collections.length} total)
          </p>
        </div>

        {/* Refresh Button */}
        <div className="mb-6">
          <button
            onClick={loadCollections}
            disabled={loading}
            className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Collections List */}
        {!loading && collections.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg">
            <p className="text-neutral-500 dark:text-neutral-400">
              No collections found
            </p>
          </div>
        )}

        {!loading && collections.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map((collection) => (
              <div
                key={collection}
                className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:border-neutral-400 dark:hover:border-neutral-600 transition-all"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white font-mono">
                    {collection}
                  </h3>
                  {collection === defaultCollection && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded">
                      Default
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
