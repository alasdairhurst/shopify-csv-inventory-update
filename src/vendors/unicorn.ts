import { Vendor, Product, InventoryUpdatable } from './vendor.ts';
import type { Brand } from './brand.ts';

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
	getSKU = (product: UnicornProduct) => product.SKU.replaceAll(/["\n]/g, '');
	getQuantity = (product: UnicornProduct) => Number(product.QTY);
	getBarcode = (product: UnicornProduct) => this._parseBarcode(product, product['Barcode EAN/UPC']);
	getTitle = (product: UnicornProduct) => product.Description;
};

export const unicornBrand: Brand = {
	id: 'unicorn',
	name: 'Unicorn',
	icon: {
		url: 'https://unicorn.playwiththebest.com/media/logo/stores/6/unicorn_tagline.png',
		size: 'large' as const
	},
	fileInfo: {
		inventory: { label: 'Unicorn CSV', description: 'The Unicorn product export. Contains SKU and QTY stock quantity columns.' },
	},
	vendorFor: {
		inventory: () => new Unicorn(),
	},
};
