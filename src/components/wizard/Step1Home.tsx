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
      <div className="mb-10">
        <h2 className="text-3xl font-bold mb-3">What would you like to update?</h2>
        <p className="text-gray-400 max-w-lg">
          Choose an operation below. You'll be guided through selecting your vendor and uploading the files needed.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(({ action, icon, title, description }) => (
          <button
            key={action}
            onClick={() => onSelect(action)}
            className="text-left bg-[#1e2127] border border-[#3a3f4b] rounded-xl p-6 hover:border-cyan-400 transition-colors cursor-pointer focus:outline-none focus:border-cyan-400 group"
          >
            <div className="text-3xl mb-4">{icon}</div>
            <div className="text-base font-semibold mb-2 group-hover:text-cyan-400 transition-colors">{title}</div>
            <div className="text-sm text-gray-400 leading-relaxed">{description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
