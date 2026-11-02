import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Calendar, Filter, ChevronRight, Image as ImageIcon, FileText, RefreshCw, AlertCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { heritageApi } from '../services/api';
import { getSiteGallery, getSiteVisual, SITE_IMAGE_FALLBACK } from '../data/siteVisuals';
import { HERITAGE_SITE_FALLBACKS } from '../data/siteCatalog';

const ARCHIVE_CACHE_KEY = 'heritagelens.archive.v1';

const readCachedSites = () => {
  try {
    const cached = JSON.parse(window.localStorage.getItem(ARCHIVE_CACHE_KEY));
    return Array.isArray(cached?.sites) ? cached : null;
  } catch {
    return null;
  }
};

const filterCachedSites = (cachedSites, filters) => cachedSites.filter((site) => {
  const query = filters.q?.toLowerCase();
  const searchableText = `${site.name} ${site.location_name} ${site.description}`.toLowerCase();
  const matchesQuery = !query || searchableText.includes(query);
  const matchesPeriod = !filters.period || site.historical_period?.includes(filters.period);
  const matchesStyle = !filters.style || site.architectural_style === filters.style;
  const matchesRegion = !filters.region || site.region === filters.region;
  return matchesQuery && matchesPeriod && matchesStyle && matchesRegion;
});

const ArchivePage = () => {
  const [searchParams] = useSearchParams();
  const searchParamQuery = searchParams.get('search') || '';
  const [userQuery, setUserQuery] = useState(null);
  const searchTerm = userQuery !== null ? userQuery : searchParamQuery;
  const setSearchTerm = (val) => {
    setUserQuery(val);
    if (val.trim().length < 2) {
      setSearchResults(null);
      setSearchError(null);
    }
  };
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [selectedStyle, setSelectedStyle] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');

  const [catalogSites, setCatalogSites] = useState(() => readCachedSites()?.sites || HERITAGE_SITE_FALLBACKS);
  const [refreshing, setRefreshing] = useState(true);
  const [notice, setNotice] = useState(null);
  const [slowLoading, setSlowLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const activeFilters = useMemo(() => {
    const filters = {};
    if (selectedPeriod !== 'all') filters.period = selectedPeriod;
    if (selectedStyle !== 'all') filters.style = selectedStyle;
    if (selectedRegion !== 'all') filters.region = selectedRegion;
    return filters;
  }, [selectedPeriod, selectedStyle, selectedRegion]);

  const isBackendSearch = debouncedSearchTerm.trim().length >= 2;
  const sites = useMemo(() => {
    if (isBackendSearch) {
      return (searchResults?.sites || []).map((site) => ({
        ...site,
        name: site.title,
        document_count: site.matching_document_count,
        image_count: 0,
      }));
    }
    return filterCachedSites(catalogSites, activeFilters);
  }, [catalogSites, activeFilters, isBackendSearch, searchResults]);

  const loading = catalogSites.length === 0;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearchTerm(searchTerm), 350);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    let isMounted = true;
    const query = debouncedSearchTerm.trim();
    if (query.length < 2) {
      return () => { isMounted = false; };
    }

    const runSearch = async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const result = await heritageApi.searchArchive({ q: query, ...activeFilters });
        if (isMounted) setSearchResults(result);
      } catch {
        if (isMounted) {
          setSearchResults({ sites: [], documents: [], total: 0 });
          setSearchError('The live full-text search is unavailable. Results were not replaced with an incomplete local search.');
        }
      } finally {
        if (isMounted) setSearching(false);
      }
    };
    runSearch();
    return () => { isMounted = false; };
  }, [debouncedSearchTerm, activeFilters]);

  // Fetch sites from backend API
  useEffect(() => {
    let isMounted = true;
    const slowTimer = window.setTimeout(() => {
      if (isMounted) setSlowLoading(true);
    }, 3000);

    const fetchSites = async () => {
      try {
        const data = await heritageApi.getSites();
        if (isMounted) {
          window.clearTimeout(slowTimer);
          setCatalogSites(data);
          window.localStorage.setItem(ARCHIVE_CACHE_KEY, JSON.stringify({
            sites: data,
            savedAt: new Date().toISOString(),
          }));
          setRefreshing(false);
          setSlowLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          window.clearTimeout(slowTimer);
          console.error('Failed to fetch heritage sites from backend:', err);
          setNotice('Live synchronization is delayed. The complete local archive remains available while the service reconnects.');
          setRefreshing(false);
          setSlowLoading(false);
        }
      }
    };

    fetchSites();
    return () => {
      isMounted = false;
      window.clearTimeout(slowTimer);
    };
  }, [retryCount]);

  const periods = ['all', 'Ancient', 'Medieval', 'Mughal Era'];
  const styles = ['all', 'Indo-Islamic', 'Dravidian', 'Rock-Cut', 'Nagara', 'Kalinga'];
  const regions = ['all', 'North', 'South', 'East', 'West', 'Central'];

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedPeriod('all');
    setSelectedStyle('all');
    setSelectedRegion('all');
  };

  const retryConnection = () => {
    setRefreshing(true);
    setSlowLoading(false);
    setNotice(null);
    setRetryCount((count) => count + 1);
  };

  const loadMoreSearchResults = async () => {
    if (!searchResults?.has_more || loadingMore) return;
    setLoadingMore(true);
    setSearchError(null);
    try {
      const next = await heritageApi.searchArchive({
        q: debouncedSearchTerm.trim(),
        ...activeFilters,
        offset: searchResults.offset + searchResults.limit,
        limit: searchResults.limit,
      });
      const uniqueById = (items) => Array.from(new Map(items.map((item) => [item.id, item])).values());
      setSearchResults({
        ...next,
        sites: uniqueById([...(searchResults.sites || []), ...next.sites]),
        documents: uniqueById([...(searchResults.documents || []), ...next.documents]),
      });
    } catch {
      setSearchError('More live search results could not be loaded. The results already shown remain available.');
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="min-h-screen bg-parchment text-charcoal font-sans pb-12">
      {/* Editorial Header Banner */}
      <div className="bg-gradient-to-br from-charcoal via-maroon-dark to-charcoal text-parchment py-12 border-b border-parchment-dark/20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gold/15 text-gold-light rounded-full text-xs font-semibold tracking-wider uppercase mb-4">
            <span>Archival Directory</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-white mb-4">
            Cultural Heritage Archive
          </h1>
          <p className="text-base md:text-lg text-parchment/80 max-w-3xl leading-relaxed">
            Discover India’s architectural records, archaeological monuments, and regional heritage across millennia. Filter by period, stylistic tradition, or geographic zone.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 max-w-6xl py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-2xl p-6 border border-parchment-dark/30 shadow-soft mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-1">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-charcoal/40" size={18} />
                <input
                  type="text"
                  placeholder="Search monuments, eras..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-parchment/30 border border-parchment-dark/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent text-charcoal"
                />
              </div>
            </div>

            {/* Period Filter */}
            <div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-charcoal/40" size={16} />
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-parchment/30 border border-parchment-dark/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent text-charcoal cursor-pointer"
                >
                  {periods.map((p) => (
                    <option key={p} value={p}>
                      {p === 'all' ? 'All Periods' : p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Style Filter */}
            <div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-charcoal/40" size={16} />
                <select
                  value={selectedStyle}
                  onChange={(e) => setSelectedStyle(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-parchment/30 border border-parchment-dark/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent text-charcoal cursor-pointer"
                >
                  {styles.map((s) => (
                    <option key={s} value={s}>
                      {s === 'all' ? 'All Styles' : s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Region Filter */}
            <div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-charcoal/40" size={16} />
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-parchment/30 border border-parchment-dark/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-maroon focus:border-transparent text-charcoal cursor-pointer"
                >
                  {regions.map((r) => (
                    <option key={r} value={r}>
                      {r === 'all' ? 'All Regions' : `${r} India`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-parchment-dark/20 flex items-center justify-between text-xs text-charcoal/60">
            <div>
              {loading && <span>Preparing archive records…</span>}
              {!loading && (
                <span>
                  {searching ? 'Searching extracted records…' : <>Showing <strong className="text-maroon font-semibold">{isBackendSearch ? (searchResults?.total || 0) : sites.length}</strong> {isBackendSearch ? 'live search' : (notice ? 'local archive' : 'heritage archive')} records</>}
                  {refreshing && <span className="ml-2 text-gold-dark">· Syncing live data…</span>}
                </span>
              )}
            </div>
            {(searchTerm || selectedPeriod !== 'all' || selectedStyle !== 'all' || selectedRegion !== 'all') && (
              <button
                onClick={clearFilters}
                className="text-maroon font-semibold hover:underline"
              >
                Reset All Filters
              </button>
            )}
          </div>
        </div>

        {refreshing && slowLoading && (
          <div className="mb-6 flex items-center justify-center gap-3 rounded-2xl border border-gold/30 bg-white/70 px-5 py-3 text-sm text-charcoal/70 shadow-soft">
            <RefreshCw size={16} className="animate-spin text-maroon" />
            <span>Live data is syncing in the background. You can continue exploring the local archive.</span>
          </div>
        )}

        {/* Loading State — only needed if both cache and bundled catalog are unavailable. */}
        {loading && sites.length === 0 && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden border border-parchment-dark/30 p-4 space-y-3">
                  <div className="h-44 bg-parchment-dark/40 rounded-xl skeleton" />
                  <div className="h-4 w-3/4 bg-parchment-dark/40 rounded skeleton" />
                  <div className="h-3 w-1/2 bg-parchment-dark/30 rounded skeleton" />
                  <div className="h-10 bg-parchment-dark/20 rounded skeleton" />
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && notice && (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-gold/35 bg-white/80 px-5 py-4 text-sm text-charcoal/75 shadow-soft sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle size={18} className="shrink-0 text-gold-dark" />
              <span>{notice}</span>
            </div>
            <button
              onClick={retryConnection}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-maroon px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-maroon-dark"
            >
              <RefreshCw size={14} />
              Reconnect
            </button>
          </div>
        )}

        {searchError && (
          <div role="alert" className="mb-6 flex items-center gap-3 rounded-2xl border border-vermillion/30 bg-vermillion/10 px-5 py-4 text-sm text-vermillion-dark">
            <AlertCircle size={18} className="shrink-0" />
            <span>{searchError}</span>
          </div>
        )}

        {isBackendSearch && searching && (
          <div className="mb-6 flex items-center justify-center gap-3 rounded-2xl border border-gold/25 bg-white/80 px-5 py-4 text-sm text-charcoal/65">
            <RefreshCw size={16} className="animate-spin text-maroon" /> Searching site metadata and digitized document text…
          </div>
        )}

        {isBackendSearch && !searching && (searchResults?.documents?.length || 0) > 0 && (
          <section className="mb-8 rounded-2xl border border-gold/25 bg-white p-6 shadow-soft" aria-labelledby="document-search-heading">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-maroon">Full-text matches</p>
                <h2 id="document-search-heading" className="font-serif text-xl font-bold text-charcoal">Digitized documents</h2>
              </div>
              <span className="text-xs text-charcoal/50">{searchResults.documents.length} match{searchResults.documents.length === 1 ? '' : 'es'}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {searchResults.documents.map((document) => (
                <Link
                  key={document.id}
                  to={`/documents/${document.id}`}
                  className="group rounded-xl border border-parchment-dark/40 bg-parchment/20 p-4 transition hover:border-maroon/30 hover:bg-parchment/40"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <span className="flex items-center gap-2 font-semibold text-charcoal group-hover:text-maroon"><FileText size={16} />{document.title}</span>
                    <ChevronRight size={16} className="shrink-0 text-maroon" />
                  </div>
                  <p className="mb-2 line-clamp-3 text-xs leading-relaxed text-charcoal/65">{document.excerpt}</p>
                  <p className="text-[11px] font-medium text-maroon/75">{document.site_name || 'General archive record'} · {document.review_status.replace('_', ' ')}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {!loading && !refreshing && !searching && !searchError && sites.length === 0 && (searchResults?.documents?.length || 0) === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-parchment-dark/30 shadow-soft">
            <div className="text-5xl mb-4">🏛️</div>
            <h3 className="text-2xl font-serif font-bold text-charcoal mb-2">No Matching Records Found</h3>
            <p className="text-charcoal/60 text-sm max-w-md mx-auto mb-6">
              Try adjusting your search criteria or resetting filters to explore other heritage sites.
            </p>
            <button
              onClick={clearFilters}
              className="px-6 py-2.5 bg-maroon text-white rounded-xl text-sm font-semibold hover:bg-maroon-dark transition-colors shadow-xs"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Results Grid */}
        {!loading && sites.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {sites.map((site, index) => (
              <motion.div
                key={site.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: Math.min(index * 0.045, 0.4) }}
                whileHover={{ y: -9, rotateX: 1.5 }}
                className="museum-glint group relative bg-white rounded-[1.4rem] overflow-hidden border border-gold/20 shadow-soft hover:shadow-lift transition-all duration-300 flex flex-col [transform-style:preserve-3d]"
              >
                <div className="relative h-52 overflow-hidden bg-parchment-dark/40">
                  <img
                    src={getSiteVisual(site).src}
                    alt={site.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                    style={{ objectPosition: getSiteVisual(site).position }}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = SITE_IMAGE_FALLBACK;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/75 via-transparent to-transparent opacity-70 group-hover:opacity-45 transition-opacity duration-500" />
                  <div className="absolute top-3 right-3 px-2.5 py-1 bg-white/95 backdrop-blur-sm rounded-full shadow-xs">
                    <span className="text-[11px] font-semibold text-charcoal">UNESCO</span>
                  </div>
                  <div className="absolute bottom-3 left-3 px-2 py-0.5 bg-charcoal/70 backdrop-blur-sm text-white rounded-md text-[10px] font-medium">
                    {site.region} India
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-serif font-bold text-charcoal mb-1.5 group-hover:text-maroon transition-colors">
                      {site.name}
                    </h3>
                    <div className="flex items-center text-xs text-charcoal/60 mb-3">
                      <MapPin size={13} className="mr-1 text-maroon" />
                      {site.location_name}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="px-2 py-0.5 bg-gold/15 text-gold-dark text-[11px] font-semibold rounded-md">
                        {site.historical_period}
                      </span>
                      <span className="px-2 py-0.5 bg-maroon/10 text-maroon text-[11px] font-semibold rounded-md">
                        {site.architectural_style}
                      </span>
                    </div>
                    <p className="text-charcoal/70 text-xs line-clamp-3 leading-relaxed mb-4">
                      {site.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-parchment-dark/20 flex items-center justify-between text-xs text-charcoal/60">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1" title="Digitized Documents">
                        <FileText size={13} />
                        {site.document_count || 0}
                      </span>
                      <span className="flex items-center gap-1" title="Gallery Plates">
                        <ImageIcon size={13} />
                        {Math.max(site.image_count || 0, getSiteGallery(site).length + 1)}
                      </span>
                    </div>
                    <Link
                      to={`/archive/${site.id}`}
                      className="text-maroon font-semibold hover:text-maroon-dark flex items-center gap-0.5"
                    >
                      <span>Explore</span>
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {isBackendSearch && searchResults?.has_more && !searchError && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={loadMoreSearchResults}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 rounded-xl border border-maroon px-6 py-3 text-sm font-semibold text-maroon transition hover:bg-maroon hover:text-white disabled:opacity-60"
            >
              {loadingMore && <RefreshCw size={16} className="animate-spin" />}
              {loadingMore ? 'Loading more records…' : 'Load more search results'}
            </button>
          </div>
        )}

        {/* Missing Site Contribution CTA */}
        <div className="mt-14 bg-gradient-to-br from-charcoal to-maroon text-parchment rounded-2xl p-8 shadow-soft border border-charcoal-light/30">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mb-3">
                Have Historical Documents to Archive?
              </h2>
              <p className="text-sm text-parchment/80 leading-relaxed mb-6">
                Contribute colonial surveys, architectural blueprints, or regional inscriptions to expand India's digital heritage knowledge base.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/upload"
                  className="px-5 py-2.5 bg-terracotta text-white rounded-xl text-xs font-semibold hover:bg-terracotta-dark transition-all shadow-xs"
                >
                  Upload Documents & Run OCR
                </Link>
                <Link
                  to="/map"
                  className="px-5 py-2.5 bg-white/15 text-white rounded-xl text-xs font-semibold hover:bg-white/25 transition-all border border-white/20"
                >
                  Explore Mapped Locations
                </Link>
              </div>
            </div>
            <div className="text-center md:text-right">
              <div className="inline-block p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
                <div className="text-4xl mb-2">📜</div>
                <div className="text-2xl font-bold text-gold-light">1,200+</div>
                <div className="text-xs text-parchment/70">Archival Records Preserved</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArchivePage;
