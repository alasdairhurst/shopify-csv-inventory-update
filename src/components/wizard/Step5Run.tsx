import { Fragment } from 'react';
import type { WizardState, WizardDispatch } from './types.ts';
import { ACTION_LABELS } from './types.ts';
import type { Product } from '../../vendors/vendor.ts';
import CSVPreview from '../CSVPreview.tsx';
import Spinner from '../Spinner.tsx';
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
  const { action, brands, shopifyFileName, vendorFiles, settings, runState, resultCSV, errorMessage } = state;
  if (!action || !brands.length) return null;

  const { title } = ACTION_LABELS[action];
  const isLocked = runState !== 'idle';

  const downloadName = action === 'inventory' ? DOWNLOAD_INVENTORY_FILE_NAME
    : action === 'addProducts' ? DOWNLOAD_PRODUCTS_FILE_NAME
    : DOWNLOAD_PRODUCTS_UPDATE_FILE_NAME;

  const handleRun = async () => {
    dispatch({ type: 'START_RUN' });
    // Yield two animation frames so the browser paints the loading state
    // before the synchronous CSV work blocks the thread.
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    try {
      // Collect every selected vendor's feed into a map keyed by vendor name,
      // which is how the underlying functions look products up per vendor.
      const vendorProducts: Record<string, Product[]> = {};
      for (const b of brands) {
        const entry = vendorFiles[b.id];
        if (!entry) continue;
        vendorProducts[b.vendorFor[action]!().name] = entry.products;
      }
      let csv: string;
      if (action === 'inventory') {
        csv = await runUpdateInventory(state.shopifyProducts!, vendorProducts, { maxQuantity: settings.maxQuantity });
      } else if (action === 'addProducts') {
        csv = await runAddProducts(state.shopifyProducts!, vendorProducts);
      } else {
        csv = await runUpdateProducts(state.shopifyProducts!, vendorProducts, { updateImages: settings.updateImages });
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
    if (key === 'maxQuantity') localStorage.setItem('settings:maxQuantity', String(value));
    dispatch({ type: 'SET_SETTINGS', settings: updated });
  };

  const hasSettings = action === 'inventory' || action === 'editProducts';
  const stageLabel = runState === 'done' ? 'Complete' : runState === 'running' ? 'Processing…' : 'Review & Run';

  return (
    <div className="ufc-step-wide">
      <div style={{ marginBottom: 22 }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,163,72,0.5)', marginBottom: 4 }}>
          Step 4 — Execute
        </p>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#fff', margin: 0 }}>
          {stageLabel}
        </h2>
      </div>

      {/* Summary */}
      <div className="ufc-panel" style={{ marginBottom: 12 }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(200,163,72,0.45)', marginBottom: 12 }}>
          Summary
        </p>
        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 20px', fontSize: '0.82rem' }}>
          <dt style={{ color: 'rgba(200,163,72,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem' }}>Action</dt>
          <dd style={{ color: '#fff' }}>{title}</dd>
          <dt style={{ color: 'rgba(200,163,72,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem' }}>Shopify</dt>
          <dd style={{ color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shopifyFileName ?? '—'}</dd>
          {brands.map(b => (
            <Fragment key={b.id}>
              <dt style={{ color: 'rgba(200,163,72,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                {typeof b.icon === 'string'
                  ? <span>{b.icon}</span>
                  : <img src={b.icon.url} alt={b.name} style={{ width: 16, height: 16, objectFit: 'contain' }} />}
                <span>{b.name}</span>
              </dt>
              <dd style={{ color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vendorFiles[b.id]?.fileName ?? '—'}</dd>
            </Fragment>
          ))}
        </dl>
      </div>

      {/* Settings */}
      {hasSettings && (
        <div className="ufc-panel" style={{ marginBottom: 16, opacity: isLocked ? 0.45 : 1, transition: 'opacity 0.2s' }}>
          <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(200,163,72,0.45)', marginBottom: 12 }}>
            Settings
          </p>
          {action === 'inventory' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <label htmlFor="maxQuantity" style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Maximum stock level
              </label>
              <input
                id="maxQuantity"
                type="number"
                min={1}
                value={settings.maxQuantity}
                onChange={e => handleSettingChange('maxQuantity', Number(e.target.value))}
                disabled={isLocked}
                className="ufc-number-input"
              />
            </div>
          )}
          {action === 'editProducts' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                id="updateImages"
                type="checkbox"
                checked={settings.updateImages}
                onChange={e => handleSettingChange('updateImages', e.target.checked)}
                disabled={isLocked}
                style={{ width: 16, height: 16, accentColor: '#c9a84c', cursor: isLocked ? 'not-allowed' : 'pointer' }}
              />
              <label htmlFor="updateImages" style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em', cursor: isLocked ? 'not-allowed' : 'pointer' }}>
                Update variant images
              </label>
            </div>
          )}
        </div>
      )}

      {/* Run button */}
      {runState === 'idle' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 14 }}>
          <button className="ufc-btn-secondary" onClick={() => dispatch({ type: 'BACK' })}>← Back</button>
          <button className="run-btn" onClick={handleRun}>Run ▶</button>
        </div>
      )}

      {/* Running */}
      {runState === 'running' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 16 }}>
          <Spinner />
          <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Processing…</p>
        </div>
      )}

      {/* Error */}
      {runState === 'error' && (
        <div style={{ background: 'rgba(120,10,10,0.25)', border: '1px solid rgba(180,40,40,0.5)', padding: '16px 18px', marginTop: 12 }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#e07070', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Something went wrong</p>
          <p style={{ fontSize: '0.8rem', color: '#d08080', whiteSpace: 'pre-wrap' }}>{errorMessage}</p>
          <button
            onClick={() => dispatch({ type: 'RESET_RUN' })}
            className="ufc-btn-secondary"
            style={{ marginTop: 12 }}
          >
            Try again
          </button>
        </div>
      )}

      {/* Result */}
      {runState === 'done' && resultCSV && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Preview output before downloading
            </p>
            <button
              onClick={() => downloadTextFile(resultCSV, downloadName, 'text/csv')}
              className="ufc-btn-primary"
            >
              ⬇ Download CSV
            </button>
          </div>
          <CSVPreview csv={resultCSV} />
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(200,163,72,0.12)' }}>
            <button
              onClick={() => dispatch({ type: 'NAVIGATE_TO', step: 'home' })}
              className="ufc-btn-secondary"
              style={{ fontSize: '0.76rem' }}
            >
              ← Start another round
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
