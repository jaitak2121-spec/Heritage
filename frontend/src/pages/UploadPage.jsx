import { useState, useEffect } from 'react';
import {
  Upload,
  FileText,
  Image,
  FileEdit,
  CheckCircle,
  XCircle,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Trash2,
  RefreshCw,
  Building,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { getApiErrorMessage, heritageApi, isCuratorAuthenticated } from '../services/api';

const UploadPage = () => {
  const location = useLocation();
  const [curatorActive, setCuratorActive] = useState(isCuratorAuthenticated);
  const [step, setStep] = useState(1); // 1: upload, 2: review, 3: confirm
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [uploadedDoc, setUploadedDoc] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [extractionMethod, setExtractionMethod] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Available heritage sites for association
  const [sites, setSites] = useState([]);
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  const [metadata, setMetadata] = useState({
    title: '',
    siteId: '',
    tags: ['Architecture', 'Archival Survey'],
  });

  // Fetch sites and recent documents from backend API
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const [sitesData, docsData] = await Promise.allSettled([
          heritageApi.getSites({ limit: 100 }),
          heritageApi.getDocuments({ limit: 10 }),
        ]);

        if (isMounted) {
          if (sitesData.status === 'fulfilled' && Array.isArray(sitesData.value)) {
            setSites(sitesData.value);
            if (sitesData.value.length > 0) {
              setMetadata((prev) => (prev.siteId ? prev : { ...prev, siteId: String(sitesData.value[0].id) }));
            }
          }
          if (docsData.status === 'fulfilled' && Array.isArray(docsData.value)) {
            setRecentDocuments(docsData.value);
          }
          const failedRequest = [sitesData, docsData].find((result) => result.status === 'rejected');
          if (failedRequest) {
            setErrorMessage(getApiErrorMessage(failedRequest.reason, 'Unable to load archive metadata.'));
          }
        }
      } catch (err) {
        console.warn('Initial data load warning:', err);
      }
    };

    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const syncAuth = () => setCuratorActive(isCuratorAuthenticated());
    window.addEventListener('curator:auth-changed', syncAuth);
    window.addEventListener('curator:unauthorized', syncAuth);
    return () => {
      window.removeEventListener('curator:auth-changed', syncAuth);
      window.removeEventListener('curator:unauthorized', syncAuth);
    };
  }, []);

  const refreshRecentDocuments = async () => {
    setLoadingRecent(true);
    try {
      const data = await heritageApi.getDocuments({ limit: 10 });
      setRecentDocuments(data);
    } catch (err) {
      console.warn('Failed to refresh recent documents:', err);
      setErrorMessage(getApiErrorMessage(err, 'Unable to refresh recent documents.'));
    } finally {
      setLoadingRecent(false);
    }
  };

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files);
    if (selected.length > 0) {
      setFiles(selected);
      setSelectedFile(selected[0]);
      setMetadata((prev) => ({
        ...prev,
        title: selected[0].name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      }));
      setErrorMessage(null);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setFiles(droppedFiles);
      setSelectedFile(droppedFiles[0]);
      setMetadata((prev) => ({
        ...prev,
        title: droppedFiles[0].name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      }));
      setErrorMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile && files.length === 0) {
      setErrorMessage('Please select a document or image file to digitize.');
      return;
    }

    const fileToUpload = selectedFile || files[0];
    setUploading(true);
    setErrorMessage(null);
    setUploadProgress(20);

    const formData = new FormData();
    formData.append('file', fileToUpload);
    if (metadata.siteId) {
      formData.append('site_id', metadata.siteId);
    }
    if (metadata.title) {
      formData.append('title', metadata.title.trim());
    }

    try {
      setUploadProgress(50);
      let res = await heritageApi.uploadDocument(formData);
      if (['uploaded', 'processing'].includes(res.processing_status)) {
        setStatusMessage(res.message || 'Original stored securely. Text extraction is running in the archive queue.');
        for (let attempt = 0; attempt < 80; attempt += 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 1500));
          res = await heritageApi.getDocumentById(res.id);
          setUploadedDoc(res);
          setUploadProgress(Math.min(95, 55 + attempt));
          if (res.processing_status === 'extracted') break;
          if (res.processing_status === 'failed') {
            throw new Error(res.processing_error || 'Document extraction failed after the original was stored.');
          }
        }
        if (res.processing_status !== 'extracted') {
          throw new Error('The original is safely stored, but processing is taking longer than expected. Check Recent Archival Digitisations shortly.');
        }
      }
      setUploadProgress(100);

      setUploadedDoc(res);
      setExtractedText(res.extracted_text || '');
      setExtractionMethod(res.method || res.ocr_method || 'extraction');
      setStatusMessage(res.message || 'Text successfully extracted and is ready for curator review.');
      setMetadata((prev) => ({
        ...prev,
        title: res.title,
        siteId: res.site_id ? String(res.site_id) : '',
      }));

      setUploading(false);
      setStep(2);
      refreshRecentDocuments();
    } catch (err) {
      setUploading(false);
      setUploadProgress(0);
      setErrorMessage(getApiErrorMessage(err, 'Upload and text extraction failed.'));
      console.error('Document upload error:', err);
    }
  };

  const handleSaveCorrection = async () => {
    if (!uploadedDoc) {
      setStep(3);
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const updatePayload = {
        title: metadata.title.trim() || uploadedDoc.title,
        corrected_text: extractedText,
        site_id: metadata.siteId ? parseInt(metadata.siteId, 10) : null,
        review_status: 'approved',
      };

      const res = await heritageApi.updateDocument(uploadedDoc.id, updatePayload);
      setUploadedDoc(res);
      setSaving(false);
      setSuccessMessage('Archival text and site association saved successfully.');
      setStep(3);
      refreshRecentDocuments();
    } catch (err) {
      setSaving(false);
      setErrorMessage(getApiErrorMessage(err, 'Failed to save corrected text.'));
      console.error('Update document error:', err);
    }
  };

  const handleDeleteDocument = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete archival document #${id}?`)) {
      return;
    }

    try {
      await heritageApi.deleteDocument(id);
      setRecentDocuments((prev) => prev.filter((d) => d.id !== id));
      if (uploadedDoc && uploadedDoc.id === id) {
        setUploadedDoc(null);
        setStep(1);
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
      setErrorMessage(getApiErrorMessage(err, 'Could not delete the document.'));
    }
  };

  if (!curatorActive) {
    return (
      <div className="min-h-[70vh] bg-parchment px-4 py-20 text-center">
        <div className="mx-auto max-w-xl rounded-3xl border border-gold/25 bg-white p-10 shadow-soft">
          <h1 className="mb-3 font-serif text-3xl font-bold text-charcoal">Curator access required</h1>
          <p className="mb-7 text-sm leading-relaxed text-charcoal/65">
            Document originals and archive metadata are protected from anonymous changes. Sign in to digitize or review a record.
          </p>
          <Link
            to="/curator/login" state={{ from: location.pathname }}
            className="inline-flex rounded-xl bg-maroon px-6 py-3 text-sm font-semibold text-white hover:bg-maroon-dark"
          >
            Sign in as curator
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment text-charcoal font-sans py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <header className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-maroon/10 text-maroon rounded-full text-xs font-semibold tracking-wider uppercase mb-3">
            <Upload size={14} />
            <span>Document Digitization & OCR</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-charcoal mb-3">
            Digitize Archival Records
          </h1>
          <p className="text-base md:text-lg text-charcoal/70 max-w-3xl leading-relaxed">
            Upload historical records, regional manuscripts, colonial surveys, and architectural drawings. The pipeline extracts text via PyMuPDF vector extraction and Tesseract OCR for searchable archiving.
          </p>
        </header>

        {/* Global Error Alert Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-vermillion/10 border border-vermillion/30 text-vermillion-dark flex items-start gap-3">
            <AlertCircle size={20} className="shrink-0 mt-0.5 text-vermillion" />
            <div className="text-xs leading-relaxed flex-1">
              <strong className="font-semibold block mb-0.5">Processing Alert</strong>
              {errorMessage}
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-vermillion/60 hover:text-vermillion text-xs font-bold px-1"
            >
              ×
            </button>
          </div>
        )}

        {/* Progress Step Indicator */}
        <div className="flex justify-center mb-10">
          <div className="flex items-center w-full max-w-xl">
            {[
              { num: 1, label: 'Upload Documents', icon: <Upload size={18} /> },
              { num: 2, label: 'Review Extracted Text', icon: <FileEdit size={18} /> },
              { num: 3, label: 'Save to Archive', icon: <CheckCircle size={18} /> },
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                      step >= s.num
                        ? 'bg-maroon text-white shadow-xs'
                        : 'bg-parchment-dark/60 text-charcoal/50 border border-parchment-dark'
                    }`}
                  >
                    {s.icon}
                  </div>
                  <span className={`text-xs font-semibold hidden sm:inline ${step >= s.num ? 'text-charcoal' : 'text-charcoal/50'}`}>
                    {s.label}
                  </span>
                </div>
                {idx < 2 && (
                  <div
                    className={`h-0.5 flex-1 mx-4 transition-colors ${
                      step > s.num ? 'bg-maroon' : 'bg-parchment-dark/40'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="bg-white rounded-2xl p-8 border border-parchment-dark/30 shadow-soft">
            <div className="grid lg:grid-cols-2 gap-8 items-start">
              {/* Dropzone & File Inputs */}
              <div>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                    isDragging
                      ? 'border-maroon bg-parchment/60 ring-2 ring-maroon/20'
                      : 'border-parchment-dark hover:border-maroon bg-parchment/20'
                  }`}
                >
                  <div className="w-16 h-16 mx-auto rounded-full bg-maroon/10 text-maroon flex items-center justify-center mb-4">
                    <Upload size={28} />
                  </div>
                  <h3 className="text-lg font-serif font-bold text-charcoal mb-2">
                    {isDragging ? 'Drop file to upload' : 'Select Archival Document'}
                  </h3>
                  <p className="text-xs text-charcoal/60 mb-5 leading-relaxed max-w-xs mx-auto">
                    Supported formats: PDF, PNG, JPG/JPEG up to 25MB. High-resolution scans yield optimal OCR accuracy.
                  </p>
                  <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-maroon text-white rounded-xl text-xs font-semibold cursor-pointer hover:bg-maroon-dark transition-colors shadow-xs">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    Browse Files
                  </label>
                </div>

                {/* Selected File Details */}
                {selectedFile && (
                  <div className="mt-5 p-4 rounded-xl border border-maroon bg-parchment/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        {selectedFile.type.includes('pdf') ? (
                          <FileText size={22} className="text-vermillion shrink-0" />
                        ) : (
                          <Image size={22} className="text-terracotta shrink-0" />
                        )}
                        <div className="truncate">
                          <div className="font-semibold text-xs text-charcoal truncate">
                            {selectedFile.name}
                          </div>
                          <div className="text-[11px] text-charcoal/60">
                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · {selectedFile.type || 'Document'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setFiles([]);
                        }}
                        className="text-charcoal/40 hover:text-vermillion p-1"
                        title="Remove file"
                      >
                        <XCircle size={18} />
                      </button>
                    </div>

                    {/* Quick Metadata Input while uploading */}
                    <div className="mt-4 pt-3 border-t border-parchment-dark/30 space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-charcoal mb-1">
                          Document Title
                        </label>
                        <input
                          type="text"
                          value={metadata.title}
                          onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                          placeholder="e.g. Archaeological Survey Report 1928"
                          className="w-full px-3 py-1.5 bg-white border border-parchment-dark/40 rounded-lg text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-maroon"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-charcoal mb-1">
                          Associate with Heritage Site
                        </label>
                        <select
                          value={metadata.siteId}
                          onChange={(e) => setMetadata({ ...metadata, siteId: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-parchment-dark/40 rounded-lg text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-maroon cursor-pointer"
                        >
                          <option value="">Unassigned / General Record</option>
                          {sites.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.location_name})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Informational Guidelines Card */}
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-charcoal to-maroon text-parchment rounded-2xl p-6 shadow-soft">
                  <h4 className="font-serif font-bold text-lg text-white mb-3 flex items-center gap-2">
                    <Sparkles size={18} className="text-gold-light" />
                    Automated Processing Pipeline
                  </h4>
                  <ul className="space-y-3 text-xs text-parchment/80 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-gold-light font-bold">1.</span>
                      <span><strong>PDF Vector Extraction:</strong> PyMuPDF extracts embedded typography and structural records without degradation.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gold-light font-bold">2.</span>
                      <span><strong>Tesseract OCR:</strong> Scanned documents and image plates are optically parsed for inscription transcriptions.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gold-light font-bold">3.</span>
                      <span><strong>Searchable Archive:</strong> Extracted phrases become immediately searchable across the HeritageLens catalogue.</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-parchment/50 rounded-xl border border-parchment-dark/30 text-xs text-charcoal/70">
                  <strong className="text-charcoal font-semibold block mb-1">Preservation Guarantee:</strong>
                  Original high-resolution documents are securely stored in the archive vault, and verified transcriptions can be queried by the AI assistant.
                </div>
              </div>
            </div>

            {/* Action Button & Upload Progress */}
            <div className="mt-8 pt-6 border-t border-parchment-dark/20 text-center">
              {uploading && (
                <div className="max-w-md mx-auto mb-4">
                  <div className="flex justify-between text-[11px] text-charcoal/60 mb-1">
                    <span>Uploading and analyzing text...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-parchment-dark/40 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-maroon h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="px-8 py-3 bg-maroon text-white rounded-xl text-sm font-semibold hover:bg-maroon-dark transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs inline-flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing Document & Extracting Text...</span>
                  </>
                ) : (
                  <>
                    <span>Extract & Digitize Record</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Review & Edit */}
        {step === 2 && (
          <div className="bg-white rounded-2xl p-8 border border-parchment-dark/30 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-serif font-bold text-charcoal mb-1">
                  Review Extracted Text & Metadata
                </h2>
                <p className="text-xs text-charcoal/60">
                  Refine the OCR and PyMuPDF transcriptions below. Save changes to index this record into the archive.
                </p>
              </div>
              {extractionMethod && (
                <span className="px-3 py-1 bg-gold/15 text-gold-dark rounded-full text-xs font-semibold tracking-wide">
                  Method: {extractionMethod === 'pymupdf' ? 'PyMuPDF Text Engine' : 'Tesseract OCR'}
                </span>
              )}
            </div>

            {statusMessage && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Text Area */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal/70 mb-2">
                  Extracted Archival Text (Editable)
                </label>
                <textarea
                  value={extractedText}
                  onChange={(e) => setExtractedText(e.target.value)}
                  rows={16}
                  placeholder="Extracted text will appear here. You can manually edit or correct scanning anomalies."
                  className="w-full p-4 bg-parchment/30 rounded-xl border border-parchment-dark/30 text-xs font-mono leading-relaxed text-charcoal focus:outline-none focus:ring-2 focus:ring-maroon"
                />
                <div className="flex justify-between items-center mt-2 text-[11px] text-charcoal/50">
                  <span>{extractedText.length} characters extracted</span>
                  <button
                    type="button"
                    onClick={() => {
                      const cleaned = extractedText
                        .split('\n')
                        .map((l) => l.trim())
                        .filter(Boolean)
                        .join('\n\n');
                      setExtractedText(cleaned);
                    }}
                    className="text-maroon font-semibold hover:underline"
                  >
                    Clean Whitespace
                  </button>
                </div>
              </div>

              {/* Metadata Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">
                    Document Title
                  </label>
                  <input
                    type="text"
                    value={metadata.title}
                    onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-parchment/30 border border-parchment-dark/30 rounded-xl text-xs focus:ring-2 focus:ring-maroon focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">
                    Associated Heritage Site
                  </label>
                  <select
                    value={metadata.siteId}
                    onChange={(e) => setMetadata({ ...metadata, siteId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-parchment/30 border border-parchment-dark/30 rounded-xl text-xs focus:ring-2 focus:ring-maroon focus:outline-none cursor-pointer"
                  >
                    <option value="">Unassigned / General Record</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.location_name})
                      </option>
                    ))}
                  </select>
                </div>

                {uploadedDoc && (
                  <div className="p-4 bg-parchment/40 rounded-xl border border-parchment-dark/30 space-y-2 text-xs">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-charcoal/60 mb-1">
                      Archival Record Card
                    </div>
                    <div className="flex justify-between text-charcoal/70">
                      <span>Document ID:</span>
                      <span className="font-semibold text-charcoal">#{uploadedDoc.id}</span>
                    </div>
                    <div className="flex justify-between text-charcoal/70">
                      <span>Original File:</span>
                      <span className="font-semibold text-charcoal truncate max-w-[200px]">
                        {uploadedDoc.original_filename}
                      </span>
                    </div>
                    <div className="flex justify-between text-charcoal/70">
                      <span>Format / Type:</span>
                      <span className="font-semibold text-charcoal">{uploadedDoc.file_type}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">
                    Archival Tags
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {metadata.tags.map((t, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-gold/15 text-gold-dark rounded-md text-[11px] font-semibold flex items-center gap-1"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() =>
                            setMetadata({ ...metadata, tags: metadata.tags.filter((_, idx) => idx !== i) })
                          }
                          className="hover:text-vermillion"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Press enter to add tag..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        e.preventDefault();
                        setMetadata({ ...metadata, tags: [...metadata.tags, e.target.value.trim()] });
                        e.target.value = '';
                      }
                    }}
                    className="w-full px-3.5 py-2 bg-parchment/30 border border-parchment-dark/30 rounded-xl text-xs focus:ring-2 focus:ring-maroon focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-parchment-dark/20 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 border border-parchment-dark text-charcoal/70 rounded-xl text-xs font-semibold hover:bg-parchment transition-colors"
              >
                Back to Upload
              </button>
              <button
                type="button"
                onClick={handleSaveCorrection}
                disabled={saving}
                className="px-6 py-2.5 bg-maroon text-white rounded-xl text-xs font-semibold hover:bg-maroon-dark transition-colors shadow-xs flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <span>Save to Heritage Archive</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="bg-white rounded-2xl p-12 border border-parchment-dark/30 shadow-soft text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-5">
              <CheckCircle size={36} />
            </div>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-charcoal mb-3">
              Document Cataloged Successfully
            </h2>
            <p className="text-sm text-charcoal/70 leading-relaxed mb-8">
              {successMessage ||
                'Your document has been verified and permanently added to the HeritageLens searchable database. It is now indexed for AI inquiry and cross-monument research.'}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                to="/archive"
                className="px-5 py-2.5 bg-maroon text-white rounded-xl text-xs font-semibold hover:bg-maroon-dark transition-colors shadow-xs"
              >
                Explore Archive
              </Link>
              <button
                type="button"
                onClick={() => {
                  setFiles([]);
                  setSelectedFile(null);
                  setExtractedText('');
                  setUploadedDoc(null);
                  setStep(1);
                }}
                className="px-5 py-2.5 border border-maroon text-maroon rounded-xl text-xs font-semibold hover:bg-maroon/5 transition-colors"
              >
                Digitize Another Record
              </button>
              <Link
                to="/assistant"
                className="px-5 py-2.5 bg-gold text-charcoal rounded-xl text-xs font-semibold hover:bg-gold-light transition-colors"
              >
                Query AI Assistant
              </Link>
            </div>
          </div>
        )}

        {/* Recent Catalog Activity Table */}
        <div className="mt-14">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif font-bold text-lg text-charcoal">
              Recent Archival Digitisations
            </h3>
            <button
              onClick={refreshRecentDocuments}
              disabled={loadingRecent}
              className="text-xs text-charcoal/60 hover:text-maroon flex items-center gap-1.5 transition-colors"
              title="Refresh document list"
            >
              <RefreshCw size={13} className={loadingRecent ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-parchment-dark/30 shadow-soft overflow-hidden">
            {recentDocuments.length === 0 ? (
              <div className="p-8 text-center text-xs text-charcoal/50">
                No documents uploaded yet. Digitize your first archival manuscript above.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-parchment/60 border-b border-parchment-dark/30 text-charcoal/70">
                  <tr>
                    <th className="py-3 px-5 font-semibold">Document Title</th>
                    <th className="py-3 px-5 font-semibold">Associated Monument</th>
                    <th className="py-3 px-5 font-semibold">File Type</th>
                    <th className="py-3 px-5 font-semibold">Text Indexed</th>
                    <th className="py-3 px-5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-parchment-dark/20 text-charcoal/80">
                  {recentDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-parchment/20 transition-colors">
                      <td className="py-3.5 px-5 font-medium flex items-center gap-2">
                        <FileText size={15} className="text-maroon shrink-0" />
                        <span className="truncate max-w-xs">{doc.title}</span>
                      </td>
                      <td className="py-3.5 px-5 text-charcoal/70">
                        {doc.site_name ? (
                          <span className="inline-flex items-center gap-1">
                            <Building size={12} className="text-terracotta" />
                            {doc.site_name}
                          </span>
                        ) : (
                          <span className="text-charcoal/40 italic">General</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-charcoal/60">{doc.file_type}</td>
                      <td className="py-3.5 px-5">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                          {doc.extracted_length > 0
                            ? `${doc.extracted_length} chars`
                            : doc.processing_status === 'failed'
                            ? 'Processing failed'
                            : ['uploaded', 'processing'].includes(doc.processing_status)
                            ? 'Processing…'
                            : doc.has_corrected_text
                            ? 'Verified'
                            : 'Cataloged'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={(e) => handleDeleteDocument(doc.id, e)}
                          className="text-charcoal/40 hover:text-vermillion p-1 transition-colors"
                          title="Delete document"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
