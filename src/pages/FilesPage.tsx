import { useState, useEffect } from 'react';
import { useFiles } from '../hooks/useFiles';

export function FilesPage() {
  const {
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
  } = useFiles();

  const [searchQuery, setSearchQuery] = useState('');
  const [collectionFilter, setCollectionFilter] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ collection: string; name: string } | null>(null);

  useEffect(() => {
    loadFiles({ collection: collectionFilter || undefined });
  }, [collectionFilter]);

  const confirmDelete = (collection: string, name: string) => {
    setPendingDelete({ collection, name });
  };

  const cancelDelete = () => {
    setPendingDelete(null);
  };

  const executeDelete = async () => {
    if (!pendingDelete) return;

    try {
      await deleteFile(pendingDelete.collection, pendingDelete.name);
      setPendingDelete(null);
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const handleDownload = async (collection: string, fileName: string) => {
    try {
      await downloadFile(collection, fileName);
    } catch (err: any) {
      console.error('Download failed:', err);
    }
  };

  const filteredFiles = filterFiles(searchQuery);

  return (
    <div className="min-h-full bg-neutral-50 dark:bg-neutral-950">
      <div className="px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Files
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Manage your indexed files ({total} total, page {page} of {totalPages})
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Search Files
            </label>
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Filter by Collection
            </label>
            <input
              type="text"
              placeholder="All collections"
              value={collectionFilter}
              onChange={(e) => setCollectionFilter(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mb-6">
          <button
            onClick={() => loadFiles()}
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

        {/* Files List */}
        {!loading && filteredFiles.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg">
            <p className="text-neutral-500 dark:text-neutral-400">
              {searchQuery ? 'No files match your search' : 'No files indexed yet'}
            </p>
          </div>
        )}

        {!loading && filteredFiles.length > 0 && (
          <>
            <div className="space-y-2 mb-6">
              {filteredFiles.map((file) => (
                <div
                  key={file.path}
                  className="flex items-center justify-between p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white truncate font-mono">
                      {file.path}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      Collection: {file.collection}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(file.collection, file.name)}
                      disabled={downloading === file.path}
                      className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded text-xs font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {downloading === file.path ? 'Downloading...' : 'Download'}
                    </button>
                    <button
                      onClick={() => confirmDelete(file.collection, file.name)}
                      disabled={deleting === file.path}
                      className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleting === file.path ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
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
          </>
        )}

        {/* Confirmation Dialog */}
        {pendingDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 max-w-md mx-4 shadow-lg">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                Confirm Delete
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
                Are you sure you want to delete "{pendingDelete.collection}/{pendingDelete.name}"?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={executeDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
