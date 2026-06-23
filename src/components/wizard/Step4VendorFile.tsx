import { useState } from 'react';
import type { WizardAction } from './types.ts';
import type { Brand } from '../../vendors/brands.ts';
import type { Product } from '../../vendors/vendor.ts';
import BackButton from './BackButton.tsx';
import { readCSVFileList, fetchCSVFromURL } from '../../files/read.ts';
import { parseProductsCSVs } from '../../functions/parseProductsCSV.ts';

interface Props {
  action: WizardAction;
  brand: Brand;
  onNext: (products: Product[], fileName: string) => void;
  onBack: () => void;
}

export default function Step4VendorFile({ action, brand, onNext, onBack }: Props) {
  const vendorInstance = brand.vendorFor[action]!();
  const { supportsFile, supportsURL } = vendorInstance.urlConfig;
  const showBothTabs = supportsFile && supportsURL;

  const [fileNames, setFileNames] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [urlValue, setUrlValue] = useState(
    localStorage.getItem(`lastUrl:${brand.id}`) ?? ''
  );
  const [urlTab, setUrlTab] = useState(!supportsFile || !!localStorage.getItem(`lastUrl:${brand.id}`));
  const [fetching, setFetching] = useState(false);

  const fileInfo = brand.fileInfo[action]!;
  const expectedHeaders = vendorInstance.expectedHeaders?.slice(0, 6) ?? [];

  const hasProducts = products !== null;
  const displayLabel = fileNames.length === 1 ? fileNames[0]! : `${fileNames.length} files`;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
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
    if (!products) {
      setError('Please provide a file before continuing.');
      return;
    }
    onNext(products, displayLabel);
  };

  return (
    <div>
      <BackButton onClick={onBack} />
      <div className="mt-4 mb-8">
        <h2 className="text-2xl font-bold mb-2">Upload the {brand.name} file</h2>
        <p className="text-gray-400 text-sm">{fileInfo.description}</p>
      </div>

      <div className="bg-[#1e2127] border border-[#3a3f4b] rounded-xl p-6 mb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium text-gray-300">{fileInfo.label}</p>
          {showBothTabs && (
            <div className="flex gap-0 border border-[#3a3f4b] rounded-md overflow-hidden">
              {(['file', 'url'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => switchTab(t)}
                  className={`px-3 py-1 text-xs transition-colors ${urlTab === (t === 'url') ? 'bg-[#3a3f4b] text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  {t === 'file' ? 'File' : 'URL'}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-4">
          {urlTab ? 'Fetches directly from a URL' : 'Accepts multiple .csv and .zip files'}
        </p>

        {!urlTab ? (
          <label className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg transition-colors cursor-pointer ${hasProducts ? 'border-green-500 bg-green-900/10' : 'border-[#3a3f4b] hover:border-cyan-400'} ${fileNames.length > 2 ? 'py-4' : 'h-28'}`}>
            {loading ? (
              <span className="text-sm text-gray-400">Loading…</span>
            ) : hasProducts ? (
              <div className="text-center px-4 w-full">
                <span className="text-green-400 text-lg">✓</span>
                {fileNames.length === 1 ? (
                  <p className="text-sm text-gray-300 mt-1">{fileNames[0]}</p>
                ) : (
                  <ul className="mt-1 space-y-0.5">
                    {fileNames.map((name, i) => (
                      <li key={i} className="text-xs text-gray-300 truncate">{name}</li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-gray-500 mt-1.5">Click to replace</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-gray-400">Drop files or click to browse</p>
                <p className="text-xs text-gray-600 mt-1">.csv or .zip — multiple allowed</p>
              </div>
            )}
            <input type="file" accept=".csv,.zip" multiple className="hidden" onChange={handleFileChange} />
          </label>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="url"
                value={urlValue}
                onChange={e => { setUrlValue(e.target.value); setProducts(null); setFileNames([]); }}
                placeholder="https://vendor.example.com/feed.csv"
                className="flex-1 bg-[#282c34] border border-[#3a3f4b] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400"
              />
              <button
                onClick={handleFetch}
                disabled={fetching || !urlValue.trim()}
                className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
              >
                {fetching ? 'Fetching…' : 'Fetch'}
              </button>
            </div>
            {hasProducts && (
              <p className="text-xs text-green-400">✓ {fileNames[0]}</p>
            )}
          </div>
        )}
      </div>

      {/* Expected headers info panel */}
      {expectedHeaders.length > 0 && (
        <div className="bg-[#1e2127]/60 border border-[#3a3f4b] rounded-lg px-4 py-3 mb-4">
          <p className="text-xs font-medium text-gray-400 mb-1.5">Expected columns in this file</p>
          <div className="flex flex-wrap gap-1.5">
            {expectedHeaders.map(h => (
              <span key={h} className="text-xs bg-[#282c34] border border-[#3a3f4b] rounded px-2 py-0.5 text-gray-400 font-mono">
                {h}
              </span>
            ))}
            {vendorInstance.expectedHeaders.length > 6 && (
              <span className="text-xs text-gray-600 self-center">+{vendorInstance.expectedHeaders.length - 6} more</span>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      <div className="flex justify-between items-center mt-8">
        <BackButton onClick={onBack} />
        <button
          onClick={handleNext}
          disabled={loading || fetching || !hasProducts}
          className="px-6 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
