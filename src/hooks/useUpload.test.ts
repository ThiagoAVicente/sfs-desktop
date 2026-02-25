import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUpload } from './useUpload';
import { api } from '../lib/api';
import { Store } from '@tauri-apps/plugin-store';
import { open } from '@tauri-apps/plugin-dialog';

// Mock dependencies
vi.mock('../lib/api');
vi.mock('@tauri-apps/plugin-store');
vi.mock('@tauri-apps/plugin-dialog');

describe('useUpload', () => {
  let mockStore: any;

  beforeEach(() => {
    // Create mock store
    mockStore = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      save: vi.fn().mockResolvedValue(undefined),
    };

    // Mock Store.load to return our mock store
    vi.mocked(Store.load).mockResolvedValue(mockStore as any);

    // Mock upload to prevent auto-processing by default
    vi.mocked(api.uploadFile).mockImplementation(() => new Promise(() => {}));

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should initialize with empty queue', async () => {
    const { result } = renderHook(() => useUpload());

    await waitFor(() => {
      expect(result.current.queue).toEqual([]);
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.updateMode).toBe(false);
    });
  });

  it('should load saved queue from store', async () => {
    const savedQueue = [
      {
        id: '1',
        filePath: '/test/file.txt',
        fileName: 'test_file.txt',
        status: 'complete' as const,
        progress: 100,
      },
    ];

    mockStore.get.mockResolvedValue(savedQueue);

    const { result } = renderHook(() => useUpload());

    await waitFor(() => {
      expect(result.current.queue).toEqual(savedQueue);
    });
  });

  it('should select files and add to queue', async () => {
    const selectedPaths = ['/home/user/test.txt', '/home/user/docs/file.pdf'];
    vi.mocked(open).mockResolvedValue(selectedPaths as any);

    // Mock upload to prevent auto-processing
    vi.mocked(api.uploadFile).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useUpload());

    // Wait for store to initialize
    await waitFor(() => {
      expect(result.current.queue).toBeDefined();
    });

    await act(async () => {
      await result.current.selectFiles();
    });

    await waitFor(() => {
      expect(result.current.queue).toHaveLength(2);
      expect(result.current.queue[0].fileName).toBe('test.txt');
      expect(result.current.queue[1].fileName).toBe('file.pdf');
    }, { timeout: 3000 });
  });

  it('should toggle update mode', () => {
    const { result } = renderHook(() => useUpload());

    expect(result.current.updateMode).toBe(false);

    act(() => {
      result.current.setUpdateMode(true);
    });

    expect(result.current.updateMode).toBe(true);
  });

  it('should call uploadFile when processing pending files', async () => {
    const mockJobResponse = { data: { job_id: 'job-123' } };

    vi.mocked(api.uploadFile).mockResolvedValue(mockJobResponse as any);
    vi.mocked(open).mockResolvedValue(['/test/file.txt'] as any);

    const { result } = renderHook(() => useUpload());

    // Use selectFiles to properly add a job
    await act(async () => {
      await result.current.selectFiles();
    });

    // Wait for upload to be called
    await waitFor(() => {
      expect(api.uploadFile).toHaveBeenCalledWith(
        '/test/file.txt',
        'file.txt',
        'default',
        false
      );
    }, { timeout: 2000 });
  });

  it('should handle upload errors', async () => {
    const error = new Error('Upload failed');
    vi.mocked(api.uploadFile).mockRejectedValue(error);
    vi.mocked(open).mockResolvedValue(['/test/file.txt'] as any);

    const { result } = renderHook(() => useUpload());

    // Use selectFiles to add a job
    await act(async () => {
      await result.current.selectFiles();
    });

    await waitFor(() => {
      const firstJob = result.current.queue[0];
      expect(firstJob.status).toBe('error');
      expect(firstJob.error).toBe('Upload failed');
      expect(firstJob.progress).toBe(0);
    }, { timeout: 2000 });
  });

  it('should clear completed jobs', async () => {
    // Mock the store to return a pre-populated queue with all non-pending statuses
    const initialQueue = [
      {
        id: '1',
        filePath: '/test/file1.txt',
        fileName: 'file1.txt',
        status: 'complete' as const,
        progress: 100,
      },
      {
        id: '2',
        filePath: '/test/file2.txt',
        fileName: 'file2.txt',
        status: 'uploading' as const,
        progress: 50,
      },
      {
        id: '3',
        filePath: '/test/file3.txt',
        fileName: 'file3.txt',
        status: 'error' as const,
        progress: 0,
      },
    ];

    // Create a fresh mock store for this test
    const testStore = {
      get: vi.fn().mockResolvedValue(initialQueue),
      set: vi.fn().mockResolvedValue(undefined),
      save: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(Store.load).mockResolvedValue(testStore as any);

    const { result } = renderHook(() => useUpload());

    // Wait for queue to load
    await waitFor(() => {
      expect(result.current.queue).toHaveLength(3);
    }, { timeout: 1000 });

    await act(async () => {
      result.current.clearCompleted();
    });

    // Should only keep the uploading job
    await waitFor(() => {
      expect(result.current.queue).toHaveLength(1);
      expect(result.current.queue[0].status).toBe('uploading');
    });
  });

  it('should clear all jobs', async () => {
    const initialQueue = [
      {
        id: '1',
        filePath: '/test/file1.txt',
        fileName: 'file1.txt',
        status: 'complete' as const,
        progress: 100,
      },
      {
        id: '2',
        filePath: '/test/file2.txt',
        fileName: 'file2.txt',
        status: 'pending' as const,
        progress: 0,
      },
    ];

    const testStore = {
      get: vi.fn().mockResolvedValue(initialQueue),
      set: vi.fn().mockResolvedValue(undefined),
      save: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(Store.load).mockResolvedValue(testStore as any);

    const { result } = renderHook(() => useUpload());

    // Wait for queue to load
    await waitFor(() => {
      expect(result.current.queue).toHaveLength(2);
    }, { timeout: 1000 });

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.queue).toHaveLength(0);
  });

  it('should save queue to store when it changes', async () => {
    const testStore = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      save: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(Store.load).mockResolvedValue(testStore as any);
    vi.mocked(open).mockResolvedValue(['/test/file.txt'] as any);

    const { result } = renderHook(() => useUpload());

    // Wait for initial store save
    await waitFor(() => {
      expect(testStore.set).toHaveBeenCalled();
    }, { timeout: 1000 });

    const initialCallCount = testStore.set.mock.calls.length;

    // Add a file to trigger queue change
    await act(async () => {
      await result.current.selectFiles();
    });

    await waitFor(() => {
      // Should have been called more times after adding files
      expect(testStore.set.mock.calls.length).toBeGreaterThan(initialCallCount);
      expect(testStore.set).toHaveBeenCalledWith('upload-queue', expect.any(Array));
      expect(testStore.save).toHaveBeenCalled();
    }, { timeout: 1000 });
  });
});
