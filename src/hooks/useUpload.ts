import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { Store } from '@tauri-apps/plugin-store';
import { open } from '@tauri-apps/plugin-dialog';
import { useSettingsStore } from '../stores/settingsStore';

export type FileStatus = 'pending' | 'uploading' | 'indexing' | 'complete' | 'error';

export interface UploadJob {
  id: string;
  filePath: string;
  fileName: string;
  status: FileStatus;
  jobId?: string;
  error?: string;
  progress: number;
}

const QUEUE_STORE_KEY = 'upload-queue';

export function useUpload() {
  const defaultCollection = useSettingsStore((state) => state.defaultCollection);
  const [queue, setQueue] = useState<UploadJob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [store, setStore] = useState<Store | null>(null);
  const [updateMode, setUpdateMode] = useState(false);
  const [collection, setCollection] = useState(defaultCollection);
  const hasResumedPolling = useRef(false);

  // Sync collection input with defaultCollection from settings
  useEffect(() => {
    if (!collection && defaultCollection) {
      setCollection(defaultCollection);
    }
  }, [defaultCollection]);

  // Initialize store and load queue
  useEffect(() => {
    const initStore = async () => {
      try {
        const s = await Store.load('upload-queue.json');
        setStore(s);

        const savedQueue = await s.get<UploadJob[]>(QUEUE_STORE_KEY);
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

  const pollJobStatus = async (jobId: string, uploadJobId: string) => {
    const maxAttempts = 60;
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

  const selectFiles = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{
          name: 'Text Files',
          extensions: ['txt', 'md', 'json', 'csv', 'log', 'xml', 'html', 'css', 'js', 'ts', 'tsx', 'jsx', 'py', 'java', 'c', 'cpp', 'h', 'rs', 'pdf']
        }]
      });

      if (selected && Array.isArray(selected)) {
        const newJobs: UploadJob[] = selected.map((path) => {
          // Extract just the filename from the path
          const fileName = path.split(/[/\\]/).pop() || path;

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

  const processQueue = async () => {
    if (isProcessing) return;

    const pendingJobs = queue.filter((job) => job.status === 'pending');
    if (pendingJobs.length === 0) return;

    // Use provided collection or fall back to default
    const targetCollection = collection || defaultCollection || 'default';
    if (!targetCollection) {
      console.error('No collection specified');
      return;
    }
    
    console.log('[Upload] Using collection:', targetCollection);

    setIsProcessing(true);

    for (const job of pendingJobs) {
      setQueue((prev) =>
        prev.map((j) =>
          j.id === job.id ? { ...j, status: 'uploading', progress: 50 } : j
        )
      );

      try {
        const response = await api.uploadFile(job.filePath, job.fileName, targetCollection, updateMode);
        const jobId = response.data.job_id;

        setQueue((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? { ...j, status: 'indexing', jobId, progress: 75 }
              : j
          )
        );

        await pollJobStatus(jobId, job.id);
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

  // Auto-process queue
  useEffect(() => {
    if (!isProcessing && queue.some((job) => job.status === 'pending')) {
      processQueue();
    }
  }, [queue, isProcessing]);

  return {
    queue,
    isProcessing,
    updateMode,
    collection,
    setUpdateMode,
    setCollection,
    selectFiles,
    clearCompleted,
    clearAll,
  };
}
