const SITE_VISUALS = {
  'Taj Mahal': { src: '/images/sites/taj-mahal.jpg', position: 'center 48%' },
  'Red Fort': { src: '/images/sites/red-fort.jpg', position: 'center 48%' },
  'Qutub Minar Complex': { src: '/images/sites/qutub-minar.jpg', position: 'center 38%' },
  'Hampi Ruins': { src: '/images/sites/hampi.jpg', position: 'center 55%' },
  'Brihadisvara Temple': { src: '/images/sites/brihadisvara-temple.jpg', position: 'center 58%' },
  'Konark Sun Temple': { src: '/images/sites/konark-sun-temple.jpg', position: 'center 52%' },
  'Ajanta Caves': { src: '/images/sites/ajanta-caves.jpg', position: 'center 52%' },
  'Ellora Caves': { src: '/images/sites/ellora-caves.jpg', position: 'center 52%' },
  'Khajuraho Group of Monuments': { src: '/images/sites/khajuraho.jpg', position: 'center 52%' },
  'Great Stupa at Sanchi': { src: '/images/sites/sanchi-stupa.jpg', position: 'center 50%' },
  'Rani ki Vav': { src: '/images/sites/rani-ki-vav.jpg', position: 'center 55%' },
};

const NAME_ALIASES = {
  'Khajuraho Temples': 'Khajuraho Group of Monuments',
  'Sun Temple, Konark': 'Konark Sun Temple',
};

export const getSiteVisual = (siteOrName) => {
  const name = typeof siteOrName === 'string' ? siteOrName : siteOrName?.name;
  const canonicalName = NAME_ALIASES[name] || name;
  const visual = SITE_VISUALS[canonicalName];

  if (visual) return visual;

  return {
    src: typeof siteOrName === 'object' ? siteOrName?.image_url : null,
    position: 'center',
  };
};

export const SITE_IMAGE_FALLBACK = '/images/sites/konark-sun-temple.jpg';

export default SITE_VISUALS;
