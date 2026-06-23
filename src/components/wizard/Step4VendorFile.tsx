import { useState } from 'react';
import type { WizardAction } from './types.ts';
import type { Brand } from '../../vendors/brands.ts';
import type { Product } from '../../vendors/vendor.ts';
import { readCSVFileList, fetchCSVFromURL } from '../../files/read.ts';
import { parseProductsCSVs } from '../../functions/parseProductsCSV.ts';

interface Props {
  action: WizardAction;
  brand: Brand;
  onNext: (products: Product[], fileName: string) => void;
  onBack: () => void;
  /** Zero-based position of this vendor among those selected (for paging). */
  stepIndex?: number;
  /** Total number of vendors whose feeds are being collected. */
  stepTotal?: number;
  /** Feed already collected for this vendor (when paging back to it). */
  initialProducts?: Product[] | null;
  initialFileName?: string | null;
}

export default function Step4VendorFile({ action, brand, onNext, onBack, stepIndex = 0, stepTotal = 1, initialProducts = null, initialFileName = null }: Props) {
  const vendorInstance = brand.vendorFor[action]!();
  const { supportsFile, supportsURL } = vendorInstance.urlConfig;
  const URL_CORS_DISABLED = true; // Temporarily disabled until CORS is resolved
  const showBothTabs = supportsFile && supportsURL && !URL_CORS_DISABLED;

  const [fileNames, setFileNames] = useState<string[]>(initialFileName ? [initialFileName] : []);
  const [products, setProducts] = useState<Product[] | null>(initialProducts);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [urlValue, setUrlValue] = useState(localStorage.getItem(`lastUrl:${brand.id}`) ?? '');
  const [urlTab, setUrlTab] = useState(!URL_CORS_DISABLED && (!supportsFile || !!localStorage.getItem(`lastUrl:${brand.id}`)));
  const [fetching, setFetching] = useState(false);

  const fileInfo = brand.fileInfo[action]!;
  const expectedHeaders = vendorInstance.expectedHeaders?.slice(0, 6) ?? [];
  const hasProducts = products !== null;
  const displayLabel = fileNames.length === 1 ? fileNames[0]! : `${fileNames.length} files`;

  const processFiles = async (files: File[]) => {
    if (!files.length) return;
    setError(null);
    setLoading(true);
    try {
      const csvs = await readCSVFileList(files);
      const parsed = await parseProductsCSVs(csvs, vendorInstance);
      setFileNames(files.map(f => f.name));
      setProducts(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read files');
      setProducts(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(Array.from(e.target.files ?? []));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  };

  const handleFetch = async () => {
    if (!urlValue.trim()) return;
    setFetching(true);
    setError(null);
    try {
      const csvText = await fetchCSVFromURL(urlValue.trim());
      const parsed = await parseProductsCSVs([csvText], vendorInstance);
      const name = urlValue.trim().split('/').pop() ?? 'feed.csv';
      localStorage.setItem(`lastUrl:${brand.id}`, urlValue.trim());
      setFileNames([name]);
      setProducts(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch URL');
      setProducts(null);
    } finally {
      setFetching(false);
    }
  };

  const switchTab = (tab: 'file' | 'url') => {
    setUrlTab(tab === 'url');
    setProducts(null);
    setFileNames([]);
    setError(null);
  };

  const handleNext = () => {
    if (!products) { setError('Please provide a file before continuing.'); return; }
    onNext(products, displayLabel);
  };

  return (
    <div>
      <div className="corner-tag corner-tag-blue">Blue Corner</div>

      <div style={{ marginBottom: 22 }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,163,72,0.5)', marginBottom: 4 }}>
          Step 3 — Vendor Feed{stepTotal > 1 ? ` · ${stepIndex + 1} of ${stepTotal}` : ''}
        </p>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#fff', margin: 0 }}>
          Upload the {brand.name} file
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.38)', marginTop: 6, fontWeight: 400 }}>{fileInfo.description}</p>
      </div>

      <div className="ufc-panel" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(200,163,72,0.7)', margin: 0 }}>{fileInfo.label}</p>
          {showBothTabs && (
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(200,163,72,0.15)' }}>
              {(['file', 'url'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => switchTab(t)}
                  className={`ufc-tab ${urlTab === (t === 'url') ? 'ufc-tab-active' : 'ufc-tab-inactive'}`}
                >
                  {t === 'file' ? 'File' : 'URL'}
                </button>
              ))}
            </div>
          )}
        </div>
        <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', marginBottom: 14 }}>
          {urlTab ? 'Fetches directly from a URL' : 'Accepts multiple .csv and .zip files'}
        </p>

        {!urlTab ? (
          <label
            className={`ufc-file-zone ${hasProducts ? 'ufc-file-zone-ready' : ''} ${dragging ? 'ufc-file-zone-drag' : ''}`}
            style={fileNames.length > 2 ? { paddingTop: 12, paddingBottom: 12 } : { height: 96 }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={e => { e.preventDefault(); setDragging(false); }}
            onDrop={handleDrop}
          >
            {loading ? (
              <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>Loading…</span>
            ) : hasProducts ? (
              <div style={{ textAlign: 'center', width: '100%', padding: '0 12px' }}>
                <span style={{ color: '#4ec94e', fontSize: '1.1rem' }}>✓</span>
                {fileNames.length === 1 ? (
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>{fileNames[0]}</p>
                ) : (
                  <ul style={{ marginTop: 4, listStyle: 'none', padding: 0 }}>
                    {fileNames.map((name, i) => (
                      <li key={i} style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</li>
                    ))}
                  </ul>
                )}
                <p style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.25)', marginTop: 6 }}>Click to replace</p>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>Drop files or click to browse</p>
                <p style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.18)', marginTop: 4 }}>.csv or .zip — multiple allowed</p>
              </div>
            )}
            <input type="file" accept=".csv,.zip" multiple className="hidden" onChange={handleFileChange} />
          </label>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="url"
                value={urlValue}
                onChange={e => { setUrlValue(e.target.value); setProducts(null); setFileNames([]); }}
                placeholder="https://vendor.example.com/feed.csv"
                className="ufc-text-input"
                style={{ flex: 1, width: 'auto' }}
              />
              <button
                onClick={handleFetch}
                disabled={fetching || !urlValue.trim()}
                className="ufc-btn-fetch"
              >
                {fetching ? 'Fetching…' : 'Fetch'}
              </button>
            </div>
            {hasProducts && (
              <p style={{ fontSize: '0.72rem', color: '#4ec94e' }}>✓ {fileNames[0]}</p>
            )}
          </div>
        )}
      </div>

      {/* Expected headers */}
      {expectedHeaders.length > 0 && (
        <div style={{ border: '1px solid rgba(200,163,72,0.15)', padding: '10px 14px', marginBottom: 12 }}>
          <p style={{ fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(200,163,72,0.45)', marginBottom: 8 }}>
            Expected columns
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {expectedHeaders.map(h => (
              <span key={h} className="ufc-chip">{h}</span>
            ))}
            {vendorInstance.expectedHeaders.length > 6 && (
              <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', alignSelf: 'center' }}>
                +{vendorInstance.expectedHeaders.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      {error && <p style={{ fontSize: '0.78rem', color: '#e05555', marginBottom: 12 }}>{error}</p>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
        <button className="ufc-btn-secondary" onClick={onBack}>← Back</button>
        <button className="ufc-btn-primary" onClick={handleNext} disabled={loading || fetching || !hasProducts}>
          {stepIndex < stepTotal - 1 ? 'Next vendor →' : 'Next →'}
        </button>
      </div>
    </div>
  );
}
