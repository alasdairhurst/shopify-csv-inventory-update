import type { WizardState, WizardDispatch } from './types.ts';
import { ACTION_LABELS } from './types.ts';
import BackButton from './BackButton.tsx';
import Spinner from '../Spinner.tsx';
import CSVPreview from '../CSVPreview.tsx';
import { downloadTextFile } from '../../files/download.ts';
import { runUpdateInventory, runAddProducts, runUpdateProducts } from '../../orchestrate.ts';
import ExpectedError from '../../utils/ExpectedError.ts';
import {
  DOWNLOAD_INVENTORY_FILE_NAME,
  DOWNLOAD_PRODUCTS_FILE_NAME,
  DOWNLOAD_PRODUCTS_UPDATE_FILE_NAME,
} from '../../utils/constants.ts';

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardDispatch>;
}

export default function Step5Run({ state, dispatch }: Props) {
  const { action, brand, shopifyFileName, vendorFileName, settings, runState, resultCSV, errorMessage } = state;
  if (!action || !brand) return null;

  const { title } = ACTION_LABELS[action];
  const isLocked = runState !== 'idle';

  const downloadName = action === 'inventory' ? DOWNLOAD_INVENTORY_FILE_NAME
    : action === 'addProducts' ? DOWNLOAD_PRODUCTS_FILE_NAME
    : DOWNLOAD_PRODUCTS_UPDATE_FILE_NAME;

  const handleRun = async () => {
    dispatch({ type: 'START_RUN' });
    try {
      const vendor = brand.vendorFor[action]!();
      let csv: string;
      if (action === 'inventory') {
        csv = await runUpdateInventory(state.shopifyProducts!, state.vendorProducts!, vendor, { maxQuantity: settings.maxQuantity });
      } else if (action === 'addProducts') {
        csv = await runAddProducts(state.shopifyProducts!, state.vendorProducts!, vendor);
      } else {
        csv = await runUpdateProducts(state.shopifyProducts!, state.vendorProducts!, vendor, { updateImages: settings.updateImages });
      }
      dispatch({ type: 'RUN_DONE', resultCSV: csv });
    } catch (err) {
      const message = err instanceof ExpectedError ? err.message
        : err instanceof Error ? err.message
        : 'Unknown error';
      dispatch({ type: 'RUN_ERROR', message });
    }
  };

  const handleSettingChange = (key: keyof typeof settings, value: number | boolean) => {
    if (isLocked) return;
    const updated = { ...settings, [key]: value };
    if (key === 'maxQuantity') {
      localStorage.setItem('settings:maxQuantity', String(value));
    }
    dispatch({ type: 'SET_SETTINGS', settings: updated });
  };

  const hasSettings = action === 'inventory' || action === 'editProducts';

  return (
    <div>
      {runState === 'idle' && <BackButton onClick={() => dispatch({ type: 'BACK' })} />}

      <div className="mt-4 mb-6">
        <h2 className="text-2xl font-bold">
          {runState === 'done' ? 'Complete' : runState === 'running' ? 'Processing…' : 'Review and run'}
        </h2>
      </div>

      {/* Summary */}
      <section className="bg-[#1e2127] border border-[#3a3f4b] rounded-xl p-5 mb-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Summary</h3>
        <dl className="grid grid-cols-[auto,1fr] gap-x-5 gap-y-2 text-sm">
          <dt className="text-gray-500">Action</dt>
          <dd className="text-white">{title}</dd>
          <dt className="text-gray-500">Vendor</dt>
          <dd className="text-white flex items-center gap-2">
            {typeof brand.icon === 'string'
              ? <span>{brand.icon}</span>
              : <img src={brand.icon.url} alt={brand.name} className="w-5 h-5 object-contain" />}
            <span>{brand.name}</span>
          </dd>
          <dt className="text-gray-500">Shopify file</dt>
          <dd className="text-white truncate">{shopifyFileName ?? '—'}</dd>
          <dt className="text-gray-500">Vendor file</dt>
          <dd className="text-white truncate">{vendorFileName ?? '—'}</dd>
        </dl>
      </section>

      {/* Settings */}
      {hasSettings && (
        <section className={`bg-[#1e2127] border border-[#3a3f4b] rounded-xl p-5 mb-5 transition-opacity ${isLocked ? 'opacity-50' : ''}`}>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Settings</h3>
          {action === 'inventory' && (
            <div className="flex items-center gap-4">
              <label htmlFor="maxQuantity" className="text-sm text-gray-300">Maximum stock level</label>
              <input
                id="maxQuantity"
                type="number"
                min={1}
                value={settings.maxQuantity}
                onChange={e => handleSettingChange('maxQuantity', Number(e.target.value))}
                disabled={isLocked}
                className="w-20 bg-[#282c34] border border-[#3a3f4b] rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-cyan-400 disabled:cursor-not-allowed"
              />
            </div>
          )}
          {action === 'editProducts' && (
            <div className="flex items-center gap-3">
              <input
                id="updateImages"
                type="checkbox"
                checked={settings.updateImages}
                onChange={e => handleSettingChange('updateImages', e.target.checked)}
                disabled={isLocked}
                className="w-4 h-4 accent-cyan-400 disabled:cursor-not-allowed"
              />
              <label htmlFor="updateImages" className="text-sm text-gray-300">Update variant images</label>
            </div>
          )}
        </section>
      )}

      {/* Run button */}
      {runState === 'idle' && (
        <div className="flex justify-end">
          <button
            onClick={handleRun}
            className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg transition-colors"
          >
            Run ▶
          </button>
        </div>
      )}

      {/* Running */}
      {runState === 'running' && (
        <div className="flex flex-col items-center py-10 gap-4">
          <Spinner />
          <p className="text-gray-400 text-sm">Processing…</p>
        </div>
      )}

      {/* Error */}
      {runState === 'error' && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mt-4">
          <p className="text-red-300 text-sm font-medium mb-1">Something went wrong</p>
          <p className="text-red-200 text-sm whitespace-pre-wrap">{errorMessage}</p>
          <button
            onClick={() => dispatch({ type: 'RESET_RUN' })}
            className="mt-3 px-4 py-1.5 bg-red-700 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Result */}
      {runState === 'done' && resultCSV && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-400">Preview the output below before downloading.</p>
            <button
              onClick={() => downloadTextFile(resultCSV, downloadName, 'text/csv')}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              ⬇ Download CSV
            </button>
          </div>
          <CSVPreview csv={resultCSV} />
          <div className="mt-8 pt-6 border-t border-[#3a3f4b]">
            <button
              onClick={() => dispatch({ type: 'SET_ACTION', action })}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              ← Start another run
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
