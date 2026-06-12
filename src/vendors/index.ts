import { Vendor } from './vendor.ts';
import { Unicorn, UnicornProduct } from './unicorn.ts';
import { Blitz, BlitzProduct } from './blitz.ts';
import { Cartas, CartasProduct, CartasInventory, CartasInventoryProduct } from './cartas.ts';
import { Reydon, ReydonProduct, ReydonInventory, ReydonInventoryProduct } from './reydon.ts';
import { ShopifyInventory, Shopify } from './shopify.ts';

export { Vendor } from './vendor.ts';

// Define the vendors /////

// FIXME: this doesn't work when defining more than one
export const vendors = {
  Unicorn: new Unicorn(),
	// Blitz: new Blitz(),
	// Cartas: new Cartas(),
	// CartasInventory: new CartasInventory()
} as const;

export const shopifyVendor = new Shopify();
export const shopifyInventoryVendor = new ShopifyInventory();

// TODO: can i avoid having to do this and imply from vendors type?
type VendorProductMap = {
  Unicorn: UnicornProduct;
	// Blitz: BlitzProduct;
	// Cartas: CartasProduct;
	// CartasInventory: CartasInventoryProduct;
};

//////////////////////////

type VendorKey = keyof typeof vendors;

type TypedVendorMap = {
  [K in VendorKey]: Vendor<VendorProductMap[K]>;
};

export type VendorProducts = {
  [K in VendorKey]?: VendorProductMap[K][];
};

export async function forEachVendorAsync<K extends VendorKey>(
  fn: <K extends VendorKey>(key: K, vendor: TypedVendorMap[K]) => void | Promise<void>
) {
	const keys = Object.keys(vendors) as K[];
  // keys.forEach((key) => {
  //   fn(key, vendors[key]);
  // });

	for (const key of keys) {
    await fn(key, vendors[key]);
  }
}

export async function forEachVendor<K extends VendorKey>(
  fn: <K extends VendorKey>(key: VendorKey, vendor: TypedVendorMap[K]) => void
) {
	const keys = Object.keys(vendors) as K[];
  // keys.forEach((key) => {
  //   fn(key, vendors[key]);
  // });

	for (const key of keys) {
    fn(key, vendors[key]);
  }
}

