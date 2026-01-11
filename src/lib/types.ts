export type Theme = 'light' | 'dark' | 'system';

export interface Settings {
  apiUrl: string;
  apiKey: string;
  downloadPath: string;
  theme: Theme;
}

export const defaultSettings: Settings = {
  apiUrl: 'https://localhost',
  apiKey: '',
  downloadPath: '',
  theme: 'system',
};
