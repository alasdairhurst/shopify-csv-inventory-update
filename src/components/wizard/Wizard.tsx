import { useReducer, useRef, useLayoutEffect, useEffect } from 'react';
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
  brands: [],
  vendorIndex: 0,
  vendorFiles: {},
  settings: { maxQuantity: INITIAL_MAX_QUANTITY, updateImages: false },
  runState: 'idle',
};

const RESET_RUN = { runState: 'idle' as const, resultCSV: undefined, errorMessage: undefined };
/** Clears the vendor selection and every feed collected for it. */
const RESET_VENDORS = { brands: [] as WizardState['brands'], vendorIndex: 0, vendorFiles: {} };

function reducer(state: WizardState, action: WizardDispatch): WizardState {
  switch (action.type) {
    case 'SET_ACTION':
      return { ...initialState, step: 'shopifyFile', action: action.action };
    case 'SET_SHOPIFY_FILE':
      return { ...state, step: 'vendor', shopifyProducts: action.products, shopifyFileName: action.fileName };
    case 'SET_BRANDS':
      return { ...state, step: 'vendorFile', brands: action.brands, vendorIndex: 0, vendorFiles: {}, ...RESET_RUN };
    case 'SET_VENDOR_FILE': {
      const vendorFiles = { ...state.vendorFiles, [action.brandId]: { fileName: action.fileName, products: action.products } };
      const isLast = state.vendorIndex >= state.brands.length - 1;
      return {
        ...state,
        vendorFiles,
        step: isLast ? 'run' : 'vendorFile',
        vendorIndex: isLast ? state.vendorIndex : state.vendorIndex + 1,
        ...RESET_RUN,
      };
    }
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };
    case 'START_RUN':
      return { ...state, runState: 'running', resultCSV: undefined, errorMessage: undefined };
    case 'RUN_DONE':
      return { ...state, runState: 'done', resultCSV: action.resultCSV };
    case 'RUN_ERROR':
      return { ...state, runState: 'error', errorMessage: action.message };
    case 'RESET_RUN':
      return { ...state, ...RESET_RUN };
    case 'ENTER_CINEMATIC':
      return { ...state, cinematic: true };
    case 'BACK':
      if (state.step === 'shopifyFile') return { ...initialState };
      if (state.step === 'vendor') return { ...state, step: 'shopifyFile', shopifyProducts: undefined, shopifyFileName: undefined, ...RESET_VENDORS, ...RESET_RUN };
      if (state.step === 'vendorFile') {
        // Page back to the previous vendor's feed, or to the vendor picker from the first.
        if (state.vendorIndex > 0) return { ...state, vendorIndex: state.vendorIndex - 1, ...RESET_RUN };
        return { ...state, step: 'vendor', ...RESET_VENDORS, ...RESET_RUN };
      }
      if (state.step === 'run') return { ...state, step: 'vendorFile', vendorIndex: Math.max(0, state.brands.length - 1), ...RESET_RUN };
      return state;
    case 'NAVIGATE_TO':
      if (action.step === 'home') return { ...initialState };
      if (action.step === 'shopifyFile') return { ...state, step: 'shopifyFile', shopifyProducts: undefined, shopifyFileName: undefined, ...RESET_VENDORS, ...RESET_RUN };
      if (action.step === 'vendor') return { ...state, step: 'vendor', ...RESET_VENDORS, ...RESET_RUN };
      if (action.step === 'vendorFile') return { ...state, step: 'vendorFile', vendorIndex: 0, ...RESET_RUN };
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
  if (state.brands.length) {
    const label = state.brands.length === 1 ? state.brands[0]!.name : `${state.brands.length} vendors`;
    items.push({ label, step: 'vendor', clickable: true });
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
  const worldRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);

  /*
   * The home screen drives the camera with CSS animations. When a step changes,
   * those animations stop matching and the transform would snap to its base
   * value before the CSS transition can interpolate — causing a jump. To tween
   * instead, freeze the camera at its current animated transform (pinned inline)
   * just before leaving home, then release it on the next frame so the
   * transition eases from the frozen pose to the new step's framing.
   */
  const freezeCamera = () => {
    for (const el of [worldRef.current, orbitRef.current]) {
      if (!el) continue;
      const t = getComputedStyle(el).transform;
      if (t && t !== 'none') {
        el.style.transform = t;
        el.style.animation = 'none';
      }
    }
  };

  useLayoutEffect(() => {
    const w = worldRef.current, o = orbitRef.current;
    const hasFrozen = (w && w.style.transform) || (o && o.style.transform);
    if (!hasFrozen) return;
    const id = requestAnimationFrame(() => {
      for (const el of [w, o]) {
        if (!el) continue;
        el.style.transform = '';
        el.style.animation = '';
      }
    });
    return () => cancelAnimationFrame(id);
  }, [state.step]);

  /*
   * After 30s of inactivity on the home screen, drop into cinematic mode so the
   * arena plays out on its own. Any pointer/keyboard activity restarts the clock.
   */
  useEffect(() => {
    if (state.step !== 'home' || state.cinematic) return;
    let timer: number;
    const reset = () => {
      clearTimeout(timer);
      timer = window.setTimeout(() => dispatch({ type: 'ENTER_CINEMATIC' }), 30_000);
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel'] as const;
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [state.step, state.cinematic]);

  const viewStep = state.cinematic ? 'home' : state.step;

  return (
    <div className="arena" data-step={viewStep}>
      {/* ── 3D world — atmosphere only (floor, fence, lights) ── */}
      <div className="world" data-step={viewStep} data-run-state={state.runState} ref={worldRef}>
        <div className="world-orbit" ref={orbitRef}>
          <div className="world-origin">
            <OctagonScene />
          </div>
        </div>
      </div>

      {/* ── Screen-space overlays ── */}
      <div className="spotlight-overlay" />
      <div className="crowd-vignette" />
      <div className="arena-tint" data-step={viewStep} />

      {/* ── Cinematic letterbox bars (grow during the middle wizard stages) ── */}
      <div className="cine-bar cine-bar-top" />
      <div className="cine-bar cine-bar-bottom" />

      {/* ── Step content — screen space, always interactive (hidden in cinematic mode) ── */}
      <div className="arena-step-content">
        {!state.cinematic && state.step === 'home' && (
          <Step1Home onSelect={action => { freezeCamera(); dispatch({ type: 'SET_ACTION', action }); }} />
        )}
        {!state.cinematic && state.step === 'shopifyFile' && state.action && (
          <Step2ShopifyFile
            action={state.action}
            onNext={(products, fileName) => dispatch({ type: 'SET_SHOPIFY_FILE', products, fileName })}
            onBack={() => dispatch({ type: 'BACK' })}
          />
        )}
        {!state.cinematic && state.step === 'vendor' && state.action && (
          <Step3Vendor
            action={state.action}
            initialSelected={state.brands}
            onContinue={brands => dispatch({ type: 'SET_BRANDS', brands })}
            onBack={() => dispatch({ type: 'BACK' })}
          />
        )}
        {!state.cinematic && state.step === 'vendorFile' && state.action && state.brands[state.vendorIndex] && (() => {
          const brand = state.brands[state.vendorIndex]!;
          const existing = state.vendorFiles[brand.id];
          return (
            <Step4VendorFile
              key={brand.id}
              action={state.action!}
              brand={brand}
              stepIndex={state.vendorIndex}
              stepTotal={state.brands.length}
              initialProducts={existing?.products ?? null}
              initialFileName={existing?.fileName ?? null}
              onNext={(products, fileName) => dispatch({ type: 'SET_VENDOR_FILE', brandId: brand.id, products, fileName })}
              onBack={() => dispatch({ type: 'BACK' })}
            />
          );
        })()}
        {!state.cinematic && state.step === 'run' && state.action && state.brands.length > 0 && (
          <Step5Run state={state} dispatch={dispatch} />
        )}
      </div>

      {/* ── HUD (header + log panel, pinned to screen) ── */}
      <div className="arena-hud">
        {state.cinematic ? (
          /* Cinematic mode: scene plays out, a single Start button returns home. */
          <button className="cinematic-start" onClick={() => dispatch({ type: 'NAVIGATE_TO', step: 'home' })}>
            <span className="cinematic-start-icon">▶</span>
            <span>Start</span>
          </button>
        ) : (
          <>
            <div className="arena-hud-header">
              <button
                onClick={() => dispatch({ type: 'NAVIGATE_TO', step: 'home' })}
                className="ufc-breadcrumb-link"
                style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.06em', color: '#c9a84c' }}
              >
                Shopify CSV Update
              </button>
              <Breadcrumb state={state} dispatch={dispatch} />
              {(state.step === 'home') && (
                <button
                  className="arena-hide-btn"
                  onClick={() => dispatch({ type: 'ENTER_CINEMATIC' })}
                  title="Hide the interface and watch the arena"
                  aria-label="Hide interface"
                >
                  ⤢ Hide
                </button>
              )}
            </div>
            <div className="arena-hud-footer">
              <LogPanel version={version} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
