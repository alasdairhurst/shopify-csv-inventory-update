const blitzShipping = {
	16098: 42,
	16829: 15.84,
	21891: 18,
	21892: 18,
	21893: 18,
	4021: 15.84,
	12836: 15.84,
	6371: 42
};

const vendors = [
	{
		name: "reydon",
		importLabel: "Reydon Stock CSV",
		updateInventory: true,
		getSKU: item => item.Code.replace('\n', ''),
		getQuantity: item => +item.Quantity,
		useTitleForMatching: true,
		getTitle: item => item['Product Name'].replace(/\([^()]*\)/g, '')
	},
	{
		name: "reydon-products",
		importLabel: "Reydon Products CSV",
		updateProducts: true,
		useBarcodeForExclusiveMatching: true,
		useTitleForMatching: true,
		getTitle: item => item.Product_Name,
		getSKU: item => item.Sku_Code.replace('\n', ''),
		getQuantity: item => +item.Free_Stock,
		getPrice: item => {
			let shipping = 3;
			if (Math.max(item.Width_CM, item.Length_CM, item.Height_CM) >= 110) {
				shipping = 10;
			}
			return Math.ceil(+item.Your_Price * 1.4 * (1 + (+item.VAT / 100)) + shipping) - 0.01
		},
		getBarcode: item => item.Barcode.trim(),
		"addMissing": true,
		"orderBy": "Product_Name",
		vendorQuantityKey: 'Free_Stock',
		
	},
	{
		"name": "cartas",
		"importLabel": "Cartas Inventory CSV",
		"headers": ["a", "b", "c", "d", "SKU", "Title", "f", "g", "Quantity", "h"],
		updateInventory: true,
		updateProducts: false,
		getSKU: item => item.SKU,
		getQuantity: item => +item.Quantity,
		useTitleForMatching: false,
		getTitle: item => item.Title
	},
	{
		"name": "cartas-products",
		"importLabel": "Cartas Products CSV",
		updateInventory: false,
		updateProducts: true,
		useBarcodeForExclusiveMatching: true,
		getSKU: item => item.stock_code.trim(),
		getQuantity: item => +item.quantity,
		getBarcode: item => item.ean.replace(/"/g, '').trim(),
		useTitleForMatching: false,
		getTitle: item => item.name
	},
	{
		name: "unicorn",
		importLabel: "Unicorn CSV",
		updateInventory: true,
		updateProducts: true,
		useBarcodeForExclusiveMatching: true,
		getSKU: item => item.SKU,
		getQuantity: item => +item.QTY,
		getBarcode: item => item['Barcode EAN/UPC'],
		useTitleForMatching: false,
		getTitle: item => item.Description
	},
	{
		"name": "muaythai",
		"importLabel": "Muay Thai Boxing CSV",
		updateInventory: true,
		updateProducts: true,
		useBarcodeForExclusiveMatching: true,
		getSKU: item => item.SKU,
		getBarcode: item => item.SKU,
		getQuantity: item => +item.Quantity,
		getTitle: item => item.Name,
		"SKUKey": "SKU",
		"quantityKey": "Quantity",
		"variantFormat": "multiline-mtb",
		"addMissing": true
	},
	{
		name: "blitz",
		importLabel: "Blitz CSV",
		updateInventory: true,
		updateProducts: true,
		useBarcodeForExclusiveMatching: true,
		getSKU: item => item.Sku,
		getQuantity: item => item.InStock === 'True' ? 25 : 0,
		getPrice: item => {
			const VAT = item.Taxable === 'True' ? 0.2 : 0;
			const shipping = blitzShipping[item.Sku] || 3;
			return Math.ceil(+item.TradePrice * 1.3 * (1+VAT) + shipping) - 0.01;
		},
		getTitle: item => item.Title,
		useTitleForMatching: true,
		getBarcode: item => item.Ean,
		"SKUKey": "Sku",
		"quantityKey": "InStock",
		"variantFormat": "blitz", 
		"addMissing": true
	}
];

export default vendors;