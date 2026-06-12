import { Vendor, Product, InventoryUpdatable } from './vendor.ts';

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
export class Unicorn extends Vendor<UnicornProduct> implements InventoryUpdatable<UnicornProduct> {
	name = 'unicorn';
	importLabel = 'Unicorn CSV';
	updateInventory = true;
	useTitleForMatching = true;
	useBarcodeForExclusiveMatching = true;
	expectedHeaders = [
		'SKU',
		'Description',
		'QTY',
		'Unit Of Measure',
		'Barcode EAN/UPC',
		'Material Group',
		'Brand',
		'URL'
	];
	getSKU = (product: UnicornProduct) => product.SKU;
	getQuantity = (product: UnicornProduct) => Number(product.QTY);
	getBarcode = (product: UnicornProduct) => product['Barcode EAN/UPC'];
	getTitle = (product: UnicornProduct) => product.Description;
};
