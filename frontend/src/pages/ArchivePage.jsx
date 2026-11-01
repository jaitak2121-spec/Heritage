import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Calendar, Filter, ChevronRight, Image as ImageIcon, FileText, RefreshCw, AlertCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { getApiErrorMessage, heritageApi } from '../services/api';
import { getSiteVisual, SITE_IMAGE_FALLBACK } from '../data/siteVisuals';

const ArchivePage = () => {
  const [searchParams] = useSearchParams();
  const searchParamQuery = searchParams.get('search') || '';
  const [userQuery, setUserQuery] = useState(null);
  const searchTerm = userQuery !== null ? userQuery : searchParamQuery;
  const setSearchTerm = (val) => setUserQuery(val);

  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [selectedStyle, setSelectedStyle] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');

  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Fetch sites from backend API
  useEffect(() => {
    let isMounted = true;
    const fetchSites = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = {};
        if (searchTerm.trim()) params.q = searchTerm.trim();
        if (selectedPeriod !== 'all') params.period = selectedPeriod;
        if (selectedStyle !== 'all') params.style = selectedStyle;
        if (selectedRegion !== 'all') params.region = selectedRegion;

        const data = await heritageApi.getSites(params);
        if (isMounted) {
          setSites(data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to fetch heritage sites from backend:', err);
          setSites([]);
          setError(getApiErrorMessage(err, 'Unable to load heritage records.'));
          setLoading(false);
        }
      }
    };

    fetchSites();
    return () => {
      isMounted = false;
    };
  }, [searchTerm, selectedPeriod, selectedStyle, selectedRegion, retryCount]);

  const periods = ['all', 'Ancient', 'Medieval', 'Mughal Era'];
  const styles = ['all', 'Indo-Islamic', 'Dravidian', 'Rock-Cut', 'Nagara', 'Kalinga'];
  const regions = ['all', 'North', 'South', 'East', 'West', 'Central'];

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedPeriod('all');
    setSelectedStyle('all');
    setSelectedRegion('all');
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
              Showing <strong className="text-maroon font-semibold">{sites.length}</strong> live database records
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

        {/* Loading State */}
        {loading && (
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
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center text-red-800 max-w-lg mx-auto">
            <AlertCircle className="mx-auto mb-3 text-red-600" size={36} />
            <h3 className="font-serif font-bold text-lg mb-2">Database Connection Notice</h3>
            <p className="text-xs text-red-700 mb-5 leading-relaxed">{error}</p>
            <button
              onClick={() => setRetryCount((count) => count + 1)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-maroon text-white rounded-xl text-xs font-semibold hover:bg-maroon-dark transition-colors shadow-xs"
            >
              <RefreshCw size={14} />
              <span>Retry Connection</span>
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && sites.length === 0 && (
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
        {!loading && !error && sites.length > 0 && (
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
                        {site.image_count || 0}
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
