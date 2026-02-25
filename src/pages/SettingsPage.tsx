import { useState, useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { api } from '../lib/api';

export function SettingsPage() {
  // Use shallow selector to ensure reactivity
  const apiUrl = useSettingsStore((state) => state.apiUrl);
  const apiKey = useSettingsStore((state) => state.apiKey);
  const downloadPath = useSettingsStore((state) => state.downloadPath);
  const theme = useSettingsStore((state) => state.theme);
  const defaultCollection = useSettingsStore((state) => state.defaultCollection);
  const searchAllCollections = useSettingsStore((state) => state.searchAllCollections);
  const setApiUrl = useSettingsStore((state) => state.setApiUrl);
  const setApiKey = useSettingsStore((state) => state.setApiKey);
  const setDownloadPath = useSettingsStore((state) => state.setDownloadPath);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const setDefaultCollection = useSettingsStore((state) => state.setDefaultCollection);
  const setSearchAllCollections = useSettingsStore((state) => state.setSearchAllCollections);
  const saveSettings = useSettingsStore((state) => state.saveSettings);
  const loadSettings = useSettingsStore((state) => state.loadSettings);

  const [showApiKey, setShowApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saved, setSaved] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus('idle');

    try {
      const response = await api.healthCheck();

      if (response.data?.status === 'healthy') {
        setConnectionStatus('success');
        setTimeout(() => setConnectionStatus('idle'), 3000);
      }
    } catch (error) {
      setConnectionStatus('error');
      setTimeout(() => setConnectionStatus('idle'), 3000);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSelectDownloadPath = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        directory: true,
        multiple: false,
      });

      if (selected && typeof selected === 'string') {
        setDownloadPath(selected);
      }
    } catch (e) {
      console.error('Failed to open directory dialog:', e);
    }
  };

  const handleSave = async () => {
    await saveSettings();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-full bg-neutral-50 dark:bg-neutral-950">
      <div className="max-w-2xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Settings
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Manage your application preferences
          </p>
        </div>

        <div className="space-y-8">
          {/* API Configuration */}
          <section>
            <h2 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">
              API Configuration
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  API URL
                </label>
                <input
                  type="text"
                  placeholder="https://localhost"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="Enter your API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
                  >
                    {showApiKey ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleTestConnection}
                  disabled={testingConnection || !apiUrl || !apiKey}
                  className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {testingConnection ? 'Testing...' : 'Test Connection'}
                </button>

                {connectionStatus === 'success' && (
                  <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Connected</span>
                  </div>
                )}
                {connectionStatus === 'error' && (
                  <div className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Failed to connect</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Downloads */}
          <section>
            <h2 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">
              Downloads
            </h2>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Save Location
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Select a folder"
                  value={downloadPath}
                  readOnly
                  className="flex-1 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 cursor-default"
                />
                <button
                  onClick={handleSelectDownloadPath}
                  className="px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all whitespace-nowrap"
                >
                  Browse
                </button>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                Downloaded files will be saved to this location
              </p>
            </div>
          </section>

          {/* Collections */}
          <section>
            <h2 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">
              Collections
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Default Collection
                </label>
                <input
                  type="text"
                  placeholder="default"
                  value={defaultCollection}
                  onChange={(e) => setDefaultCollection(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent transition-all"
                />
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                  Files will be uploaded to this collection by default
                </p>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={searchAllCollections}
                    onChange={(e) => setSearchAllCollections(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                  />
                  <div>
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Search all collections by default
                    </span>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      When enabled, searches will query all collections unless you specify specific ones
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </section>

          {/* Appearance */}
          <section>
            <h2 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">
              Appearance
            </h2>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Theme
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['light', 'dark', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      theme === t
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                        : 'bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Save Button */}
        <div className="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-800">
          <button
            onClick={handleSave}
            className="w-full px-4 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-sm font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all"
          >
            {saved ? 'Settings Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
