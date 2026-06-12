import { RM_LARGE_SHIPPING, RM_SMALL_SHIPPING } from '../utils/constants.ts';
import { InventoryUpdatable, Product, ProductAddable, Vendor } from './vendor.ts';

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
	getDescription = (product: ReydonProduct) => product.Description;
	getVendor = (product: ReydonProduct) => product.Brand;
	getSKU = (product: ReydonProduct) => product.Sku_Code.replace('\n', '');
	getMainImageURL = (product: ReydonProduct) => product['Image_FTP'];
	getVariantImageURL = (product: ReydonProduct) => product['Image_FTP'];
	getQuantity = (product: ReydonProduct) => +product.Free_Stock;
	getVAT = (product: ReydonProduct) => 1 + (Number(product) / 100);
	getTaxable = (product: ReydonProduct) => this.getVAT(product) > 1;
	getRRP = (product: ReydonProduct) => this.getPrice(product) * 1.2;
	getShipping = (product: ReydonProduct) => {
		if (Math.max(Number(product.Width_CM), Number(product.Length_CM), Number(product.Height_CM)) > 120) {
			return RM_LARGE_SHIPPING;
		} else if (this.getWeight(product) > 15) {
			return RM_LARGE_SHIPPING;
		}
		return RM_SMALL_SHIPPING;
	};
	getPrice = (product: ReydonProduct) => {
		// your price + profit + vat + shipping
		return Number(product.Your_Price) * 1.45 * this.getVAT(product) + this.getShipping(product);
	};
	getWeight = (product: ReydonProduct) => +product.Weight_KG;
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
	getBarcode = (product: ReydonProduct) => product.Barcode;
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
	getTitle = (product: ReydonInventoryProduct) => product['Product Name'].replace(/\([^()]*\)/g, '');
};