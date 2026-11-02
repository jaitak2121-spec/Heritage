const SITE_VISUALS = {
  'Taj Mahal': {
    src: '/images/sites/taj-mahal.jpg', position: 'center 48%',
    gallery: [
      { src: '/images/sites/gallery/taj-mahal-reflection.jpg', caption: 'The Taj reflected across the Yamuna riverfront' },
      { src: '/images/sites/gallery/taj-mahal-riverside.jpg', caption: 'The marble mausoleum and its four minarets' },
    ],
  },
  'Red Fort': {
    src: '/images/sites/red-fort.jpg', position: 'center 48%',
    gallery: [
      { src: '/images/sites/gallery/red-fort-courtyard.jpg', caption: 'A garden pavilion within the fortified palace' },
      { src: '/images/sites/gallery/red-fort-moti-masjid.jpg', caption: 'The white-marble Moti Masjid inside the fort' },
    ],
  },
  'Qutub Minar Complex': {
    src: '/images/sites/qutub-minar.jpg', position: 'center 38%',
    gallery: [
      { src: '/images/sites/gallery/qutub-minar-portrait.jpg', caption: 'The fluted minaret rising above the complex' },
      { src: '/images/sites/gallery/qutub-minar-complex.jpg', caption: 'Historic structures and gardens of the Qutub complex' },
    ],
  },
  'Hampi Ruins': {
    src: '/images/sites/hampi.jpg', position: 'center 55%',
    gallery: [
      { src: '/images/sites/gallery/hampi-stone-chariot.jpg', caption: 'The Garuda stone chariot at Vittala Temple' },
      { src: '/images/sites/gallery/hampi-virupaksha.jpg', caption: 'Virupaksha Temple across the Hampi landscape' },
    ],
  },
  'Brihadisvara Temple': {
    src: '/images/sites/brihadisvara-temple.jpg', position: 'center 58%',
    gallery: [
      { src: '/images/sites/gallery/brihadisvara-courtyard.jpg', caption: 'Sculpted upper architecture of the Chola temple' },
      { src: '/images/sites/gallery/brihadisvara-relief.jpg', caption: 'Carved elephant relief in the temple complex' },
    ],
  },
  'Konark Sun Temple': {
    src: '/images/sites/konark-sun-temple.jpg', position: 'center 52%',
    gallery: [
      { src: '/images/sites/gallery/konark-wheel.jpg', caption: 'A monumental stone chariot wheel' },
      { src: '/images/sites/gallery/konark-wheel-detail.jpg', caption: 'Geometric carving and radial spokes of a Konark wheel' },
    ],
  },
  'Ajanta Caves': {
    src: '/images/sites/ajanta-caves.jpg', position: 'center 52%',
    gallery: [
      { src: '/images/sites/gallery/ajanta-mural.jpg', caption: 'Narrative mural painting preserved inside the caves' },
      { src: '/images/sites/gallery/ajanta-mural-detail.jpg', caption: 'A surviving figure from the Ajanta mural cycle' },
    ],
  },
  'Ellora Caves': {
    src: '/images/sites/ellora-caves.jpg', position: 'center 52%',
    gallery: [
      { src: '/images/sites/gallery/ellora-courtyard.jpg', caption: 'The rock-cut courtyard of Kailasa Temple' },
      { src: '/images/sites/gallery/ellora-pillars.jpg', caption: 'Carved basalt pillars inside the Kailasa complex' },
    ],
  },
  'Khajuraho Group of Monuments': {
    src: '/images/sites/khajuraho.jpg', position: 'center 52%',
    gallery: [
      { src: '/images/sites/gallery/khajuraho-kandariya.jpg', caption: 'Kandariya Mahadeva Temple at golden hour' },
      { src: '/images/sites/gallery/khajuraho-detail.jpg', caption: 'The clustered Nagara spires of Kandariya Mahadeva' },
    ],
  },
  'Great Stupa at Sanchi': {
    src: '/images/sites/sanchi-stupa.jpg', position: 'center 50%',
    gallery: [
      { src: '/images/sites/gallery/sanchi-stupa-view.jpg', caption: 'The Great Stupa and circumambulatory railing' },
      { src: '/images/sites/gallery/sanchi-torana.jpg', caption: 'Narrative carvings on the north torana gateway' },
    ],
  },
  'Rani ki Vav': {
    src: '/images/sites/rani-ki-vav.jpg', position: 'center 55%',
    gallery: [
      { src: '/images/sites/gallery/rani-ki-vav-stepwell.jpg', caption: 'Sculptural detail within the descending stepwell' },
      { src: '/images/sites/gallery/rani-ki-vav-sculpture.jpg', caption: 'Ornamental wall figures in the subterranean galleries' },
    ],
  },
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

export const getSiteGallery = (siteOrName) => {
  const name = typeof siteOrName === 'string' ? siteOrName : siteOrName?.name;
  const canonicalName = NAME_ALIASES[name] || name;
  return SITE_VISUALS[canonicalName]?.gallery || [];
};

export const SITE_IMAGE_FALLBACK = '/images/sites/konark-sun-temple.jpg';

export default SITE_VISUALS;
