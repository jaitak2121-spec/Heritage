import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import ArchivePage from './pages/ArchivePage';
import SiteDetailPage from './pages/SiteDetailPage';
import UploadPage from './pages/UploadPage';
import MapPage from './pages/MapPage';
import AssistantPage from './pages/AssistantPage';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/archive/:id" element={<SiteDetailPage />} />
        <Route path="/site/:id" element={<SiteDetailPage />} />
        <Route path="/sites/:id" element={<SiteDetailPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/digitize" element={<UploadPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/assistant" element={<AssistantPage />} />
      </Route>
    </Routes>
  );
}

export default App;
