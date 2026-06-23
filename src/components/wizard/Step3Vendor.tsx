import { brandsForAction } from '../../vendors/brands.ts';
import type { Brand } from '../../vendors/brand.ts';
import type { BrandIcon } from '../../vendors/brands.ts';
import type { WizardAction } from './types.ts';
import { ACTION_LABELS } from './types.ts';

interface Props {
  action: WizardAction;
  onSelect: (brand: Brand) => void;
  onBack: () => void;
}

function isLargeIcon(icon: BrandIcon): icon is { url: string; size: 'large' } {
  return typeof icon === 'object' && icon.size === 'large';
}

export default function Step3Vendor({ action, onSelect, onBack }: Props) {
  const available = brandsForAction(action);
  const { subtitle } = ACTION_LABELS[action];

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,163,72,0.5)', marginBottom: 4 }}>
          Step 2 — Vendor
        </p>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#fff', margin: 0 }}>
          Choose your vendor
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.38)', marginTop: 6, fontWeight: 400 }}>{subtitle}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {available.map(brand => {
          const { icon } = brand;

          if (isLargeIcon(icon)) {
            return (
              <button
                key={brand.id}
                onClick={() => onSelect(brand)}
                className="ufc-action-card"
                style={{ padding: 0, overflow: 'hidden' }}
              >
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
              onClick={() => onSelect(brand)}
              className="ufc-action-card"
              style={{ padding: '18px 16px' }}
            >
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

      <div style={{ marginTop: 24 }}>
        <button className="ufc-btn-secondary" onClick={onBack}>← Back</button>
      </div>
    </div>
  );
}
