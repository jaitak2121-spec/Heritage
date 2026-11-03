import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfReview({ file }) {
  const canvas = useRef(null);
  const [pdf, setPdf] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(false);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const task = getDocument({ url, isEvalSupported: false });
    let active = true;
    task.promise.then(doc => { if (active) setPdf(doc); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; task.destroy(); URL.revokeObjectURL(url); };
  }, [file]);
  useEffect(() => {
    if (!pdf) return;
    let active = true;
    let rendering;
    pdf.getPage(page).then(source => {
      if (!active) return;
      const base = source.getViewport({ scale: 1 });
      const viewport = source.getViewport({ scale: 1400 / Math.max(base.width, base.height) });
      const target = canvas.current;
      target.width = Math.ceil(viewport.width);
      target.height = Math.ceil(viewport.height);
      rendering = source.render({ canvas: target, viewport });
      return rendering.promise;
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; rendering?.cancel(); };
  }, [page, pdf]);
  if (error) return <p>Preview unavailable. Download the original below.</p>;
  return <div>
    {!pdf && <p>Opening PDF…</p>}
    <canvas ref={canvas} aria-label={`Original PDF page ${page}`} className="w-full border rounded-lg"/>
    {pdf && <div className="flex justify-between my-2 text-sm">
      <button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
      <span>Page {page} of {pdf.numPages}</span>
      <button disabled={page === pdf.numPages} onClick={() => setPage(page + 1)}>Next</button>
    </div>}
  </div>;
}
