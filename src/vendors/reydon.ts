import { RM_LARGE_SHIPPING, RM_SMALL_SHIPPING } from '../utils/constants.ts';
import { roundPrice } from '../utils/helpers.ts';
import { InventoryUpdatable, Product, ProductAddable, Vendor } from './vendor.ts';
import type { Brand } from './brand.ts';

const MAX_DIMENTIONS_FOR_SMALL_SHIPPING = 120;
const MAX_WEIGHT_FOR_SMALL_SHIPPING = 1500;

export type ReydonProduct = Product & {
	Sku_Code: string;
	Product_Name: string;
	Description: string;
	Image_File: string;
	Image_FTP: string;
	Size: string;
	Colour: string;
	Brand: string;
	VAT: string;
	Barcode: string;
	Trade: string;
	SRP: string;
	Weight_KG: string;
	Length_CM: string;
	Width_CM: string;
	Height_CM: string;
	Commodity_Code: string;
	Easy_Store_Quantity: string;
	COFO: string;
	COFO_Code: string;
	Product_Parent: string;
	Date_First_Available: string;
	Free_Stock: string;
	Approx_Restock_Date_MMyy: string;
	Can_Sell_In: string;
	Cannot_Sell_In: string;
	Product_Material: string;
	Your_Price: string;
	Currency: string;
	Price_Updated: string;
};

export class Reydon extends Vendor<ReydonProduct> implements ProductAddable<ReydonProduct>, InventoryUpdatable<ReydonProduct> {
	name = 'reydon';
	importLabel = 'Reydon CSV';
	useBarcodeForExclusiveMatching = true;
	useTitleForMatching = true;
	expectedHeaders = [
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
	];
	getTitle = (product: ReydonProduct) => product.Product_Name;
	getDescription = (product: ReydonProduct) => product.Description.replaceAll(/\s/g, ' ');
	getVendor = (product: ReydonProduct) => product.Brand;
	getSKU = (product: ReydonProduct) => product.Sku_Code.replace('\n', '');
	getMainImageURL = (product: ReydonProduct) => product['Image_FTP'];
	getVariantImageURL = (product: ReydonProduct) => product['Image_FTP'];
	getQuantity = (product: ReydonProduct) => +product.Free_Stock;
	getVAT = (product: ReydonProduct) => 1 + (Number(product.VAT) / 100);
	getTaxable = (product: ReydonProduct) => this.getVAT(product) > 1;
	// FIXME: is that 1.2 meant to be VAT?
	getRRP = (product: ReydonProduct) => roundPrice(this.getPrice(product) * 1.2);
	getShipping = (product: ReydonProduct) => {
		if (Math.max(Number(product.Width_CM), Number(product.Length_CM), Number(product.Height_CM)) > MAX_DIMENTIONS_FOR_SMALL_SHIPPING) {
			return RM_LARGE_SHIPPING;
		} else if (this.getWeightGrams(product) > MAX_WEIGHT_FOR_SMALL_SHIPPING) {
			return RM_LARGE_SHIPPING;
		}
		return RM_SMALL_SHIPPING;
	};
	getPrice = (product: ReydonProduct) => {
		const PROFIT = 1.45;
		return roundPrice(
			Number(product.Your_Price)
				* PROFIT
				* this.getVAT(product)
				+ this.getShipping(product)
		);
	};
	getWeightGrams = (product: ReydonProduct) => Number(product.Weight_KG) * 1000;
	getVariants = (product: ReydonProduct) => {
		const variants = [];
		if (product.Colour) {
			variants.push({
				name: 'Colour',
				value: product.Colour
			});
		}
		if (product.Size) {
			variants.push({
				name: 'Size',
				value: product.Size
			});
		}
		return variants;
	};
	getBarcode = (product: ReydonProduct) => this._parseBarcode(product, product.Barcode);
	getVariantCorrelationId = (product: ReydonProduct) => product.Product_Name;
	orderBy = (product: ReydonProduct)=> product.Product_Name;
};

export type ReydonInventoryProduct = Product & {
	['Product Name']: string;
	Code: string;
	Quantity: string
};

export class ReydonInventory extends Vendor<ReydonInventoryProduct> implements InventoryUpdatable<ReydonInventoryProduct> {
	name = 'reydon-inventory';
	importLabel = 'Reydon Inventory CSV';
	useTitleForMatching = true;
	expectedHeaders = [
		'Product Name',
		'Code',
		'Quantity'
	];
	getSKU = (product: ReydonInventoryProduct) => product.Code.replace('\n', '');
	getQuantity = (product: ReydonInventoryProduct) => Number(product.Quantity);
	// Reydon adds a lot of info to their inventory product names that don't
	// match their other CSV so trim them off to help the title matching
	getTitle = (product: ReydonInventoryProduct) => product['Product Name'].replace(/ *\([^()]*\)/g, '');
};

export const reydonBrand: Brand = {
	id: 'reydon',
	name: 'Reydon',
	icon: {
		url: 'https://reydon.com/web/image/website/1/logo/Reydon%20Group%20Plc?unique=2454795',
		size: 'large' as const
	},
	fileInfo: {
		inventory:    { label: 'Reydon Inventory CSV', description: 'The Reydon inventory export. Contains Code and Quantity columns.' },
		addProducts:  { label: 'Reydon Products CSV', description: 'The Reydon full product export. Requires Your_Price, barcode, and dimension columns.' },
		editProducts: { label: 'Reydon Products CSV', description: 'The Reydon full product export. Prices and images will be updated in Shopify.' },
	},
	vendorFor: {
		inventory:    () => new ReydonInventory(),
		addProducts:  () => new Reydon(),
		editProducts: () => new Reydon(),
	},
};