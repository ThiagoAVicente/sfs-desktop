import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSearch } from './useSearch';
import { api } from '../lib/api';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';

// Mock dependencies
vi.mock('../lib/api');
vi.mock('@tauri-apps/plugin-dialog');
vi.mock('@tauri-apps/plugin-fs');

describe('useSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useSearch());

    expect(result.current.results).toEqual([]);
    expect(result.current.searching).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('should perform search successfully', async () => {
    const mockResults = [
      {
        score: 0.95,
        payload: {
          file_path: 'test.txt',
          text: 'Sample text content',
          start: 0,
          end: 100,
          chunk_index: 0,
        },
      },
    ];

    vi.mocked(api.search).mockResolvedValue({
      data: { results: mockResults },
    } as any);

    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await result.current.search('test query', 5, 0.5);
    });

    await waitFor(() => {
      expect(result.current.searching).toBe(false);
      expect(result.current.results).toEqual(mockResults);
      expect(result.current.error).toBe('');
    });

    expect(api.search).toHaveBeenCalledWith('test query', 5, 0.5);
  });

  it('should not search with empty query', async () => {
    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await result.current.search('', 5, 0.5);
    });

    expect(api.search).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
  });

  it('should not search with whitespace-only query', async () => {
    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await result.current.search('   ', 5, 0.5);
    });

    expect(api.search).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
  });

  it('should handle search errors', async () => {
    const error = new Error('Search failed');
    vi.mocked(api.search).mockRejectedValue(error);

    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await result.current.search('test query', 5, 0.5);
    });

    await waitFor(() => {
      expect(result.current.searching).toBe(false);
      expect(result.current.error).toBe('Search failed');
      expect(result.current.results).toEqual([]);
    });
  });

  it('should set searching state during search', async () => {
    let resolveSearch: any;
    const searchPromise = new Promise((resolve) => {
      resolveSearch = resolve;
    });

    vi.mocked(api.search).mockReturnValue(searchPromise as any);

    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.search('test query', 5, 0.5);
    });

    await waitFor(() => {
      expect(result.current.searching).toBe(true);
    });

    act(() => {
      resolveSearch({ data: { results: [] } });
    });

    await waitFor(() => {
      expect(result.current.searching).toBe(false);
    });
  });

  it('should download file successfully', async () => {
    const mockArrayBuffer = new ArrayBuffer(12);

    vi.mocked(api.downloadFile).mockResolvedValue({
      data: {
        arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
      },
    } as any);

    vi.mocked(save).mockResolvedValue('/save/path/file.txt');
    vi.mocked(writeFile).mockResolvedValue(undefined);

    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await result.current.downloadFile('default', 'test/file.txt');
    });

    expect(api.downloadFile).toHaveBeenCalledWith('default', 'file.txt');
    expect(save).toHaveBeenCalled();
    expect(writeFile).toHaveBeenCalledWith(
      '/save/path/file.txt',
      expect.any(Uint8Array)
    );
  });

  it('should download file with custom download path', async () => {
    const mockArrayBuffer = new ArrayBuffer(12);

    vi.mocked(api.downloadFile).mockResolvedValue({
      data: {
        arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
      },
    } as any);

    vi.mocked(save).mockResolvedValue('/custom/path/file.txt');

    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await result.current.downloadFile('default', 'test/file.txt', '/custom/path');
    });

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultPath: '/custom/path/file.txt',
      })
    );
  });

  it('should not write file if user cancels save dialog', async () => {
    const mockArrayBuffer = new ArrayBuffer(12);

    vi.mocked(api.downloadFile).mockResolvedValue({
      data: {
        arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
      },
    } as any);

    vi.mocked(save).mockResolvedValue(null);

    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await result.current.downloadFile('default', 'test/file.txt');
    });

    expect(writeFile).not.toHaveBeenCalled();
  });

  it('should handle download errors', async () => {
    const error = new Error('Download failed');
    vi.mocked(api.downloadFile).mockRejectedValue(error);

    const { result } = renderHook(() => useSearch());

    await expect(async () => {
      await act(async () => {
        await result.current.downloadFile('default', 'test/file.txt');
      });
    }).rejects.toThrow('Download failed');
  });

  it('should clear results', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.results.push({
        score: 0.95,
        collection: 'default',
        payload: {
          file_path: 'test.txt',
          text: 'test content',
          start: 0,
          end: 12,
          chunk_index: 0,
        },
      });
    });

    act(() => {
      result.current.clearResults();
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBe('');
  });

  it('should handle file paths with different separators', async () => {
    const mockArrayBuffer = new ArrayBuffer(12);

    vi.mocked(api.downloadFile).mockResolvedValue({
      data: {
        arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
      },
    } as any);

    vi.mocked(save).mockResolvedValue('/save/path/file.txt');

    const { result } = renderHook(() => useSearch());

    // Test with forward slash
    await act(async () => {
      await result.current.downloadFile('default', 'test/path/file.txt');
    });

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultPath: 'file.txt',
      })
    );

    // Test with backslash
    await act(async () => {
      await result.current.downloadFile('default', 'test\\path\\file.txt');
    });

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultPath: 'file.txt',
      })
    );
  });
});
