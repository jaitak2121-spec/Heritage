import { useEffect, useState } from 'react';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { getApiErrorMessage, heritageApi } from '../services/api';


const DocumentDetailPage = () => {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    heritageApi.getDocumentById(id)
      .then((result) => { if (active) setDocument(result); })
      .catch((requestError) => { if (active) setError(getApiErrorMessage(requestError, 'Unable to load this document.')); });
    return () => { active = false; };
  }, [id]);

  if (error) return <div className="min-h-[60vh] bg-parchment px-4 py-20 text-center text-vermillion-dark">{error}</div>;
  if (!document) return <div className="min-h-[60vh] bg-parchment px-4 py-20 text-center text-charcoal/60">Loading archival record…</div>;

  const text = document.corrected_text || document.extracted_text;
  return (
    <div className="min-h-screen bg-parchment px-4 py-10 text-charcoal">
      <article className="mx-auto max-w-4xl rounded-3xl border border-gold/25 bg-white p-6 shadow-soft md:p-10">
        <Link to={document.site_id ? `/archive/${document.site_id}#documents` : '/archive'} className="mb-7 inline-flex items-center gap-2 text-xs font-semibold text-maroon hover:underline">
          <ArrowLeft size={15} /> Back to archive
        </Link>
        <div className="mb-7 flex flex-col justify-between gap-5 border-b border-parchment-dark/30 pb-7 sm:flex-row sm:items-start">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-maroon"><FileText size={15} /> Digitized record #{document.id}</p>
            <h1 className="font-serif text-3xl font-bold md:text-4xl">{document.title}</h1>
            <p className="mt-2 text-sm text-charcoal/60">{document.site_name || 'General archive'} · {document.original_filename || document.file_type}</p>
          </div>
          {document.file_url && (
            <a href={heritageApi.getDocumentDownloadUrl(document.id)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-maroon px-5 py-3 text-sm font-semibold text-white hover:bg-maroon-dark">
              <Download size={17} /> Download original
            </a>
          )}
        </div>
        <div className="mb-7 grid gap-3 text-xs sm:grid-cols-3">
          <div className="rounded-xl bg-parchment/45 p-4"><strong className="block text-charcoal">Processing</strong>{document.processing_status.replace('_', ' ')}</div>
          <div className="rounded-xl bg-parchment/45 p-4"><strong className="block text-charcoal">Review</strong>{document.review_status.replace('_', ' ')}</div>
          <div className="rounded-xl bg-parchment/45 p-4"><strong className="block text-charcoal">Extraction</strong>{document.ocr_method || 'Not available'}{document.page_count ? ` · ${document.page_count} page${document.page_count === 1 ? '' : 's'}` : ''}</div>
        </div>
        <section>
          <h2 className="mb-3 font-serif text-xl font-bold">{document.corrected_text ? 'Curator-corrected transcription' : 'Extracted text'}</h2>
          <div className="whitespace-pre-wrap rounded-2xl border border-parchment-dark/35 bg-parchment/20 p-5 font-mono text-sm leading-7 text-charcoal/80">
            {text || 'No readable text was extracted from this record.'}
          </div>
        </section>
      </article>
    </div>
  );
};

export default DocumentDetailPage;
