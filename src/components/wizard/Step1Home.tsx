import type { WizardAction } from './types.ts';

interface ActionCard {
  action: WizardAction;
  icon: string;
  title: string;
  description: string;
}

const cards: ActionCard[] = [
  {
    action: 'inventory',
    icon: '📦',
    title: 'Update Inventory',
    description: 'Pull the latest stock levels from a vendor feed and sync quantities into your Shopify inventory export.',
  },
  {
    action: 'addProducts',
    icon: '➕',
    title: 'Add Products',
    description: 'Create Shopify-ready product rows for items that exist in a vendor feed but are missing from your store.',
  },
  {
    action: 'editProducts',
    icon: '✏️',
    title: 'Edit Products',
    description: 'Refresh prices, barcodes, images, and tags on existing Shopify listings using the latest vendor data.',
  },
];

interface Props {
  onSelect: (action: WizardAction) => void;
}

export default function Step1Home({ onSelect }: Props) {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,163,72,0.5)', marginBottom: 6 }}>
          Select Operation
        </p>
        <h2 style={{ fontSize: '1.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#fff', margin: 0 }}>
          What would you like to update?
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {cards.map(({ action, icon, title, description }) => (
          <button
            key={action}
            onClick={() => onSelect(action)}
            className="ufc-action-card"
          >
            <div style={{ fontSize: '2rem', marginBottom: 14 }}>{icon}</div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#c9a84c', marginBottom: 10 }}>
              {title}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.42)', lineHeight: 1.55, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
              {description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
