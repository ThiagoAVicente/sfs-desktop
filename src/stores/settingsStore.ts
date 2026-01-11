import { create } from 'zustand';
import { Settings, defaultSettings } from '../lib/types';

interface SettingsStore extends Settings {
  setApiUrl: (url: string) => void;
  setApiKey: (key: string) => void;
  setDownloadPath: (path: string) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  saveSettings: () => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...defaultSettings,

  setApiUrl: (url) => set({ apiUrl: url }),
  setApiKey: (key) => set({ apiKey: key }),
  setDownloadPath: (path) => set({ downloadPath: path }),
  setTheme: (theme) => set({ theme }),

  saveSettings: async () => {
    const { apiUrl, apiKey, downloadPath, theme } = get();
    const settings = { apiUrl, apiKey, downloadPath, theme };

    if (window.__TAURI__) {
      const { Store } = await import('@tauri-apps/plugin-store');
      const store = await Store.load('settings.json');
      await store.set('settings', settings);
      await store.save();
    } else {
      localStorage.setItem('sfs-settings', JSON.stringify(settings));
    }
  },

  loadSettings: async () => {
    let settings: Settings | null = null;

    if (window.__TAURI__) {
      try {
        const { Store } = await import('@tauri-apps/plugin-store');
        const store = await Store.load('settings.json');
        const loaded = await store.get<Settings>('settings');
        settings = loaded ?? null;
      } catch (e) {
        console.error('Failed to load settings from Tauri store:', e);
      }
    } else {
      const stored = localStorage.getItem('sfs-settings');
      if (stored) {
        settings = JSON.parse(stored);
      }
    }

    if (settings) {
      set(settings);
    }
  },
}));
