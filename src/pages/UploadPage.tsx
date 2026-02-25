import { useUpload, type FileStatus } from '../hooks/useUpload';

export function UploadPage() {
  const {
    queue,
    updateMode,
    collection,
    setUpdateMode,
    setCollection,
    selectFiles,
    clearCompleted,
    clearAll,
  } = useUpload();

  const getStatusColor = (status: FileStatus) => {
    switch (status) {
      case 'pending':
        return 'text-neutral-500 dark:text-neutral-400';
      case 'uploading':
        return 'text-blue-600 dark:text-blue-400';
      case 'indexing':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'complete':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
    }
  };

  const getStatusIcon = (status: FileStatus) => {
    switch (status) {
      case 'pending':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'uploading':
      case 'indexing':
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'complete':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
    }
  };

  return (
    <div className="min-h-full bg-neutral-50 dark:bg-neutral-950 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Upload Files
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Upload files to index them for semantic search
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={selectFiles}
            className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all"
          >
            Select Files
          </button>

          {queue.length > 0 && (
            <>
              <button
                onClick={clearCompleted}
                disabled={!queue.some((job) => job.status === 'complete' || job.status === 'error')}
                className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear Finished
              </button>
              <button
                onClick={clearAll}
                className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
              >
                Clear All
              </button>
            </>
          )}
        </div>

        {/* Collection Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Collection
          </label>
          <input
            type="text"
            value={collection}
            onChange={(e) => setCollection(e.target.value)}
            placeholder="Enter collection name (e.g., 'default')"
            className="w-full px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent transition-all"
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Files will be uploaded to this collection
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer mb-6">
          <input
            type="checkbox"
            checked={updateMode}
            onChange={(e) => setUpdateMode(e.target.checked)}
            className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
          />
          Update file
        </label>

        {/* Queue */}
        {queue.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg">
            <svg
              className="w-12 h-12 mx-auto text-neutral-400 dark:text-neutral-600 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm">
              No files selected
            </p>
            <p className="text-neutral-500 dark:text-neutral-500 text-xs mt-1">
              Click "Select Files" to get started
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {queue.map((job) => (
              <div
                key={job.id}
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4"
              >
                <div className="flex items-center gap-3">
                  <div className={getStatusColor(job.status)}>
                    {getStatusIcon(job.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                      {job.fileName}
                    </p>
                    <p className={`text-xs mt-0.5 ${getStatusColor(job.status)}`}>
                      {job.status === 'pending' && 'Waiting...'}
                      {job.status === 'uploading' && 'Uploading...'}
                      {job.status === 'indexing' && 'Indexing...'}
                      {job.status === 'complete' && 'Complete'}
                      {job.status === 'error' && `Error: ${job.error}`}
                    </p>
                  </div>
                  {job.status !== 'complete' && job.status !== 'error' && (
                    <div className="w-16 h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 dark:bg-blue-400 transition-all duration-300"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {queue.length > 0 && (
          <div className="mt-6 flex gap-4 text-xs text-neutral-500 dark:text-neutral-400">
            <span>
              Total: <strong>{queue.length}</strong>
            </span>
            <span>
              Pending: <strong>{queue.filter((j) => j.status === 'pending').length}</strong>
            </span>
            <span>
              Processing: <strong>{queue.filter((j) => j.status === 'uploading' || j.status === 'indexing').length}</strong>
            </span>
            <span>
              Complete: <strong className="text-green-600 dark:text-green-400">{queue.filter((j) => j.status === 'complete').length}</strong>
            </span>
            <span>
              Errors: <strong className="text-red-600 dark:text-red-400">{queue.filter((j) => j.status === 'error').length}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
