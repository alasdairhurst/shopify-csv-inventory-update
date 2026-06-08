import { reydon, reydonInventory } from './reydon';
import { cartas, cartasInventory } from './cartas';
import { unicorn } from './unicorn';
import { mtb } from './mtb';
import { blitz } from './blitz';
import { CSVItem, Vendor } from './types';

const vendors = [
	reydonInventory,
	reydon,
	cartasInventory,
	cartas,
	unicorn,
	mtb,
	blitz
] as const;

export type Vendors = typeof vendors[number];
export type VendorCSVItem<V> =
  V extends Vendor<infer _Name, infer Keys, infer Ext>
    ? CSVItem<Keys> & Ext
    : never;
export type VendorProducts = {
	[V in Vendors as V['name']]: VendorCSVItem<V>[]
}

export default vendors;