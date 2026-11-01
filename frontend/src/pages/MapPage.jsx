import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { MapPin, Info, Navigation, ExternalLink, Sparkles, AlertCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { getApiErrorMessage, heritageApi } from '../services/api';
import { getSiteVisual, SITE_IMAGE_FALLBACK } from '../data/siteVisuals';

// Fix leaflet icon paths cleanly in Vite ESM
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom museum heritage marker icon
const heritageIcon = L.divIcon({
  html: `<div class="w-10 h-10 rounded-full bg-gradient-to-br from-terracotta to-maroon border-2 border-parchment shadow-md flex items-center justify-center transform hover:scale-110 transition-transform">
           <span class="text-white text-base">🏛️</span>
         </div>`,
  className: 'custom-heritage-pin',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

// Helper component to smoothly pan/fly the map
const MapController = ({ target }) => {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], 9, { duration: 1.5 });
    }
  }, [target, map]);
  return null;
};

const INITIAL_FALLBACK_SITES = [
  {
    id: 1,
    name: 'Taj Mahal',
    description: 'White marble mausoleum built by Emperor Shah Jahan in memory of Mumtaz Mahal.',
    historical_period: 'Mughal Era · 1632–1653',
    architectural_style: 'Indo-Islamic',
    latitude: 27.1751,
    longitude: 78.0421,
    image_url: '/images/sites/taj-mahal.jpg',
  },
  {
    id: 6,
    name: 'Konark Sun Temple',
    description: 'Monumental 13th-century chariot of the Sun God Surya, famous for 24 carved stone wheels.',
    historical_period: 'Medieval · 13th Century',
    architectural_style: 'Kalinga Architecture',
    latitude: 19.8876,
    longitude: 86.0945,
    image_url: '/images/sites/konark-sun-temple.jpg',
  },
];

const MapPage = () => {
  const [searchParams] = useSearchParams();
  const [sites, setSites] = useState(INITIAL_FALLBACK_SITES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const siteIdParam = searchParams.get('site');
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');

  const [userSelectedSite, setUserSelectedSite] = useState(null);
  const paramSite = siteIdParam ? sites.find((s) => String(s.id) === String(siteIdParam)) : null;
  const selectedSite = userSelectedSite || paramSite || sites[0];

  const [userFlyTarget, setUserFlyTarget] = useState(null);
  const queryFlyTarget = paramSite 
    ? { lat: paramSite.latitude, lng: paramSite.longitude }
    : (latParam && lngParam && !isNaN(parseFloat(latParam)) && !isNaN(parseFloat(lngParam))
        ? { lat: parseFloat(latParam), lng: parseFloat(lngParam) }
        : null);
  const flyTarget = userFlyTarget || queryFlyTarget;

  // Fetch real map markers from backend API
  useEffect(() => {
    let isMounted = true;
    const loadMarkers = async () => {
      try {
        const markers = await heritageApi.getMapMarkers();
        if (isMounted) {
          setSites(markers);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Backend map markers unavailable, using fallback:', err);
          setError(getApiErrorMessage(err, 'Live map locations are unavailable. Showing fallback locations.'));
          setLoading(false);
        }
      }
    };
    loadMarkers();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectSite = (site) => {
    setUserSelectedSite(site);
    setUserFlyTarget({ lat: site.latitude, lng: site.longitude });
  };

  return (
    <div className="min-h-screen bg-parchment text-charcoal font-sans py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <header className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-maroon/10 text-maroon rounded-full text-xs font-semibold tracking-wider uppercase mb-3">
            <MapPin size={14} />
            <span>Geospatial Heritage Explorer</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-charcoal mb-3">
            Interactive Heritage Map
          </h1>
          <p className="text-base md:text-lg text-charcoal/70 max-w-3xl">
            Explore monuments and historical sites across the Indian subcontinent. Select any marker to view architectural notes, coordinates, and archival documents.
          </p>
        </header>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Map Column */}
          <div className="lg:col-span-2 space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="bg-white rounded-2xl p-3 border border-parchment-dark/30 shadow-soft overflow-hidden">
              <MapContainer
                center={[20.5937, 78.9629]}
                zoom={5}
                style={{ height: '580px', width: '100%' }}
                className="rounded-xl z-0"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapController target={flyTarget} />
                {sites.map((site) => (
                  <Marker
                    key={site.id}
                    position={[site.latitude, site.longitude]}
                    icon={heritageIcon}
                    eventHandlers={{
                      click: () => handleSelectSite(site),
                    }}
                  >
                    <Popup className="heritage-popup">
                      <div className="p-1 max-w-[240px]">
                        <h4 className="font-serif font-bold text-base text-charcoal">{site.name}</h4>
                        <p className="text-xs text-charcoal/70 mt-1 line-clamp-2">{site.description}</p>
                        <div className="mt-2 text-[11px] font-semibold text-maroon">
                          {site.historical_period}
                        </div>
                        <Link
                          to={`/archive/${site.id}`}
                          className="inline-flex items-center gap-1 mt-3 text-xs text-maroon font-semibold hover:underline"
                        >
                          View full record
                          <ExternalLink size={12} />
                        </Link>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-parchment-dark/30 text-xs text-charcoal/70">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-terracotta to-maroon flex items-center justify-center text-[10px] text-white">
                  🏛️
                </div>
                <span>UNESCO & Significant Cultural Sites</span>
              </div>
              <div className="font-medium">
                {loading
                  ? 'Loading markers...'
                  : `Showing ${sites.length} ${error ? 'fallback' : 'live database'} locations`}
              </div>
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            {/* Selected Site Detail Card */}
            {selectedSite && (
              <div className="bg-white rounded-2xl border border-parchment-dark/30 shadow-soft p-6">
                <div className="flex items-center justify-between pb-3 border-b border-parchment-dark/20 mb-4">
                  <h3 className="font-serif font-bold text-lg text-charcoal flex items-center gap-2">
                    <Info size={18} className="text-maroon" />
                    Selected Monument
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-gold/15 text-gold-dark rounded-full">
                    {selectedSite.architectural_style}
                  </span>
                </div>

                <div className="h-40 rounded-xl overflow-hidden mb-4 border border-parchment-dark/20 relative">
                  <img
                    src={getSiteVisual(selectedSite).src}
                    alt={selectedSite.name}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: getSiteVisual(selectedSite).position }}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = SITE_IMAGE_FALLBACK;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <h4 className="font-serif font-bold text-lg leading-tight">{selectedSite.name}</h4>
                    <p className="text-xs text-white/80">{selectedSite.historical_period}</p>
                  </div>
                </div>

                <p className="text-sm text-charcoal/75 leading-relaxed mb-4">
                  {selectedSite.description}
                </p>

                <div className="flex items-center gap-1.5 text-xs text-charcoal/60 mb-5">
                  <MapPin size={13} className="text-maroon shrink-0" />
                  <span>
                    Coordinates: {selectedSite.latitude.toFixed(4)}° N, {selectedSite.longitude.toFixed(4)}° E
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Link
                    to={`/archive/${selectedSite.id}`}
                    className="py-2.5 px-3 bg-maroon text-white text-xs font-semibold rounded-xl text-center hover:bg-maroon-dark transition-colors shadow-xs"
                  >
                    Examine Archive
                  </Link>
                  <Link
                    to={`/assistant?site=${selectedSite.id}`}
                    className="py-2.5 px-3 bg-parchment border border-parchment-dark/40 text-charcoal text-xs font-semibold rounded-xl text-center hover:bg-parchment-dark/40 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Sparkles size={12} className="text-gold-dark" />
                    Ask Assistant
                  </Link>
                </div>
              </div>
            )}

            {/* List of Sites */}
            <div className="bg-white rounded-2xl border border-parchment-dark/30 shadow-soft p-5">
              <h3 className="font-serif font-bold text-base text-charcoal mb-4 pb-2 border-b border-parchment-dark/20">
                Directory of Mapped Sites
              </h3>
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {sites.map((site) => {
                  const isSelected = selectedSite?.id === site.id;
                  return (
                    <div
                      key={site.id}
                      onClick={() => handleSelectSite(site)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? 'border-maroon bg-parchment/60 shadow-xs'
                          : 'border-parchment-dark/20 hover:border-maroon/40 hover:bg-parchment/20'
                      }`}
                    >
                      <img
                        src={getSiteVisual(site).src}
                        alt={site.name}
                        className="w-12 h-12 rounded-lg object-cover shrink-0"
                        style={{ objectPosition: getSiteVisual(site).position }}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = SITE_IMAGE_FALLBACK;
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-serif font-bold text-sm text-charcoal truncate">
                          {site.name}
                        </h4>
                        <p className="text-xs text-charcoal/60 truncate">{site.architectural_style}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectSite(site);
                        }}
                        className="p-1.5 rounded-lg text-charcoal/50 hover:text-maroon hover:bg-white transition-colors"
                        title="Center on map"
                      >
                        <Navigation size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPage;
