import { Vendor } from './vendor.ts';
import { Unicorn } from './unicorn.ts';
import { Blitz } from './blitz.ts';
import { Cartasport, CartasportInventory } from './cartasport.ts';
import { Reydon, ReydonInventory } from './reydon.ts';
import { ShopifyInventory, Shopify } from './shopify.ts';
import { Tuf, TufInventory } from './tuf.ts';

export type { Vendor, Product } from './vendor.ts';

// FIXME: can we avoid unknown? - maybe when moving the various bits onto one product interface
export const vendors: Vendor[] = [
	new Blitz() as unknown as Vendor,
	new Cartasport() as unknown as Vendor,
	new CartasportInventory() as unknown as Vendor,
	new Reydon() as unknown as Vendor,
	new ReydonInventory() as unknown as Vendor,
	new Unicorn() as unknown as Vendor,
	new Tuf() as unknown as Vendor,
	new TufInventory() as unknown as Vendor
];

export const shopifyVendor = new Shopify();
export const shopifyInventoryVendor = new ShopifyInventory();
