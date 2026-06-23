import { PARENT_SYMBOL } from '../utils/constants.ts';
import { parseBarcode } from '../utils/helpers.ts';

interface WithParent { [PARENT_SYMBOL]?: this }
export type Product = WithParent;

// Ensures all necesarry fields are provided when implementing a class
export interface InventoryUpdatable<P extends Product> {
  getQuantity: (product: P) => number;
}

export interface ProductAddable<P extends Product> {
  getTitle: (product: P) => string;
  getPrice: (product: P) => number;
	getDescription: (product: P) => string;
	getVendor: (product: P) => string;
	getMainImageURL: (product: P) => string;
	getQuantity: (product: P) => number;
	getBarcode: (product: P) => string;
}

export type ProductOf<V> = V extends Vendor<infer P> ? P : never;

export abstract class Vendor<P extends Product = Product> {
	// required
	abstract name: string; // Can this be dropped if we rely on key?
	abstract importLabel: string;
	abstract expectedHeaders: string[];
	abstract getSKU: (product: P) => string;

	// optional
	useTitleForMatching?: boolean;
	useBarcodeForExclusiveMatching?: boolean;
	// Appends the following headers to the CSV in case they are missing
	forceHeaders?: string[];
	// Fills in headers where the column name is missing in order of found empty header
	forceEmptyHeaders?: string[];
	htmlDecode?: boolean;

	shouldNotIgnore?: (product: P) => boolean;
	getQuantity?: (product: P) => number;
  getTitle?: (product: P) => string;
  getBarcode?: (product: P) => string;
  getPrice?: (product: P) => number;
	getMainImageURL?: (product: P) => string;
	getVariantImageURL?: (product: P) => string;
	getAdditionalImages?: (product: P) => string[];
	getFeatures?: (product: P) => string[];
	getDescription?: (product: P) => string;
	getVendor?: (product: P) => string;
	getType?: (product: P) => string;
	getRRP?: (product: P) => number;
	// VAT multiplier: i.e. 1.2 for 20%
	getVAT?: (product: P) => number;
	getTaxable?: (product: P) => boolean;
	getWeightGrams?: (product: P) => number;
	getVariants?: (product: P) => { name: string, value: string }[];
	orderBy?: (product: P) => string;
	parseImport?: (product: P[]) => P[];
	getVariantCorrelationId?: (product: P) => string;

	urlConfig: { defaultURL?: string; supportsFile: boolean; supportsURL: boolean }
		= { supportsFile: true, supportsURL: true };

	_parsedBarcodes: Record<string, string|undefined> = {}

	// base functionality

	// TODO: replace this somewhere so there's just one getBarcode function
	_parseBarcode(product: P, barcode: string) {
		const sku = this.getSKU(product);
		if (!this._parsedBarcodes[sku]) {
			this._parsedBarcodes[sku] = parseBarcode(barcode);
		}
		return this._parsedBarcodes[sku];
	}

	// Performs type narrowing at runtime
  canUpdateInventory(): this is this & InventoryUpdatable<P> {
    return this.getQuantity !== undefined;
  }

  canAddProducts(): this is this & ProductAddable<P> {
    return this.getTitle !== undefined && this.getPrice !== undefined;
  }
}