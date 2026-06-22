import { brandsForAction } from '../../vendors/brands.ts';
import type { Brand } from '../../vendors/brand.ts';
import type { BrandIcon } from '../../vendors/brands.ts';
import type { WizardAction } from './types.ts';
import { ACTION_LABELS } from './types.ts';
import BackButton from './BackButton.tsx';

interface Props {
  action: WizardAction;
  onSelect: (brand: Brand) => void;
  onBack: () => void;
}

function isLargeIcon(icon: BrandIcon): icon is { url: string; size: 'large' } {
  return typeof icon === 'object' && icon.size === 'large';
}

function SmallBrandIcon({ brand }: { brand: Brand }) {
  if (typeof brand.icon === 'string') {
    return <span className="text-3xl">{brand.icon}</span>;
  }
  return <img src={brand.icon.url} alt={brand.name} className="w-10 h-10 object-contain" />;
}

const CARD_BASE = 'bg-[#1e2127] border border-[#3a3f4b] hover:border-cyan-400 transition-colors cursor-pointer focus:outline-none focus:border-cyan-400 group rounded-xl';

export default function Step2Vendor({ action, onSelect, onBack }: Props) {
  const available = brandsForAction(action);
  const { subtitle } = ACTION_LABELS[action];

  return (
    <div>
      <BackButton onClick={onBack} />
      <div className="mt-4 mb-8">
        <h2 className="text-2xl font-bold mb-2">Choose your vendor</h2>
        <p className="text-gray-400 text-sm">{subtitle}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {available.map(brand => {
          const { icon } = brand;

          if (isLargeIcon(icon)) {
            return (
              <button
                key={brand.id}
                onClick={() => onSelect(brand)}
                className={`text-left overflow-hidden ${CARD_BASE}`}
              >
                <div className="flex items-center justify-center p-5 bg-white/5 min-h-[88px]">
                  <img
                    src={icon.url}
                    alt={brand.name}
                    className="max-h-14 w-full object-contain"
                  />
                </div>
                <div className="px-4 py-2.5 text-sm font-semibold group-hover:text-cyan-400 transition-colors">
                  {brand.name}
                </div>
              </button>
            );
          }

          return (
            <button
              key={brand.id}
              onClick={() => onSelect(brand)}
              className={`text-left p-5 ${CARD_BASE}`}
            >
              <div className="mb-3">
                <SmallBrandIcon brand={brand} />
              </div>
              <div className="font-semibold group-hover:text-cyan-400 transition-colors">{brand.name}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
