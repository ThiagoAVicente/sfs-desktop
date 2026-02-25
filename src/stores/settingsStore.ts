import { create } from 'zustand';
import { Settings, defaultSettings } from '../lib/types';

interface SettingsStore extends Settings {
  setApiUrl: (url: string) => void;
  setApiKey: (key: string) => void;
  setDownloadPath: (path: string) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setSearchLimit: (limit: number) => void;
  setSearchScoreThreshold: (threshold: number) => void;
  setDefaultCollection: (collection: string) => void;
  setSearchAllCollections: (searchAll: boolean) => void;
  saveSettings: () => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...defaultSettings,

  setApiUrl: (url) => set({ apiUrl: url }),
  setApiKey: (key) => set({ apiKey: key }),
  setDownloadPath: (path) => set({ downloadPath: path }),
  setTheme: (theme) => set({ theme }),
  setSearchLimit: (limit) => set({ searchLimit: limit }),
  setSearchScoreThreshold: (threshold) => set({ searchScoreThreshold: threshold }),
  setDefaultCollection: (collection) => set({ defaultCollection: collection }),
  setSearchAllCollections: (searchAll) => set({ searchAllCollections: searchAll }),

  saveSettings: async () => {
    const { apiUrl, apiKey, downloadPath, theme, searchLimit, searchScoreThreshold, defaultCollection, searchAllCollections } = get();
    const settings = { apiUrl, apiKey, downloadPath, theme, searchLimit, searchScoreThreshold, defaultCollection, searchAllCollections };

    const { Store } = await import('@tauri-apps/plugin-store');
    const store = await Store.load('settings.json');
    await store.set('settings', settings);
    await store.save();
  },

  loadSettings: async () => {
    console.log('[SettingsStore] loadSettings called');

    try {
      const { Store } = await import('@tauri-apps/plugin-store');
      const store = await Store.load('settings.json');
      const loaded = await store.get<Settings>('settings');
      console.log('[SettingsStore] Loaded from Tauri store:', loaded);

      if (loaded) {
        set(loaded);
      } else {
        console.log('[SettingsStore] No settings found, using defaults');
      }
    } catch (e) {
      console.error('[SettingsStore] Failed to load settings:', e);
    }
  },
}));
