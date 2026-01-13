import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { Store } from '@tauri-apps/plugin-store';

type FileStatus = 'pending' | 'uploading' | 'indexing' | 'complete' | 'error';

interface UploadJob {
  id: string;
  filePath: string;
  fileName: string;
  status: FileStatus;
  jobId?: string;
  error?: string;
  progress: number;
}

const QUEUE_STORE_KEY = 'upload-queue';

export function UploadPage() {
  const [queue, setQueue] = useState<UploadJob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [store, setStore] = useState<Store | null>(null);
  const [updateMode, setUpdateMode] = useState(false);
  const hasResumedPolling = useRef(false);

  // Initialize store and load queue
  useEffect(() => {
    const initStore = async () => {
      try {
        const s = await Store.load('upload-queue.json');
        setStore(s);

        const savedQueue = await s.get<UploadJob[]>(QUEUE_STORE_KEY);
        console.log('Loaded queue from store:', savedQueue);
        if (savedQueue) {
          setQueue(savedQueue);
        }
      } catch (error) {
        console.error('Failed to load upload queue:', error);
      }
    };

    initStore();
  }, []);

  // Save queue whenever it changes
  useEffect(() => {
    if (store) {
      const saveQueue = async () => {
        await store.set(QUEUE_STORE_KEY, queue);
        await store.save();
        console.log('Saved queue to store:', queue.length, 'items');
      };
      saveQueue();
    }
  }, [queue, store]);

  // Resume polling for indexing jobs when queue is loaded
  useEffect(() => {
    if (!hasResumedPolling.current && queue.length > 0) {
      hasResumedPolling.current = true;
      const indexingJobs = queue.filter((job) => job.status === 'indexing' && job.jobId);
      indexingJobs.forEach((job) => {
        if (job.jobId) {
          pollJobStatus(job.jobId, job.id);
        }
      });
    }
  }, [queue]);

  const handleSelectFiles = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        multiple: true,
        filters: [{
          name: 'Text Files',
          extensions: ['txt', 'md', 'json', 'csv', 'log', 'xml', 'html', 'css', 'js', 'ts', 'tsx', 'jsx', 'py', 'java', 'c', 'cpp', 'h', 'rs', 'pdf']
        }]
      });

      if (selected && Array.isArray(selected)) {
        const newJobs: UploadJob[] = selected.map((path) => {
          // Convert path to use underscores: /home/user/docs/a.txt -> home_user_docs_a.txt
          const fileName = path
            .replace(/^[/\\]/, '') // Remove leading slash
            .replace(/[/\\]/g, '_'); // Replace all slashes with underscores

          return {
            id: Math.random().toString(36).substring(7),
            filePath: path,
            fileName,
            status: 'pending',
            progress: 0,
          };
        });

        setQueue((prev) => [...prev, ...newJobs]);
      }
    } catch (e) {
      console.error('Failed to select files:', e);
    }
  };

  const pollJobStatus = async (jobId: string, uploadJobId: string) => {
    const maxAttempts = 60; // 60 seconds max
    let attempts = 0;

    const poll = async (): Promise<void> => {
      try {
        const response = await api.getJobStatus(jobId);
        const status = response.data.status;

        if (status === 'complete') {
          setQueue((prev) =>
            prev.map((job) =>
              job.id === uploadJobId
                ? { ...job, status: 'complete', progress: 100 }
                : job
            )
          );
          return;
        } else if (status === 'failed') {
          setQueue((prev) =>
            prev.map((job) =>
              job.id === uploadJobId
                ? { ...job, status: 'error', error: 'Indexing failed', progress: 0 }
                : job
            )
          );
          return;
        }

        attempts++;
        if (attempts >= maxAttempts) {
          setQueue((prev) =>
            prev.map((job) =>
              job.id === uploadJobId
                ? { ...job, status: 'error', error: 'Timeout', progress: 0 }
                : job
            )
          );
          return;
        }

        // Continue polling
        setTimeout(() => poll(), 200);
      } catch (error) {
        setQueue((prev) =>
          prev.map((job) =>
            job.id === uploadJobId
              ? { ...job, status: 'error', error: 'Status check failed', progress: 0 }
              : job
          )
        );
      }
    };

    poll();
  };

  const processQueue = async () => {
    if (isProcessing) return;

    const pendingJobs = queue.filter((job) => job.status === 'pending');
    if (pendingJobs.length === 0) return;

    setIsProcessing(true);

    for (const job of pendingJobs) {
      // Update to uploading
      setQueue((prev) =>
        prev.map((j) =>
          j.id === job.id ? { ...j, status: 'uploading', progress: 50 } : j
        )
      );

      try {
        // Upload file
        const response = await api.uploadFile(job.filePath, job.fileName, updateMode);
        const jobId = response.data.job_id;

        // Update to indexing and start polling
        setQueue((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? { ...j, status: 'indexing', jobId, progress: 75 }
              : j
          )
        );

        // Start polling for status
        await pollJobStatus(jobId, job.id);

        // Wait a bit before processing next file
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error: any) {
        setQueue((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? {
                  ...j,
                  status: 'error',
                  error: error.response?.data?.detail || error.message,
                  progress: 0,
                }
              : j
          )
        );
      }
    }

    setIsProcessing(false);
  };

  const clearCompleted = () => {
    setQueue((prev) => prev.filter((job) => job.status !== 'complete' && job.status !== 'error'));
  };

  const clearAll = () => {
    setQueue([]);
  };

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

  useEffect(() => {
    if (!isProcessing && queue.some((job) => job.status === 'pending')) {
      processQueue();
    }
  }, [queue, isProcessing]);

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
            onClick={handleSelectFiles}
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
