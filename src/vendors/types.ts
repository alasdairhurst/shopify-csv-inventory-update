
import { PARENT_SYMBOL } from '../utils/constants';
import { RequireKeys } from '../utils/object';

// Item that references itself via optional parent symbol
interface WithParent { [PARENT_SYMBOL]?: this }

// Item with string value keys of the provided values
export type CSVItem<Keys extends readonly string[]>
	= Record<Keys[number], string> & WithParent;

type VendorFields<
	Name extends string,
	Keys extends readonly string[],
	Extended extends Object
> = {
	parseImport?: (items: CSVItem<Keys>[]) => (CSVItem<Keys> & Extended)[];
	name: Name;
	updateInventory: boolean;
	getParsedBarcode: (item: CSVItem<Keys>) => string;
	getSKU: (item: CSVItem<Keys> & Extended) => any;
	getQuantity: (item: CSVItem<Keys> & Extended) => number;
	getTitle: (item: CSVItem<Keys> & Extended) => any;
	expectedHeaders: Keys;
	htmlDecode?: boolean;
	importLabel: string;
	updateProducts?: boolean;
	addProducts?: boolean;
	useTitleForMatching?: boolean;
	useBarcodeForExclusiveMatching?: boolean;
	getBarcode?: (item: CSVItem<Keys> & Extended) => any;
	getPrice?: (item: CSVItem<Keys> & Extended) => number;
	getRRP?: (item: CSVItem<Keys> & Extended) => number;
	getMainImageURL?: (item: CSVItem<Keys> & Extended) => string;
	getVariantImageURL?: (item: CSVItem<Keys> & Extended) => string;
	getAdditionalImages?: (item: CSVItem<Keys> & Extended) => string[];
	getTaxable?: (item: CSVItem<Keys> & Extended) => boolean;
	getVariantCorrelationId?: (item: CSVItem<Keys> & Extended) => string;
	getFeatures?: (item: CSVItem<Keys> & Extended) => string[];
	getWeight?: (item: CSVItem<Keys> & Extended) => number;
	getType?: (item: CSVItem<Keys> & Extended) => string;
	getVendor?: (item: CSVItem<Keys> & Extended) => string;
	getDescription?: (item: CSVItem<Keys> & Extended) => string;
	getVariants?: (item: CSVItem<Keys> & Extended) => { name: string, value: string }[];
	getShipping?: (item: CSVItem<Keys> & Extended) => number;
	getVAT?: (item: CSVItem<Keys> & Extended) => number;
	orderBy?: (item: CSVItem<Keys> & Extended) => string;
	// Array of SKUs to skip, TODO: do this nicer
	deny?: string[],
};

export type Vendor<
	Name extends string,
	Keys extends readonly string[],
	Extended extends Object = {}
> = (
	VendorFields<Name, Keys, Extended> & {
		addProducts?: false
	}
) | (
		VendorFields<Name, Keys, Extended> & {
			addProducts: true;
			// bananas: true;
		}
	)

export type VendorWith<
	Name extends string,
	Keys extends readonly string[],
	RequiredParams extends keyof Vendor<Name, Keys>,
	Extended extends Object = {}
> = RequireKeys<Vendor<Name, Keys, Extended>, RequiredParams>;
