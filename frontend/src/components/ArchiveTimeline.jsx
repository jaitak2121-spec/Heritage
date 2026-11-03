import { useState } from 'react';
import { Link } from 'react-router-dom';

// Selected construction milestones from the archive's seeded site records.
const milestones = [
  ['3rd century BCE', 'Great Stupa at Sanchi', 'Mauryan foundations'],
  ['950–1050 CE', 'Khajuraho Group of Monuments', 'Chandela temple building'],
  ['1010 CE', 'Brihadisvara Temple', 'Chola temple architecture'],
  ['11th century', 'Rani ki Vav', 'A stepwell built as a memorial'],
  ['13th century', 'Konark Sun Temple', 'The stone chariot of Surya'],
  ['1632 CE', 'Taj Mahal', 'Shah Jahan commissions a mausoleum'],
  ['1638 CE', 'Red Fort', 'A new Mughal capital'],
];

export default function ArchiveTimeline({ sites }) {
  const [selection, setSelection] = useState('');
  const entries = milestones.map(([date, name, note]) => ({
    date, name, note, site: sites.find(site => site.name === name),
  })).filter(entry => entry.site);
  const active = entries.find(entry => entry.name === selection) || entries[0];
  if (!active) return null;
  return <details className="bg-white p-5 rounded-2xl mb-6 border border-gold/30">
    <summary className="cursor-pointer font-serif font-bold text-xl text-maroon">Historical timeline</summary>
    <p className="my-3 text-sm">Explore selected milestones from the archive.</p>
    <div className="flex flex-wrap gap-2">{entries.map(entry =>
      <button type="button" key={entry.name} aria-pressed={entry === active}
        className={`px-3 py-2 rounded-lg ${entry === active ? 'bg-maroon text-white' : 'bg-parchment'}`}
        onClick={() => setSelection(entry.name)}>{entry.date}</button>)}</div>
    <article className="mt-4" aria-live="polite">
      <h3 className="font-serif text-xl">{active.name}</h3>
      <p>{active.note} · {active.site.location_name}</p>
      <Link className="text-maroon underline mr-4" to={`/archive/${active.site.id}`}>Open record</Link>
      <Link className="text-maroon underline" to={`/map?site=${active.site.id}&lat=${active.site.latitude}&lng=${active.site.longitude}`}>Locate on map</Link>
    </article>
  </details>;
}
