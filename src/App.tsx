import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SearchPage } from './pages/SearchPage';
import { UploadPage } from './pages/UploadPage';
import { FilesPage } from './pages/FilesPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { SettingsPage } from './pages/SettingsPage';
import { useSettingsStore } from './stores/settingsStore';
import { useTheme } from './hooks/useTheme';

function App() {
  const loadSettings = useSettingsStore((state) => state.loadSettings);

  // Load settings and apply theme on app start
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Apply theme whenever it changes
  useTheme();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/search" replace />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="files" element={<FilesPage />} />
          <Route path="collections" element={<CollectionsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
