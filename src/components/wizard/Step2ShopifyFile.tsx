import { useState } from 'react';
import type { WizardAction } from './types.ts';
import { SHOPIFY_FILE_LABELS } from './types.ts';
import BackButton from './BackButton.tsx';
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

  const { label, description } = SHOPIFY_FILE_LABELS[action];

  const hasProducts = products !== null;
  const displayLabel = fileNames.length === 1 ? fileNames[0]! : `${fileNames.length} files`;
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
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

  const handleNext = () => {
    if (!products) {
      setError('Please select at least one file before continuing.');
      return;
    }
    onNext(products, displayLabel);
  };

  return (
    <div>
      <BackButton onClick={onBack} />
      <div className="mt-4 mb-8">
        <h2 className="text-2xl font-bold mb-2">Upload your Shopify export</h2>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>

      <div className="bg-[#1e2127] border border-[#3a3f4b] rounded-xl p-6 mb-4">
        <p className="text-sm font-medium text-gray-300 mb-1">{label}</p>
        <p className="text-xs text-gray-500 mb-4">Accepts multiple .csv and .zip files</p>
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
      </div>

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      <div className="flex justify-between items-center mt-8">
        <BackButton onClick={onBack} />
        <button
          onClick={handleNext}
          disabled={loading || !hasProducts}
          className="px-6 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
