export const unicorn = {
	name: 'unicorn',
	importLabel: 'Unicorn CSV',
	updateInventory: true,
	updateProducts: true,
	useTitleForMatching: true,
	useBarcodeForExclusiveMatching: true,
	expectedHeaders: ['SKU', 'Description', 'QTY', 'Unit Of Measure', 'Barcode EAN/UPC', 'Material Group', 'Brand', 'URL'],
	getSKU: item => item.SKU,
	getQuantity: item => +item.QTY,
	getBarcode: item => item['Barcode EAN/UPC'],
	getTitle: item => item.Description
};