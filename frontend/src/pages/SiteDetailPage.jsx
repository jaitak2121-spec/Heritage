import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Calendar, Building, BookOpen, Image as ImageIcon, Download, Sparkles, ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';
import { heritageApi } from '../services/api';

const SiteDetailPage = () => {
  const { id } = useParams();
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchSiteDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await heritageApi.getSiteById(id);
        if (isMounted) {
          setSite(data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error(`Failed to fetch heritage site #${id}:`, err);
          setError(`Unable to find or load heritage record #${id}.`);
          setLoading(false);
        }
      }
    };

    if (id) {
      fetchSiteDetail();
    }
    return () => {
      isMounted = false;
    };
  }, [id]);

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

        {/* Main Content Layout */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column: Visuals & Narrative */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-2xl overflow-hidden shadow-soft border border-parchment-dark/30">
              <img
                src={site.image_url}
                alt={site.name}
                className="w-full h-96 object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Konarka_Temple.jpg/1280px-Konarka_Temple.jpg';
                }}
              />
            </div>

            {/* Thumbnail Gallery */}
            {site.images && site.images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {site.images.map((img) => (
                  <div
                    key={img.id}
                    className="rounded-xl overflow-hidden border border-parchment-dark/30 shadow-xs cursor-pointer hover:border-maroon transition-all group"
                  >
                    <img
                      src={img.image_url}
                      alt={img.caption || `${site.name} plate`}
                      className="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Konark_wheel.jpg/800px-Konark_wheel.jpg';
                      }}
                    />
                    {img.caption && (
                      <div className="p-1.5 text-[10px] text-charcoal/70 bg-white truncate">
                        {img.caption}
                      </div>
                    )}
                  </div>
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
                        <div className="font-medium text-xs text-charcoal">{doc.title}</div>
                        <button
                          type="button"
                          title="Download document record"
                          className="text-maroon hover:bg-white p-1.5 rounded-lg transition-colors"
                        >
                          <Download size={15} />
                        </button>
                      </div>
                      <div className="text-[11px] text-charcoal/60 mt-1">
                        Format: {doc.file_type} {doc.original_filename && `· ${doc.original_filename}`}
                      </div>
                      {doc.extracted_text && (
                        <p className="text-[11px] text-charcoal/70 mt-2 line-clamp-2 bg-white/60 p-2 rounded border border-parchment-dark/20 font-mono">
                          {doc.extracted_text}
                        </p>
                      )}
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
