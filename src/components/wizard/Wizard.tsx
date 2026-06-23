import { useReducer } from 'react';
import type { WizardState, WizardDispatch, WizardStep } from './types.ts';
import { ACTION_LABELS } from './types.ts';
import Step1Home from './Step1Home.tsx';
import Step2ShopifyFile from './Step2ShopifyFile.tsx';
import Step3Vendor from './Step3Vendor.tsx';
import Step4VendorFile from './Step4VendorFile.tsx';
import Step5Run from './Step5Run.tsx';
import LogPanel from '../LogPanel.tsx';

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
      return {
        ...state,
        step: 'run',
        vendorProducts: action.products,
        vendorFileName: action.fileName,
        runState: 'idle',
        resultCSV: undefined,
        errorMessage: undefined,
      };
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

interface BreadcrumbItem {
  label: string;
  step: WizardStep;
  clickable: boolean;
}

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
    <nav className="flex items-center gap-1.5 text-xs mb-6">
      {items.map((item, i) => (
        <span key={item.step} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-gray-600">›</span>}
          {item.clickable ? (
            <button
              onClick={() => dispatch({ type: 'NAVIGATE_TO', step: item.step })}
              className="text-gray-400 hover:text-cyan-400 transition-colors"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-gray-300">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export default function Wizard({ version }: { version?: string }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <div className="flex flex-col min-h-screen bg-[#282c34] text-white">
      <header className="border-b border-[#3a3f4b] px-6 py-4">
        <button
          onClick={() => dispatch({ type: 'NAVIGATE_TO', step: 'home' })}
          className="text-lg font-semibold text-cyan-400 tracking-tight hover:text-cyan-300 transition-colors"
        >
          Shopify CSV Update
        </button>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">
        <Breadcrumb state={state} dispatch={dispatch} />

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
      </main>

      <LogPanel version={version} />
    </div>
  );
}
