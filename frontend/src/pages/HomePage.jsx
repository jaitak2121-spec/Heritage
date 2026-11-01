import { useState, useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { Search, MapPin, Archive, Upload, MessageSquare, ChevronRight, ArrowRight, Globe } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getSiteVisual, SITE_IMAGE_FALLBACK } from '../data/siteVisuals';

const HomePage = () => {
  const [heroSearch, setHeroSearch] = useState('');
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });

  // For parallax effects
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const titleY = useTransform(scrollYProgress, [0, 0.3], ['0%', '-20%']);

  const handleHeroSearch = (e) => {
    e.preventDefault();
    if (heroSearch.trim()) {
      navigate(`/archive?search=${encodeURIComponent(heroSearch.trim())}`);
    } else {
      navigate('/archive');
    }
  };

  return (
    <div className="min-h-screen bg-parchment text-charcoal font-sans">
      {/* Hero Section - Konark Sun Temple inspired */}
      <section ref={heroRef} className="relative min-h-[calc(100vh-65px)] flex items-center justify-center overflow-hidden isolate">
        <motion.div
          className="absolute inset-0"
          style={{ y: heroY }}
          initial={{ opacity: 0 }}
          animate={heroInView ? { opacity: 1 } : {}}
          transition={{ duration: 1.5 }}
        >
          {/* Konark Sun Temple wheel background */}
          <img
            src={getSiteVisual('Konark Sun Temple').src}
            alt="Konark Sun Temple — monumental Kalinga architecture"
            className="w-full h-full object-cover"
            style={{ objectPosition: getSiteVisual('Konark Sun Temple').position }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-charcoal/90 via-charcoal/45 to-maroon/35" />
          <div className="absolute inset-0 heritage-grain opacity-35" />
        </motion.div>

        <motion.div
          aria-hidden="true"
          className="absolute -left-28 top-24 h-80 w-80 rounded-full border border-gold/25"
          animate={{ rotate: 360, scale: [1, 1.08, 1] }}
          transition={{ rotate: { duration: 32, repeat: Infinity, ease: 'linear' }, scale: { duration: 6, repeat: Infinity } }}
        >
          <div className="absolute inset-8 rounded-full border border-dashed border-gold/30" />
          <div className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full bg-gold shadow-[0_0_28px_rgba(196,154,90,0.9)]" />
        </motion.div>

        <motion.div
          aria-hidden="true"
          className="absolute -right-32 bottom-16 h-96 w-96 rounded-full border border-white/15"
          animate={{ rotate: -360 }}
          transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
        >
          <div className="absolute inset-12 rounded-full border border-dashed border-white/20" />
        </motion.div>

        <motion.div
          className="relative container mx-auto px-4 text-center text-white"
          style={{ opacity: titleOpacity, y: titleY }}
          initial={{ opacity: 0, y: 30 }}
          animate={heroInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={heroInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="inline-flex items-center px-6 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-8 border border-white/20"
            >
              <span className="text-gold-light text-sm font-medium tracking-wider">
                UNESCO WORLD HERITAGE DIGITAL ARCHIVE
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold mb-6 leading-[0.92] tracking-[-0.045em]"
            >
              <span className="block text-white">India's Heritage,</span>
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, delay: 0.8 }}
                className="block text-gold-light mt-4"
              >
                Reimagined
              </motion.span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 1 }}
              className="text-xl md:text-2xl text-white/90 mb-12 max-w-3xl mx-auto leading-relaxed"
            >
              A digital museum celebrating India's architectural wonders, historical manuscripts,
              and cultural narratives across millennia.
            </motion.p>

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 1.2 }}
              className="max-w-2xl mx-auto mb-12"
            >
              <form onSubmit={handleHeroSearch} className="relative">
                <input
                  type="text"
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                  placeholder="Search heritage sites, monuments, or historical periods..."
                  className="w-full px-6 py-5 pl-16 pr-24 bg-white/15 backdrop-blur-sm border border-white/30 rounded-2xl text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent text-lg shadow-2xl"
                />
                <div className="absolute left-6 top-1/2 transform -translate-y-1/2 text-white/70">
                  <Search size={24} />
                </div>
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 px-4 py-2 bg-gold text-charcoal font-semibold text-sm rounded-xl hover:bg-gold-light transition-colors"
                >
                  Search
                </button>
              </form>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 1.4 }}
              className="flex flex-wrap justify-center gap-6"
            >
              <Link
                to="/archive"
                className="group relative px-8 py-4 bg-vermillion text-white rounded-xl font-semibold text-lg hover:bg-vermillion-dark transition-all duration-300 shadow-2xl hover:shadow-3xl overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-3">
                  Explore Archive
                  <ArrowRight className="group-hover:translate-x-2 transition-transform duration-300" size={20} />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-maroon to-vermillion opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
              <Link
                to="/map"
                className="group px-8 py-4 bg-white/20 backdrop-blur-sm text-white rounded-xl font-semibold text-lg hover:bg-white/30 transition-all duration-300 border border-white/30 shadow-xl hover:shadow-2xl"
              >
                <span className="flex items-center gap-3">
                  Interactive Map
                  <MapPin className="group-hover:scale-110 transition-transform duration-300" size={20} />
                </span>
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <ChevronRight className="w-8 h-8 text-white/70 rotate-90" />
        </motion.div>
      </section>

      <section aria-label="Archive themes" className="overflow-hidden border-y border-gold/20 bg-charcoal py-3 text-ivory">
        <div className="heritage-marquee flex min-w-max items-center gap-8 text-[11px] font-semibold uppercase tracking-[0.28em]">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex items-center gap-8" aria-hidden={copy === 1}>
              {['Architecture', 'Epigraphy', 'Living monuments', 'Sacred geometry', 'Digital preservation', 'Regional memory'].map((item) => (
                <span key={`${copy}-${item}`} className="flex items-center gap-8 whitespace-nowrap">
                  {item}<span className="text-gold">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Featured Heritage Collections - Manuscript Inspired */}
      <section className="py-24 bg-parchment">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="inline-block px-6 py-2 bg-maroon/10 text-maroon rounded-full text-sm font-medium mb-6 tracking-wider">
              ARCHIVE HIGHLIGHTS
            </span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-charcoal mb-6">
              Featured Heritage Collections
            </h2>
            <p className="text-lg text-charcoal/70 max-w-3xl mx-auto">
              Discover India's cultural diversity through prominent architectural sites across different regions and historical periods.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                id: 1,
                title: 'Taj Mahal',
                location: 'Agra, Uttar Pradesh',
                period: 'Mughal Era · 1632–1653',
                image: getSiteVisual('Taj Mahal'),
                description: 'White marble mausoleum and UNESCO World Heritage Site.',
                region: 'North India'
              },
              {
                id: 9,
                title: 'Khajuraho Temples',
                location: 'Madhya Pradesh',
                period: '10th–11th Century',
                image: getSiteVisual('Khajuraho Temples'),
                description: 'Group of Hindu and Jain temples with intricate sculptures.',
                region: 'Central India'
              },
              {
                id: 4,
                title: 'Hampi Ruins',
                location: 'Karnataka',
                period: '14th–16th Century',
                image: getSiteVisual('Hampi Ruins'),
                description: 'Ruins of the medieval Vijayanagara kingdom.',
                region: 'South India'
              },
              {
                id: 6,
                title: 'Sun Temple, Konark',
                location: 'Odisha',
                period: '13th Century',
                image: getSiteVisual('Sun Temple, Konark'),
                description: '13th-century Sun Temple shaped as a colossal chariot.',
                region: 'East India'
              }
            ].map((site, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -12, rotateX: 2, rotateY: index % 2 === 0 ? 1.5 : -1.5, transition: { duration: 0.3 } }}
                className="museum-glint group relative bg-white rounded-[1.6rem] overflow-hidden shadow-soft hover:shadow-lift transition-all duration-300 border border-gold/20 cursor-pointer [transform-style:preserve-3d]"
              >
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={site.image.src}
                    alt={site.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                    style={{ objectPosition: site.image.position }}
                    onError={(event) => { event.currentTarget.src = SITE_IMAGE_FALLBACK; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-transparent to-transparent opacity-70 group-hover:opacity-40 transition-opacity duration-500" />
                  <motion.div
                    aria-hidden="true"
                    className="absolute -bottom-12 -right-12 h-28 w-28 rounded-full border border-gold/60"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
                  />
                  <div className="absolute top-4 right-4 px-3 py-1 bg-white/95 backdrop-blur-sm rounded-full">
                    <span className="text-xs font-semibold text-charcoal tracking-wide">UNESCO</span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="mb-4">
                    <h3 className="text-xl font-serif font-bold text-charcoal mb-2">{site.title}</h3>
                    <div className="flex items-center text-sm text-maroon mb-3">
                      <MapPin size={16} className="mr-2" />
                      {site.location}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="inline-block px-2 py-1 bg-gold/10 text-gold-dark text-xs font-semibold rounded-full">
                        {site.period}
                      </span>
                      <span className="inline-block px-2 py-1 bg-terracotta/10 text-terracotta-dark text-xs font-semibold rounded-full">
                        {site.region}
                      </span>
                    </div>
                  </div>
                  <p className="text-charcoal/70 text-sm leading-relaxed mb-6">{site.description}</p>
                  <Link
                    to={`/archive/${site.id}`}
                    className="inline-flex items-center text-maroon font-semibold hover:text-maroon-dark transition-colors group/link"
                  >
                    <span className="mr-2">Explore Details</span>
                    <ChevronRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform duration-300" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center mt-12"
          >
            <Link
              to="/archive"
              className="inline-flex items-center gap-3 px-8 py-4 border border-maroon text-maroon rounded-xl font-semibold hover:bg-maroon/5 transition-all duration-300 group"
            >
              <span>View All Heritage Sites</span>
              <ArrowRight className="group-hover:translate-x-2 transition-transform duration-300" size={20} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Regional Discovery - Map Preview */}
      <section className="py-24 bg-gradient-to-b from-parchment to-parchment-dark">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block px-6 py-2 bg-terracotta/10 text-terracotta rounded-full text-sm font-medium mb-6 tracking-wider">
                REGIONAL DISCOVERY
              </span>
              <h2 className="text-4xl font-serif font-bold text-charcoal mb-6">
                Explore Heritage Across India
              </h2>
              <p className="text-lg text-charcoal/70 mb-8 leading-relaxed">
                India's cultural heritage spans diverse regions, each with unique architectural styles,
                historical narratives, and artistic traditions waiting to be discovered.
              </p>

              <div className="space-y-6 mb-10">
                {[
                  { region: 'North India', style: 'Mughal & Rajput Architecture', sites: 12 },
                  { region: 'South India', style: 'Dravidian Temple Architecture', sites: 18 },
                  { region: 'East India', style: 'Buddhist & Terracotta Temples', sites: 8 },
                  { region: 'West India', style: 'Cave Temples & Portuguese Influence', sites: 10 },
                  { region: 'Central India', style: 'Rock-cut & Tribal Heritage', sites: 6 },
                ].map((region, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    whileHover={{ x: 5, transition: { duration: 0.2 } }}
                    className="flex items-center justify-between p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-parchment-dark/20 hover:border-terracotta/30 transition-all duration-300"
                  >
                    <div>
                      <h4 className="font-serif font-bold text-charcoal mb-1">{region.region}</h4>
                      <p className="text-sm text-charcoal/60">{region.style}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-terracotta">{region.sites}</div>
                      <div className="text-xs text-charcoal/60">sites</div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="flex flex-wrap gap-4">
                <Link
                  to="/map"
                  className="px-6 py-3 bg-terracotta text-white rounded-xl font-semibold hover:bg-terracotta-dark transition-all"
                >
                  Explore Interactive Map
                </Link>
                <Link
                  to="/archive"
                  className="px-6 py-3 bg-white text-charcoal rounded-xl font-semibold hover:bg-parchment-dark transition-all border border-parchment-dark/20"
                >
                  Browse by Region
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="bg-gradient-to-br from-charcoal to-maroon rounded-2xl p-8 text-white">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-serif font-bold">Interactive Heritage Map</h3>
                  <Globe className="text-gold-light" size={24} />
                </div>

                {/* Map Preview */}
                <div className="relative h-64 bg-gradient-to-r from-charcoal-dark to-maroon-dark rounded-xl overflow-hidden mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-gold/10 to-terracotta/10" />

                  {/* Animated Markers */}
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute top-1/4 left-1/4 w-4 h-4 bg-vermillion rounded-full"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    className="absolute top-1/3 right-1/3 w-4 h-4 bg-gold rounded-full"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                    className="absolute bottom-1/4 left-1/2 w-4 h-4 bg-terracotta rounded-full"
                  />

                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-4">🗺️</div>
                      <p className="text-white/80 text-sm">54 heritage sites mapped</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gold-light">42</div>
                    <div className="text-xs text-white/70">UNESCO Sites</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gold-light">6</div>
                    <div className="text-xs text-white/70">Historical Periods</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gold-light">8</div>
                    <div className="text-xs text-white/70">Architectural Styles</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Digital Preservation - Modern Contrast */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="inline-block px-6 py-2 bg-vermillion/10 text-vermillion rounded-full text-sm font-medium mb-6 tracking-wider">
              DIGITAL PRESERVATION
            </span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-charcoal mb-6">
              AI-Powered Heritage Discovery
            </h2>
            <p className="text-lg text-charcoal/70 max-w-3xl mx-auto">
              Combining archival expertise with artificial intelligence to preserve and explore India's cultural legacy.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Upload className="w-8 h-8" />,
                title: 'Document Digitization',
                description: 'Upload historical documents, photographs, and manuscripts for AI-assisted processing and preservation.',
                color: 'from-vermillion/10 to-vermillion/5',
                steps: ['OCR Text Extraction', 'Metadata Generation', 'Quality Review', 'Archive Integration']
              },
              {
                icon: <MessageSquare className="w-8 h-8" />,
                title: 'AI Heritage Assistant',
                description: 'Ask questions about heritage sites and receive answers grounded in verified archival records.',
                color: 'from-maroon/10 to-maroon/5',
                steps: ['Natural Language Queries', 'Contextual Understanding', 'Source Citation', 'Research Assistance']
              },
              {
                icon: <Archive className="w-8 h-8" />,
                title: 'Interactive Archive',
                description: 'Explore searchable collections with advanced filters, geographical mapping, and temporal analysis.',
                color: 'from-terracotta/10 to-terracotta/5',
                steps: ['Advanced Search', 'Visual Exploration', 'Temporal Analysis', 'Cross-Reference Tools']
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-parchment to-white rounded-2xl p-8 border border-parchment-dark/10 shadow-soft"
              >
                <div className="flex items-center mb-6">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mr-4`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-serif font-bold text-charcoal">{feature.title}</h3>
                </div>
                <p className="text-charcoal/70 mb-6">{feature.description}</p>
                <div className="space-y-3">
                  {feature.steps.map((step, stepIndex) => (
                    <div key={stepIndex} className="flex items-center text-sm">
                      <div className="w-2 h-2 bg-maroon rounded-full mr-3" />
                      <span className="text-charcoal/80">{step}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center mt-12"
          >
            <Link
              to="/upload"
              className="inline-flex items-center gap-3 px-8 py-4 bg-maroon text-white rounded-xl font-semibold hover:bg-maroon-dark transition-all duration-300 group"
            >
              <Upload className="group-hover:translate-y-1 transition-transform duration-300" size={20} />
              <span>Start Digitizing Documents</span>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
