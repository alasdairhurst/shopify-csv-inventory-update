import {
	RM_LARGE_SHIPPING,
	RM_SMALL_SHIPPING
} from '../utils/constants';
import { Vendor, VendorWith } from './types';

const reydonInventoryHeaders = [
	'Product Name',
	'Code',
	'Quantity'
] as const;

export const reydonInventory: Vendor<'reydon-inventory', typeof reydonInventoryHeaders> = {
	name: 'reydon-inventory',
	importLabel: 'Reydon Inventory CSV',
	updateInventory: true,
	// implemented later
	getParsedBarcode: () => '',
	getSKU: item => item.Code.replace('\n', ''),
	getQuantity: item => +item.Quantity,
	useTitleForMatching: true,
	getTitle: item => item['Product Name'].replace(/\([^()]*\)/g, ''),
	expectedHeaders: reydonInventoryHeaders
};

const reydonProductHeaders = [
	'Sku_Code',
	'Product_Name',
	'Description',
	'Image_File',
	'Image_FTP',
	'Size',
	'Colour',
	'Brand',
	'VAT',
	'Barcode',
	'Trade',
	'SRP',
	'Weight_KG',
	'Length_CM',
	'Width_CM',
	'Height_CM',
	'Commodity_Code',
	'Easy_Store_Quantity',
	'COFO',
	'COFO_Code',
	'Product_Parent',
	'Date_First_Available',
	'Free_Stock',
	'Approx_Restock_Date_MMyy',
	'Can_Sell_In',
	'Cannot_Sell_In',
	'Product_Material',
	'Your_Price',
	'Currency',
	'Price_Updated'
] as const;

export const reydon = {
	name: 'reydon',
	importLabel: 'Reydon CSV',
	updateProducts: true,
	updateInventory: true,
	addProducts: true,
	useBarcodeForExclusiveMatching: true,
	useTitleForMatching: true,
	expectedHeaders: reydonProductHeaders,
	// implemented later
	getParsedBarcode: () => '',
	getTitle: item => item.Product_Name,
	getDescription: item => item.Description,
	getVendor: item => item.Brand,
	getSKU: item => item.Sku_Code.replace('\n', ''),
	getMainImageURL: item => item['Image_FTP'],
	getVariantImageURL: item => item['Image_FTP'],
	getQuantity: item => +item.Free_Stock,
	getVAT: (item): number => 1 + (Number(item.VAT) / 100),
	getTaxable: (item): boolean => reydon.getVAT(item) > 1,
	getRRP: (item): number => reydon.getPrice(item) * 1.2,
	getShipping: (item): number => {
		if (Math.max(+item.Width_CM, +item.Length_CM, +item.Height_CM) > 120) {
			return RM_LARGE_SHIPPING;
		} else if (reydon.getWeight(item) > 15) {
			return RM_LARGE_SHIPPING;
		}
		return RM_SMALL_SHIPPING;
	},
	getPrice: (item): number => {
		// your price + profit + vat + shipping
		return +item.Your_Price * 1.45 * reydon.getVAT(item) + reydon.getShipping(item);
	},
	getWeight: (item): number => +item.Weight_KG,
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
	getBarcode: item => item.Barcode,
	getVariantCorrelationId: item => item.Product_Name,
	orderBy: item => item.Product_Name,
} satisfies Vendor<'reydon', typeof reydonProductHeaders>;
