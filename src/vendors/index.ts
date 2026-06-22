import { Vendor } from './vendor.ts';
import { Unicorn } from './unicorn.ts';
import { Blitz } from './blitz.ts';
import { Cartas, CartasInventory } from './cartas.ts';
import { Reydon, ReydonInventory } from './reydon.ts';
import { ShopifyInventory, Shopify } from './shopify.ts';
import { Tuf, TufInventory } from './tuf.ts';

export type { Vendor, Product } from './vendor.ts';

// FIXME: can we avoid unknown? - maybe when moving the various bits onto one product interface
export const vendors: Vendor[] = [
	new Blitz() as unknown as Vendor,
	new Cartas() as unknown as Vendor,
	new CartasInventory() as unknown as Vendor,
	new Reydon() as unknown as Vendor,
	new ReydonInventory() as unknown as Vendor,
	new Unicorn() as unknown as Vendor,
	new Tuf() as unknown as Vendor,
	new TufInventory() as unknown as Vendor
];

export const shopifyVendor = new Shopify();
export const shopifyInventoryVendor = new ShopifyInventory();
