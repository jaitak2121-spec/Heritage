import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Calendar, Building, BookOpen, Image as ImageIcon, Download, Sparkles, ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';
import { getApiErrorMessage, heritageApi } from '../services/api';
import { getSiteGallery, getSiteVisual, SITE_IMAGE_FALLBACK } from '../data/siteVisuals';
import { HERITAGE_SITE_FALLBACKS } from '../data/siteCatalog';

const SiteDetailPage = () => {
  const { id } = useParams();
  const numericId = Number(id);
  const localSite = HERITAGE_SITE_FALLBACKS.find((record) => record.id === numericId) || null;
  const [remoteSite, setRemoteSite] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [activeVisual, setActiveVisual] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const site = remoteSite?.id === numericId ? remoteSite : localSite;
  const error = loadError?.siteId === numericId ? loadError.message : null;
  const syncNotice = remoteSite?.id === numericId
    ? null
    : syncStatus?.siteId === numericId
      ? syncStatus.message
      : localSite
        ? 'Synchronizing the full live record…'
        : null;
  const loading = !site && !error;

  useEffect(() => {
    let isMounted = true;

    const fetchSiteDetail = async () => {
      try {
        const data = await heritageApi.getSiteById(id);
        if (isMounted) {
          setRemoteSite(data);
          setLoadError(null);
          setSyncStatus(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error(`Failed to fetch heritage site #${id}:`, err);
          if (localSite) {
            setSyncStatus({
              siteId: numericId,
              message: 'Live details are delayed; the locally preserved record and gallery remain available.',
            });
          } else {
            setLoadError({
              siteId: numericId,
              message: getApiErrorMessage(err, `Unable to load heritage record #${id}.`),
            });
          }
        }
      }
    };

    if (id) {
      fetchSiteDetail();
    }
    return () => {
      isMounted = false;
    };
  }, [id, localSite, numericId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-parchment text-charcoal font-sans py-12">
        <div className="container mx-auto px-4 max-w-6xl space-y-6">
          <div className="h-4 w-40 bg-parchment-dark/40 rounded skeleton" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-96 bg-parchment-dark/40 rounded-2xl skeleton" />
              <div className="h-40 bg-parchment-dark/30 rounded-2xl skeleton" />
            </div>
            <div className="space-y-6">
              <div className="h-64 bg-parchment-dark/40 rounded-2xl skeleton" />
              <div className="h-48 bg-parchment-dark/30 rounded-2xl skeleton" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="min-h-screen bg-parchment text-charcoal font-sans py-16">
        <div className="container mx-auto px-4 max-w-lg text-center bg-white p-8 rounded-2xl border border-parchment-dark/30 shadow-soft">
          <AlertCircle className="mx-auto text-vermillion mb-3" size={40} />
          <h2 className="text-xl font-serif font-bold text-charcoal mb-2">Heritage Record Not Found</h2>
          <p className="text-xs text-charcoal/70 mb-6 leading-relaxed">
            {error || `No record exists for monument identifier #${id}.`}
          </p>
          <div className="flex justify-center gap-3">
            <Link
              to="/archive"
              className="px-5 py-2.5 bg-maroon text-white rounded-xl text-xs font-semibold hover:bg-maroon-dark transition-colors"
            >
              Back to Archive
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 border border-maroon text-maroon rounded-xl text-xs font-semibold hover:bg-maroon/5 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw size={13} />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const primaryVisual = getSiteVisual(site);
  const currentActiveVisual = activeVisual?.siteId === numericId ? activeVisual.visual : null;
  const selectedVisual = currentActiveVisual || primaryVisual;
  const galleryVisuals = getSiteGallery(site);

  return (
    <div className="min-h-screen bg-parchment text-charcoal font-sans py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Breadcrumb Navigation */}
        <div className="mb-6 flex items-center text-sm text-charcoal/60">
          <Link to="/" className="hover:text-maroon transition-colors flex items-center gap-1">
            <ArrowLeft size={14} />
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link to="/archive" className="hover:text-maroon transition-colors">
            Archive
          </Link>
          <span className="mx-2">/</span>
          <span className="text-maroon font-semibold">{site.name}</span>
        </div>

        {syncNotice && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-gold/30 bg-white/75 px-5 py-3 text-xs text-charcoal/70 shadow-soft">
            <RefreshCw size={15} className={syncNotice.startsWith('Synchronizing') ? 'animate-spin text-maroon' : 'text-gold-dark'} />
            <span>{syncNotice}</span>
          </div>
        )}

        {/* Main Content Layout */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column: Visuals & Narrative */}
          <div className="lg:col-span-2 space-y-8">
            <div className="group relative bg-white rounded-[1.75rem] overflow-hidden shadow-lift border border-gold/20">
              <img
                key={selectedVisual.src}
                src={selectedVisual.src}
                alt={selectedVisual.caption || site.name}
                className="w-full h-[28rem] object-cover transition-transform duration-[1600ms] group-hover:scale-[1.025]"
                style={{ objectPosition: selectedVisual.position || 'center' }}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = SITE_IMAGE_FALLBACK;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between text-white pointer-events-none">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-gold-light mb-2">Field record</p>
                  <p className="font-serif text-2xl font-bold">{site.name}</p>
                </div>
                <span className="hidden sm:block text-xs text-white/75">{site.location_name}</span>
              </div>
              {currentActiveVisual?.caption && (
                <div className="absolute right-6 top-6 max-w-xs rounded-full bg-charcoal/70 px-4 py-2 text-[10px] text-white backdrop-blur-md">
                  {currentActiveVisual.caption}
                </div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {galleryVisuals.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {[{ ...primaryVisual, caption: `Primary archive view of ${site.name}` }, ...galleryVisuals].map((visual) => (
                  <button
                    type="button"
                    key={visual.src}
                    onClick={() => setActiveVisual(visual.src === primaryVisual.src ? null : { siteId: numericId, visual })}
                    className={`rounded-xl overflow-hidden border text-left shadow-xs cursor-pointer transition-all group ${selectedVisual.src === visual.src ? 'border-maroon ring-2 ring-maroon/15' : 'border-parchment-dark/30 hover:border-maroon'}`}
                  >
                    <img
                      src={visual.src}
                      alt={visual.caption}
                      loading="lazy"
                      className="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-300"
                      style={{ objectPosition: visual.position || 'center' }}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = primaryVisual.src || SITE_IMAGE_FALLBACK;
                      }}
                    />
                    <div className="p-2 text-[10px] text-charcoal/70 bg-white line-clamp-2 min-h-10">
                      {visual.caption}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Historical Description */}
            <section className="bg-white p-7 rounded-2xl border border-parchment-dark/30 shadow-soft">
              <h2 className="text-2xl font-serif font-bold text-charcoal mb-4 flex items-center gap-2">
                <BookOpen className="text-maroon" size={22} />
                <span>Historical Context & Architecture</span>
              </h2>
              <div className="text-charcoal/80 text-sm leading-relaxed whitespace-pre-line space-y-3">
                {site.description}
              </div>
            </section>

            {/* Cultural Significance & Sources */}
            <section className="bg-gradient-to-br from-parchment to-white p-7 rounded-2xl border border-parchment-dark/40 shadow-soft space-y-4">
              <div>
                <h2 className="text-2xl font-serif font-bold text-maroon mb-2">
                  Cultural & Archival Significance
                </h2>
                <p className="text-charcoal/80 text-sm leading-relaxed">
                  {site.significance || "Preserved under national monument protection as a symbol of historical regional excellence."}
                </p>
              </div>

              {site.sources && (
                <div className="pt-4 border-t border-parchment-dark/30">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal/60 mb-1.5">
                    Verified Archival Sources & References:
                  </h4>
                  <p className="text-xs text-charcoal/75 leading-relaxed font-mono bg-parchment/60 p-3 rounded-lg border border-parchment-dark/30">
                    {site.sources}
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Quick Facts & Connected Records */}
          <div className="space-y-6">
            {/* Quick Facts Card */}
            <div className="bg-white rounded-2xl p-6 border border-parchment-dark/30 shadow-soft">
              <h3 className="text-xl font-serif font-bold text-charcoal pb-3 border-b border-parchment-dark/20 mb-5">
                Archival Record Facts
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-parchment text-maroon flex items-center justify-center shrink-0">
                    <MapPin size={17} />
                  </div>
                  <div>
                    <div className="text-xs text-charcoal/60">Location</div>
                    <div className="font-semibold text-sm text-charcoal">{site.location_name}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-parchment text-maroon flex items-center justify-center shrink-0">
                    <Calendar size={17} />
                  </div>
                  <div>
                    <div className="text-xs text-charcoal/60">Historical Period</div>
                    <div className="font-semibold text-sm text-charcoal">{site.historical_period}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-parchment text-maroon flex items-center justify-center shrink-0">
                    <Building size={17} />
                  </div>
                  <div>
                    <div className="text-xs text-charcoal/60">Architectural Style</div>
                    <div className="font-semibold text-sm text-charcoal">{site.architectural_style}</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-parchment-dark/20">
                <Link
                  to={`/map?lat=${site.latitude}&lng=${site.longitude}&site=${site.id}`}
                  className="w-full flex items-center justify-center py-3 bg-maroon text-white rounded-xl text-sm font-semibold hover:bg-maroon-dark transition-colors shadow-xs"
                >
                  Locate on Interactive Map
                </Link>
              </div>
            </div>

            {/* Related Documents */}
            <div className="bg-white rounded-2xl p-6 border border-parchment-dark/30 shadow-soft">
              <h3 className="text-xl font-serif font-bold text-charcoal pb-3 border-b border-parchment-dark/20 mb-4 flex items-center gap-2">
                <ImageIcon className="text-maroon" size={20} />
                Archival Documents ({site.documents?.length || 0})
              </h3>
              {(!site.documents || site.documents.length === 0) ? (
                <p className="text-xs text-charcoal/60 py-3 text-center">
                  No documents linked yet. Upload surveys or blueprints below.
                </p>
              ) : (
                <div className="space-y-3">
                  {site.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3.5 bg-parchment/40 rounded-xl border border-parchment-dark/30 hover:border-maroon/40 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <Link to={`/documents/${doc.id}`} className="font-medium text-xs text-charcoal hover:text-maroon hover:underline">{doc.title}</Link>
                        {doc.file_url && (
                          <a
                            href={heritageApi.getDocumentDownloadUrl(doc.id)}
                            title="Download original document"
                            className="text-maroon hover:bg-white p-1.5 rounded-lg transition-colors"
                          >
                            <Download size={15} />
                          </a>
                        )}
                      </div>
                      <div className="text-[11px] text-charcoal/60 mt-1">
                        Format: {doc.file_type} {doc.original_filename && `· ${doc.original_filename}`}
                      </div>
                      {(doc.corrected_text || doc.extracted_text) && (
                        <p className="text-[11px] text-charcoal/70 mt-2 line-clamp-2 bg-white/60 p-2 rounded border border-parchment-dark/20 font-mono">
                          {doc.corrected_text || doc.extracted_text}
                        </p>
                      )}
                      <div className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-maroon/65">
                        {doc.review_status?.replace('_', ' ') || doc.processing_status?.replace('_', ' ') || 'archived'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-5">
                <Link
                  to="/upload"
                  className="w-full flex items-center justify-center py-2.5 border border-maroon text-maroon rounded-xl text-xs font-semibold hover:bg-maroon/5 transition-colors"
                >
                  Digitize More Records for This Site
                </Link>
              </div>
            </div>

            {/* AI Assistant CTA */}
            <div className="bg-gradient-to-br from-charcoal to-maroon text-white rounded-2xl p-6 shadow-soft">
              <div className="flex items-center gap-2 text-gold-light text-xs font-semibold tracking-wider uppercase mb-2">
                <Sparkles size={14} />
                <span>AI Heritage Assistant</span>
              </div>
              <h4 className="font-serif font-bold text-lg mb-2">
                Ask Questions About {site.name}
              </h4>
              <p className="text-xs text-white/80 leading-relaxed mb-4">
                Query our AI assistant regarding architectural specifications, construction dynasties, and archival research.
              </p>
              <Link
                to={`/assistant?site=${site.id}`}
                className="w-full flex items-center justify-center py-3 bg-gold text-charcoal font-semibold text-xs rounded-xl hover:bg-gold-light transition-colors shadow-xs"
              >
                Inquire With AI Assistant
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteDetailPage;
