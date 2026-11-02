import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';

const ArchivePage = lazy(() => import('./pages/ArchivePage'));
const SiteDetailPage = lazy(() => import('./pages/SiteDetailPage'));
const UploadPage = lazy(() => import('./pages/UploadPage'));
const MapPage = lazy(() => import('./pages/MapPage'));
const AssistantPage = lazy(() => import('./pages/AssistantPage'));
const CuratorLoginPage = lazy(() => import('./pages/CuratorLoginPage'));
const DocumentDetailPage = lazy(() => import('./pages/DocumentDetailPage'));

const RouteLoader = () => (
  <div className="min-h-[65vh] bg-parchment px-4 py-16" role="status" aria-label="Loading page">
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="h-4 w-40 rounded skeleton" />
      <div className="h-12 max-w-xl rounded-xl skeleton" />
      <div className="grid gap-6 md:grid-cols-3">
        <div className="h-64 rounded-2xl skeleton" />
        <div className="h-64 rounded-2xl skeleton" />
        <div className="h-64 rounded-2xl skeleton" />
      </div>
    </div>
  </div>
);

function App() {
  return (
    <Suspense fallback={<RouteLoader />}>
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
          <Route path="/curator/login" element={<CuratorLoginPage />} />
          <Route path="/documents/:id" element={<DocumentDetailPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
