import { useState } from 'react';
import type { WizardAction } from './types.ts';
import { SHOPIFY_FILE_LABELS } from './types.ts';
import { readCSVFileList } from '../../files/read.ts';
import { parseProductsCSVs } from '../../functions/parseProductsCSV.ts';
import { shopifyVendor, shopifyInventoryVendor } from '../../vendors/index.ts';
import type { Product } from '../../vendors/vendor.ts';

interface Props {
  action: WizardAction;
  onNext: (products: Product[], fileName: string) => void;
  onBack: () => void;
}

export default function Step2ShopifyFile({ action, onNext, onBack }: Props) {
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const { label, description } = SHOPIFY_FILE_LABELS[action];
  const hasProducts = products !== null;
  const displayLabel = fileNames.length === 1 ? fileNames[0]! : `${fileNames.length} files`;

  const processFiles = async (files: File[]) => {
    if (!files.length) return;
    setError(null);
    setLoading(true);
    try {
      const csvs = await readCSVFileList(files);
      const parsed = action === 'inventory'
        ? await parseProductsCSVs(csvs, shopifyInventoryVendor)
        : await parseProductsCSVs(csvs, shopifyVendor);
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

  const handleNext = () => {
    if (!products) { setError('Please select at least one file before continuing.'); return; }
    onNext(products, displayLabel);
  };

  return (
    <div>
      <div className="corner-tag corner-tag-red">Red Corner</div>

      <div style={{ marginBottom: 22 }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,163,72,0.5)', marginBottom: 4 }}>
          Step 1 — Shopify Export
        </p>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#fff', margin: 0 }}>
          Upload your Shopify {action === 'inventory' ? 'inventory' : 'products'} export
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.38)', marginTop: 6, fontWeight: 400 }}>{description}</p>
      </div>

      <div className="ufc-panel" style={{ marginBottom: 12 }}>
        <p style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(200,163,72,0.7)', marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', marginBottom: 14 }}>Accepts multiple .csv and .zip files</p>

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
      </div>

      {error && <p style={{ fontSize: '0.78rem', color: '#e05555', marginBottom: 12 }}>{error}</p>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
        <button className="ufc-btn-secondary" onClick={onBack}>← Back</button>
        <button className="ufc-btn-primary" onClick={handleNext} disabled={loading || !hasProducts}>
          Next →
        </button>
      </div>
    </div>
  );
}
