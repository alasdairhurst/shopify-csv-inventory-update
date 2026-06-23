import { useState } from 'react';
import { brandsForAction } from '../../vendors/brands.ts';
import type { Brand } from '../../vendors/brand.ts';
import type { BrandIcon } from '../../vendors/brands.ts';
import type { WizardAction } from './types.ts';
import { ACTION_LABELS } from './types.ts';

interface Props {
  action: WizardAction;
  /** Vendors already selected (when returning to this step). */
  initialSelected?: Brand[];
  onContinue: (brands: Brand[]) => void;
  onBack: () => void;
}

function isLargeIcon(icon: BrandIcon): icon is { url: string; size: 'large' } {
  return typeof icon === 'object' && icon.size === 'large';
}

function SelectedBadge() {
  return (
    <span
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: '#c9a84c',
        color: '#030303',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.7rem',
        fontWeight: 700,
        boxShadow: '0 0 8px rgba(200,163,72,0.6)',
      }}
    >
      ✓
    </span>
  );
}

export default function Step3Vendor({ action, initialSelected = [], onContinue, onBack }: Props) {
  const available = brandsForAction(action);
  const { subtitle } = ACTION_LABELS[action];
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelected.map(b => b.id));

  const toggle = (id: string) =>
    setSelectedIds(ids => (ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]));

  // Preserve the order in which vendors were selected — that's the order their feeds are collected.
  const selectedBrands = selectedIds
    .map(id => available.find(b => b.id === id))
    .filter((b): b is Brand => b !== undefined);

  const handleContinue = () => {
    if (selectedBrands.length) onContinue(selectedBrands);
  };

  const selectedStyle = (selected: boolean): React.CSSProperties =>
    selected
      ? { borderColor: '#c9a84c', background: 'rgba(20,16,6,0.98)', boxShadow: '0 0 16px rgba(200,163,72,0.18)' }
      : {};

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,163,72,0.5)', marginBottom: 4 }}>
          Step 2 — Vendor
        </p>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#fff', margin: 0 }}>
          Choose your vendors
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.38)', marginTop: 6, fontWeight: 400 }}>{subtitle}</p>
        <p style={{ fontSize: '0.7rem', color: 'rgba(200,163,72,0.55)', marginTop: 4, fontWeight: 400 }}>
          Select one or more — you'll provide a feed for each in turn.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {available.map(brand => {
          const { icon } = brand;
          const selected = selectedIds.includes(brand.id);

          if (isLargeIcon(icon)) {
            return (
              <button
                key={brand.id}
                onClick={() => toggle(brand.id)}
                aria-pressed={selected}
                className="ufc-action-card"
                style={{ padding: 0, overflow: 'hidden', ...selectedStyle(selected) }}
              >
                {selected && <SelectedBadge />}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(255,255,255,0.04)', minHeight: 72 }}>
                  <img src={icon.url} alt={brand.name} style={{ maxHeight: 48, width: '100%', objectFit: 'contain', filter: 'drop-shadow(0 1px 6px rgba(255,255,255,0.55))' }} />
                </div>
                <div style={{ padding: '8px 14px', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#c9a84c' }}>
                  {brand.name}
                </div>
              </button>
            );
          }

          return (
            <button
              key={brand.id}
              onClick={() => toggle(brand.id)}
              aria-pressed={selected}
              className="ufc-action-card"
              style={{ padding: '18px 16px', ...selectedStyle(selected) }}
            >
              {selected && <SelectedBadge />}
              <div style={{ marginBottom: 10, fontSize: '1.8rem' }}>
                {typeof brand.icon === 'string'
                  ? brand.icon
                  : <img src={brand.icon.url} alt={brand.name} style={{ width: 36, height: 36, objectFit: 'contain', filter: 'drop-shadow(0 1px 6px rgba(255,255,255,0.55))' }} />}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#c9a84c' }}>
                {brand.name}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
        <button className="ufc-btn-secondary" onClick={onBack}>← Back</button>
        <button className="ufc-btn-primary" onClick={handleContinue} disabled={selectedBrands.length === 0}>
          {selectedBrands.length > 1 ? `Continue (${selectedBrands.length}) →` : 'Continue →'}
        </button>
      </div>
    </div>
  );
}
