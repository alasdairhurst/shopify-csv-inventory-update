import { useReducer } from 'react';
import type { WizardState, WizardDispatch, WizardStep } from './types.ts';
import { ACTION_LABELS } from './types.ts';
import Step1Home from './Step1Home.tsx';
import Step2ShopifyFile from './Step2ShopifyFile.tsx';
import Step3Vendor from './Step3Vendor.tsx';
import Step4VendorFile from './Step4VendorFile.tsx';
import Step5Run from './Step5Run.tsx';
import LogPanel from '../LogPanel.tsx';
import OctagonScene from './OctagonScene.tsx';

const INITIAL_MAX_QUANTITY = Number(localStorage.getItem('settings:maxQuantity') ?? 5) || 5;

const initialState: WizardState = {
  step: 'home',
  settings: { maxQuantity: INITIAL_MAX_QUANTITY, updateImages: false },
  runState: 'idle',
};

function reducer(state: WizardState, action: WizardDispatch): WizardState {
  switch (action.type) {
    case 'SET_ACTION':
      return { ...initialState, step: 'shopifyFile', action: action.action };
    case 'SET_SHOPIFY_FILE':
      return { ...state, step: 'vendor', shopifyProducts: action.products, shopifyFileName: action.fileName };
    case 'SET_BRAND':
      return { ...state, step: 'vendorFile', brand: action.brand };
    case 'SET_VENDOR_FILE':
      return { ...state, step: 'run', vendorProducts: action.products, vendorFileName: action.fileName, runState: 'idle', resultCSV: undefined, errorMessage: undefined };
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };
    case 'START_RUN':
      return { ...state, runState: 'running', resultCSV: undefined, errorMessage: undefined };
    case 'RUN_DONE':
      return { ...state, runState: 'done', resultCSV: action.resultCSV };
    case 'RUN_ERROR':
      return { ...state, runState: 'error', errorMessage: action.message };
    case 'RESET_RUN':
      return { ...state, runState: 'idle', resultCSV: undefined, errorMessage: undefined };
    case 'BACK':
      if (state.step === 'shopifyFile') return { ...initialState };
      if (state.step === 'vendor') return { ...state, step: 'shopifyFile', shopifyProducts: undefined, shopifyFileName: undefined, brand: undefined, vendorProducts: undefined, vendorFileName: undefined, runState: 'idle', resultCSV: undefined, errorMessage: undefined };
      if (state.step === 'vendorFile') return { ...state, step: 'vendor', brand: undefined, vendorProducts: undefined, vendorFileName: undefined, runState: 'idle', resultCSV: undefined, errorMessage: undefined };
      if (state.step === 'run') return { ...state, step: 'vendorFile', vendorProducts: undefined, vendorFileName: undefined, runState: 'idle', resultCSV: undefined, errorMessage: undefined };
      return state;
    case 'NAVIGATE_TO':
      if (action.step === 'home') return { ...initialState };
      if (action.step === 'shopifyFile') return { ...state, step: 'shopifyFile', shopifyProducts: undefined, shopifyFileName: undefined, brand: undefined, vendorProducts: undefined, vendorFileName: undefined, runState: 'idle', resultCSV: undefined, errorMessage: undefined };
      if (action.step === 'vendor') return { ...state, step: 'vendor', brand: undefined, vendorProducts: undefined, vendorFileName: undefined, runState: 'idle', resultCSV: undefined, errorMessage: undefined };
      if (action.step === 'vendorFile') return { ...state, step: 'vendorFile', vendorProducts: undefined, vendorFileName: undefined, runState: 'idle', resultCSV: undefined, errorMessage: undefined };
      return state;
    default:
      return state;
  }
}

interface BreadcrumbItem { label: string; step: WizardStep; clickable: boolean; }

function Breadcrumb({ state, dispatch }: { state: WizardState; dispatch: React.Dispatch<WizardDispatch> }) {
  const items: BreadcrumbItem[] = [{ label: 'Home', step: 'home', clickable: state.step !== 'home' }];
  if (state.action) {
    items.push({ label: ACTION_LABELS[state.action].title, step: 'shopifyFile', clickable: state.step !== 'shopifyFile' });
  }
  if (state.brand) {
    items.push({ label: state.brand.name, step: 'vendor', clickable: true });
  }
  if (items.length <= 1) return null;

  return (
    <nav className="ufc-breadcrumb">
      {items.map((item, i) => (
        <span key={item.step} className="flex items-center gap-1.5">
          {i > 0 && <span className="ufc-breadcrumb-sep">›</span>}
          {item.clickable ? (
            <button className="ufc-breadcrumb-link" onClick={() => dispatch({ type: 'NAVIGATE_TO', step: item.step })}>
              {item.label}
            </button>
          ) : (
            <span className="ufc-breadcrumb-active">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export default function Wizard({ version }: { version?: string }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <div className="arena">
      {/* ── 3D world — atmosphere only (floor, fence, lights) ── */}
      <div className="world" data-step={state.step}>
        <div className="world-origin">
          <OctagonScene />
        </div>
      </div>

      {/* ── Screen-space overlays ── */}
      <div className="spotlight-overlay" />
      <div className="crowd-vignette" />
      <div className="arena-tint" data-step={state.step} />

      {/* ── Step content — screen space, always interactive ── */}
      <div className="arena-step-content">
        {state.step === 'home' && (
          <Step1Home onSelect={action => dispatch({ type: 'SET_ACTION', action })} />
        )}
        {state.step === 'shopifyFile' && state.action && (
          <Step2ShopifyFile
            action={state.action}
            onNext={(products, fileName) => dispatch({ type: 'SET_SHOPIFY_FILE', products, fileName })}
            onBack={() => dispatch({ type: 'BACK' })}
          />
        )}
        {state.step === 'vendor' && state.action && (
          <Step3Vendor
            action={state.action}
            onSelect={brand => dispatch({ type: 'SET_BRAND', brand })}
            onBack={() => dispatch({ type: 'BACK' })}
          />
        )}
        {state.step === 'vendorFile' && state.action && state.brand && (
          <Step4VendorFile
            action={state.action}
            brand={state.brand}
            onNext={(products, fileName) => dispatch({ type: 'SET_VENDOR_FILE', products, fileName })}
            onBack={() => dispatch({ type: 'BACK' })}
          />
        )}
        {state.step === 'run' && state.action && state.brand && (
          <Step5Run state={state} dispatch={dispatch} />
        )}
      </div>

      {/* ── HUD (header + log panel, pinned to screen) ── */}
      <div className="arena-hud">
        <div className="arena-hud-header">
          <button
            onClick={() => dispatch({ type: 'NAVIGATE_TO', step: 'home' })}
            className="ufc-breadcrumb-link"
            style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.06em', color: '#c9a84c' }}
          >
            Shopify CSV Update
          </button>
          <Breadcrumb state={state} dispatch={dispatch} />
        </div>
        <div className="arena-hud-footer">
          <LogPanel version={version} />
        </div>
      </div>
    </div>
  );
}
