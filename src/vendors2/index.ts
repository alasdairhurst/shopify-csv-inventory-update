import { Vendor } from './vendor';
import { Unicorn, UnicornProduct } from './unicorn';

export { Vendor } from './vendor';

// Define the vendors /////

export const vendors = {
  Unicorn: new Unicorn()
} as const;

export type VendorProductMap = {
  Unicorn: UnicornProduct;
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
  fn: <K extends VendorKey>(key: K, v: TypedVendorMap[K]) => void | Promise<void>
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
  fn: <K extends VendorKey>(key: K, v: TypedVendorMap[K]) => void
) {
	const keys = Object.keys(vendors) as K[];
  // keys.forEach((key) => {
  //   fn(key, vendors[key]);
  // });

	for (const key of keys) {
    fn(key, vendors[key]);
  }
}

