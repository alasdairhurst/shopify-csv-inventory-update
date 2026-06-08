import { Vendor } from './types';

const unicornHeaders = [
	'SKU',
	'Description',
	'QTY',
	'Unit Of Measure',
	'Barcode EAN/UPC',
	'Material Group',
	'Brand',
	'URL'
] as const;

export const unicorn = {
	name: 'unicorn',
	importLabel: 'Unicorn CSV',
	updateInventory: true,
	updateProducts: true,
	useTitleForMatching: true,
	useBarcodeForExclusiveMatching: true,
	expectedHeaders: unicornHeaders,
	// implemented later
	getParsedBarcode: () => '',
	getSKU: item => item.SKU,
	getQuantity: item => Number(item.QTY),
	getBarcode: item => item['Barcode EAN/UPC'],
	getTitle: item => item.Description
} satisfies Vendor<'unicorn', typeof unicornHeaders>;