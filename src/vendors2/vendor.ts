import { PARENT_SYMBOL } from '../utils/constants';
import { parseBarcode } from '../utils/helpers';

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
}

export type ProductOf<V> = V extends Vendor<infer P> ? P : never;

export abstract class Vendor<P extends Product = Product> {
	// required
	abstract name: string; // Can this be dropped if we rely on key?
	abstract importLabel: string;
	abstract expectedHeaders: string[];

	abstract getSKU: (product: P) => string;
	// abstract getTitle: (product: P) => string;

	// optional
	updateInventory?: boolean;
	addProducts?: boolean;
	useTitleForMatching?: boolean;
	useBarcodeForExclusiveMatching?: boolean;
	forceHeaders?: string[];
	htmlDecode?: boolean;

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
	getTaxable?: (product: P) => boolean;
	// Should be in grams
	getWeight?: (product: P) => number;
	getVariants?: (product: P) => { name: string, value: string }[];
	orderBy?: (product: P) => string;
	parseImport?: (product: unknown[]) => P[];
	getVariantCorrelationId?: (product: P) => string;

	_parsedBarcodes: Record<string, string|undefined> = {}

	// base functionality

	// TODO: replace this somewhere so there's just one getBarcode function
	getParsedBarcode(product: P) {
		const sku = this.getSKU(product);
		if (this.getBarcode !== undefined && !(sku in this._parsedBarcodes)) {
			const barcode = this.getBarcode(product);
			this._parsedBarcodes[sku] = parseBarcode(barcode);
		}
		return this._parsedBarcodes[sku];
	}

	// Performs type narrowing at runtime
  canUpdateInventory(): this is this & InventoryUpdatable<P> {
    return 'getQuantity' in this;
  }

  canAddProducts(): this is this & ProductAddable<P> {
    return 'getTitle' in this && 'getPrice' in this;
  }
}