import { Vendor, Product, InventoryUpdatable } from './vendor';

export type UnicornProduct = Product & {
	SKU: string;
	Description: string;
	QTY: string;
	['Unit Of Measure']: string;
	['Barcode EAN/UPC']: string;
	['Material Group']: string;
	Brand: string;
	URL: string;
}

const unicornHeaders = [
	'SKU',
	'Description',
	'QTY',
	'Unit Of Measure',
	'Barcode EAN/UPC',
	'Material Group',
	'Brand',
	'URL'
];

export class Unicorn extends Vendor<UnicornProduct> implements InventoryUpdatable<UnicornProduct> {
	name = 'unicorn'
	importLabel = 'Unicorn CSV'
	updateInventory = true
	updateProducts = true
	useTitleForMatching = true
	useBarcodeForExclusiveMatching = true
	expectedHeaders = unicornHeaders
	getSKU = (item: UnicornProduct) => item.SKU
	getQuantity = (item: UnicornProduct) => Number(item.QTY)
	getBarcode = (item: UnicornProduct) => item['Barcode EAN/UPC']
	getTitle = (item: UnicornProduct) => item.Description
};
