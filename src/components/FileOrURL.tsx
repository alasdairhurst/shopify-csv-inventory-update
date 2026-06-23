import { useRef, useState } from 'react';

export interface UrlConfig {
  defaultURL?: string;
  supportsFile: true;
  supportsURL: boolean;
}

interface Props {
  label: string;
  urlConfig?: UrlConfig;
  storageKey?: string;
  onResolved: (csv: string, name: string) => void;
  onClear: () => void;
  error?: string;
}

type Tab = 'file' | 'url';

export default function FileOrURL({ label, urlConfig, storageKey, onResolved, onClear, error }: Props) {
  const fileOnly = !urlConfig || (urlConfig.supportsFile && !urlConfig.supportsURL);
  const urlOnly = urlConfig && urlConfig.supportsURL && !urlConfig.supportsFile;
  const both = urlConfig && urlConfig.supportsFile && urlConfig.supportsURL;

  const defaultTab: Tab = both && urlConfig?.defaultURL ? 'url' : 'file';
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [urlValue, setUrlValue] = useState(
    storageKey ? (localStorage.getItem(`lastUrl:${storageKey}`) ?? urlConfig?.defaultURL ?? '') : (urlConfig?.defaultURL ?? '')
  );
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      onClear();
      setResolvedName(null);
      return;
    }
    setResolvedName(file.name);
    // In phase 1 we just store the name; actual reading happens in phase 2
    onResolved('__file_pending__', file.name);
  };

  const handleFetch = async () => {
    if (!urlValue.trim()) return;
    setFetching(true);
    setFetchError(null);
    // Phase 1 mock: simulate a fetch
    await new Promise(r => setTimeout(r, 600));
    if (storageKey) localStorage.setItem(`lastUrl:${storageKey}`, urlValue.trim());
    const mockName = urlValue.trim().split('/').pop() ?? 'feed.csv';
    setResolvedName(mockName);
    onResolved('__url_pending__', mockName);
    setFetching(false);
  };

  const showTabs = both;
  const showFile = fileOnly || (both && tab === 'file');
  const showUrl = urlOnly || (both && tab === 'url');

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>

      {showTabs && (
        <div className="flex mb-3 border border-[#3a3f4b] rounded-md w-fit">
          {(['file', 'url'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); onClear(); setResolvedName(null); }}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${tab === t ? 'bg-[#3a3f4b] text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {t === 'file' ? 'File' : 'URL'}
            </button>
          ))}
        </div>
      )}

      {showFile && (
        <div className="relative">
          <label className="flex items-center justify-center w-full h-20 border-2 border-dashed border-[#3a3f4b] rounded-lg hover:border-cyan-400 transition-colors cursor-pointer">
            <span className="text-sm text-gray-400">
              {resolvedName ? `✓ ${resolvedName}` : 'Drop file or click to browse (.csv, .zip)'}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.zip"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleFileChange}
            />
          </label>
        </div>
      )}

      {showUrl && (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlValue}
            onChange={e => { setUrlValue(e.target.value); onClear(); setResolvedName(null); }}
            placeholder="https://vendor.example.com/feed.csv"
            className="flex-1 bg-[#1e2127] border border-[#3a3f4b] rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
          />
          <button
            onClick={handleFetch}
            disabled={fetching || !urlValue.trim()}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-md transition-colors"
          >
            {fetching ? 'Fetching…' : 'Fetch'}
          </button>
        </div>
      )}

      {resolvedName && (
        <p className="mt-1.5 text-xs text-green-400">✓ {resolvedName}</p>
      )}
      {fetchError && (
        <p className="mt-1.5 text-xs text-red-400">{fetchError}</p>
      )}
      {error && !resolvedName && (
        <p className="mt-1.5 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
