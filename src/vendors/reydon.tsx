import {
	Vendor,
	RM_LARGE_SHIPPING,
	RM_SMALL_SHIPPING
} from './helpers';

export const reydonInventory: Vendor = {
	name: 'reydon-inventory',
	importLabel: 'Reydon Inventory CSV',
	updateInventory: true,
	getSKU: item => item.Code.replace('\n', ''),
	getQuantity: item => +item.Quantity,
	useTitleForMatching: true,
	getTitle: item => item['Product Name'].replace(/\([^()]*\)/g, ''),
	expectedHeaders: ['Product Name', 'Code', 'Quantity']
};

export const reydon: Vendor = {
	name: 'reydon',
	importLabel: 'Reydon CSV',
	updateProducts: true,
	updateInventory: true,
	addProducts: true,
	useBarcodeForExclusiveMatching: true,
	useTitleForMatching: true,
	expectedHeaders: ['Sku_Code','Product_Name','Description','Image_File','Image_FTP','Size','Colour','Brand','VAT','Barcode','Trade','SRP','Weight_KG','Length_CM','Width_CM','Height_CM','Commodity_Code','Easy_Store_Quantity','COFO','COFO_Code','Product_Parent','Date_First_Available','Free_Stock','Approx_Restock_Date_MMyy','Can_Sell_In','Cannot_Sell_In','Product_Material','Your_Price','Currency','Price_Updated'],
	getTitle: item => item.Product_Name,
	getDescription: item => item.Description,
	getVendor: item => item.Brand,
	getSKU: item => item.Sku_Code.replace('\n', ''),
	getMainImageURL: item => item['Image_FTP'],
	getVariantImageURL: item => item['Image_FTP'],
	getQuantity: item => +item.Free_Stock,
	getTaxable: item => +item.VAT > 0,
	getRRP: (item, vendor) => vendor.getPrice!(item) * 1.2,
	getPrice: item => {
		let shipping = RM_SMALL_SHIPPING;
		if (Math.max(item.Width_CM, item.Length_CM, item.Height_CM) >= 110) {
			shipping = RM_LARGE_SHIPPING;
		}
		// your price + profit + vat + shipping
		return +item.Your_Price * 1.45 * (1 + (+item.VAT / 100)) + shipping
	},
	getWeight: item => +item.Weight_KG,
	getVariants: item => {
		const variants = [];
		if (item.Colour) {
			variants.push({
				name: 'Colour',
				value: item.Colour
			});
		}
		if (item.Size) {
			variants.push({
				name: 'Size',
				value: item.Size
			});
		}
		return variants;
	},
	// getTags: item => [],
	getBarcode: item => item.Barcode,
	getParent: item => item.parent,
	getVariantCorrelationId: item => item.Product_Name,
	orderBy: item => item.Product_Name,
};