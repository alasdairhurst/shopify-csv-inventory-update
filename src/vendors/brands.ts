import type { Brand } from './brand.ts';
import type { WizardAction } from '../components/wizard/types.ts';
import { blitzBrand } from './blitz.ts';
import { cartasportBrand } from './cartasport.ts';
import { mtbBrand } from './mtb.ts';
import { reydonBrand } from './reydon.ts';
import { unicornBrand } from './unicorn.ts';
import { tufBrand } from './tuf.ts';

export type { Brand };
export type { BrandIcon } from './brand.ts';

export const brands: Brand[] = [
	blitzBrand,
	cartasportBrand,
	mtbBrand,
	reydonBrand,
	unicornBrand,
	tufBrand,
];

export function brandsForAction(action: WizardAction): Brand[] {
	return brands.filter(b => b.vendorFor[action] !== undefined);
}
