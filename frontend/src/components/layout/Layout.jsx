import { Outlet, NavLink, useLocation, Link } from 'react-router-dom';
import { MapPin, Upload, Archive, MessageSquare, Home } from 'lucide-react';

const Layout = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  const navLinks = [
    { to: '/', label: 'Home', icon: <Home size={18} /> },
    { to: '/archive', label: 'Explore', icon: <Archive size={18} /> },
    { to: '/map', label: 'Map', icon: <MapPin size={18} /> },
    { to: '/upload', label: 'Digitize', icon: <Upload size={18} /> },
    { to: '/assistant', label: 'Assistant', icon: <MessageSquare size={18} /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-parchment text-charcoal font-sans selection:bg-maroon selection:text-white">
      {/* Universal Museum Header */}
      <header className="sticky top-0 z-50 bg-parchment/95 backdrop-blur-md border-b border-parchment-dark/30 shadow-xs">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-terracotta to-vermillion flex items-center justify-center shadow-soft group-hover:scale-105 transition-transform duration-300">
              <span className="text-white font-bold text-lg">🏛️</span>
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-charcoal tracking-tight group-hover:text-maroon transition-colors">
                HeritageLens
              </h1>
              <p className="text-[10px] text-maroon font-semibold tracking-widest uppercase">
                Cultural Heritage Archive
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1.5 lg:space-x-3">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-maroon text-white shadow-xs'
                      : 'text-charcoal/80 hover:text-maroon hover:bg-parchment-dark/30'
                  }`
                }
              >
                {link.icon}
                <span>{link.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Page Content */}
      <main className={`flex-1 w-full ${isHomePage ? '' : 'pb-20 md:pb-12'}`}>
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav aria-label="Mobile Navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-parchment/95 backdrop-blur-md border-t border-parchment-dark/40 shadow-lg">
        <div className="flex justify-around py-2.5 px-2">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex flex-col items-center px-2 py-1 rounded-lg transition-colors ${
                  isActive ? 'text-maroon font-semibold' : 'text-charcoal/60 hover:text-maroon'
                }`
              }
            >
              <div className="p-1">{link.icon}</div>
              <span className="text-[11px] mt-0.5">{link.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Unified Digital Museum Footer */}
      <footer className="bg-charcoal text-parchment py-14 border-t border-charcoal-light/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Column 1: Brand & Mission */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-vermillion flex items-center justify-center">
                  <span className="text-white font-bold text-lg">🏛️</span>
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-white">HeritageLens</h3>
                  <p className="text-[10px] text-gold-light tracking-widest uppercase">
                    Cultural Heritage Archive
                  </p>
                </div>
              </div>
              <p className="text-xs text-parchment/70 leading-relaxed max-w-sm">
                A digital archive celebrating India's architectural wonders, historical manuscripts, and regional culture through high-resolution documentation and AI-assisted research.
              </p>
            </div>

            {/* Column 2: Exploration Links */}
            <div>
              <h4 className="font-serif font-bold text-base text-gold-light mb-4 tracking-wide uppercase text-xs">
                Exploration
              </h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link to="/archive" className="text-parchment/70 hover:text-white transition-colors">
                    Heritage Archive
                  </Link>
                </li>
                <li>
                  <Link to="/map" className="text-parchment/70 hover:text-white transition-colors">
                    Interactive Geospatial Map
                  </Link>
                </li>
                <li>
                  <Link to="/upload" className="text-parchment/70 hover:text-white transition-colors">
                    Document Digitization & OCR
                  </Link>
                </li>
                <li>
                  <Link to="/assistant" className="text-parchment/70 hover:text-white transition-colors">
                    AI Archival Assistant
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Archival Resources */}
            <div>
              <h4 className="font-serif font-bold text-base text-gold-light mb-4 tracking-wide uppercase text-xs">
                Archival Scope
              </h4>
              <ul className="space-y-2.5 text-sm text-parchment/70">
                <li>UNESCO World Heritage Sites</li>
                <li>Epigraphy & Rock Inscriptions</li>
                <li>Temple Architecture Surveys</li>
                <li>Regional Manuscripts & Charters</li>
              </ul>
            </div>

            {/* Column 4: Hackathon / Project Meta */}
            <div>
              <h4 className="font-serif font-bold text-base text-gold-light mb-4 tracking-wide uppercase text-xs">
                Project Information
              </h4>
              <div className="space-y-2 text-xs text-parchment/70 leading-relaxed">
                <p className="font-medium text-parchment">HeritageLens Archive Initiative</p>
                <p>IIT Hackathon Submission</p>
                <p className="text-[11px] text-parchment/50 pt-2 border-t border-charcoal-light/30">
                  © 2026 HeritageLens. Research & educational prototype. Data is curated for demonstration purposes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
