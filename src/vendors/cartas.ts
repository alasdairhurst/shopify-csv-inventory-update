import { RM_SMALL_SHIPPING } from '../utils/constants.ts';
import { roundPrice } from '../utils/helpers.ts';
import { intRange } from '../utils/number.ts';
import { Vendor, Product, InventoryUpdatable, ProductAddable } from './vendor.ts';

export type CartasProduct = Product & {
	STATUS: string;
	CODE: string;
	WEIGHT: string;
	STOCK: string;
	CATEGORY: string;
	BRAND: string;
	EAN: string;
	VAT: string;
	TRADE_PRICE: string;
	DESCRIPTION: string;
	MAIN_IMAGE: string;
	PRODUCT_NAME: string;
	IMAGE_1: string;
	IMAGE_2: string;
	IMAGE_3: string;
	IMAGE_4: string;
	SIZE: string;
	COLOUR: string;
	PERANT_ID: string;
	LENGTH: string;
	WIDTH: string;
	HEIGHT: string;
};

export class Cartas extends Vendor<CartasProduct> implements ProductAddable<CartasProduct> {
	name = 'cartas';
	importLabel = 'Cartas Products CSV';
	useTitleForMatching = true;
	expectedHeaders = [
		'STATUS',
		'CODE',
		'WEIGHT',
		'STOCK',
		'CATEGORY',
		'BRAND',
		'EAN',
		'VAT',
		'TRADE_PRICE',
		'DESCRIPTION',
		'MAIN_IMAGE',
		'PRODUCT_NAME',
		'IMAGE_1',
		'IMAGE_2',
		'IMAGE_3',
		'IMAGE_4',
		'SIZE',
		'COLOUR',
		'PERANT_ID',
		'LENGTH',
		'WIDTH',
		'HEIGHT'
	];
	getBasePrice = (product: CartasProduct) => {
		return Number(product.TRADE_PRICE) * 1.45 * this.getVAT(product);
	};
	// FIXME: either support undefined or filter it out in the parser
	getSKU = (product: CartasProduct) => product.STATUS === 'LIVE' ? product.CODE : undefined;
	// TODO trim everything during import
	getWeightGrams = (product: CartasProduct) => Number(product.WEIGHT);
	getQuantity = (product: CartasProduct) => Math.min(Number(product.STOCK), 50);
	getType = (product: CartasProduct) => product.CATEGORY.replace(product.BRAND.toUpperCase(), '').replace(/-/g, '');
	getBarcode = (product: CartasProduct) => this._parseBarcode(product, product.EAN);
	getShipping = (_product: CartasProduct) => RM_SMALL_SHIPPING;
	getPrice = (product: CartasProduct) => {
		return roundPrice((this.getBasePrice(product) * 0.9) + this.getShipping(product));
	};
	getRRP = (product: CartasProduct) => {
		return roundPrice((this.getBasePrice(product) + this.getShipping(product)) * 1.2);
	};
	getVAT = (product: CartasProduct) => {
		const VATpc = Number(product.VAT.replace('%', ''));
		const VAT = (VATpc / 100) + 1;
		return VAT;
	};
	getTaxable = (product: CartasProduct) => this.getVAT(product) > 1;
	getVendor = (product: CartasProduct) => product.BRAND;
	getDescription = (product: CartasProduct) => product.DESCRIPTION.replace(/^'/, '').replace(/'$/, '');
	getMainImageURL = (product: CartasProduct) => product.MAIN_IMAGE;
	getVariantImageURL = (product: CartasProduct) => product.MAIN_IMAGE;
	getTitle = (product: CartasProduct) => product.PRODUCT_NAME;
	getAdditionalImages = (product: CartasProduct) => {
		const images = [];
		for (const i of intRange(1, 4)) {
			const image = product[`IMAGE_${i}`];
			if (image) {
				images.push(image);
			}

		}
		return images;
	};
	getVariants = (product: CartasProduct) => {
		const variants = [];
		const size = product.SIZE;
		const colour = product.COLOUR;
		if (colour) {
			variants.push({
				name: 'Colour',
				value: colour
			});
		}
		if (size) {
			variants.push({
				name: 'Size',
				value: size
			});
		}
		return variants;
	};
	getVariantCorrelationId = (product: CartasProduct) => product.PERANT_ID
};

export type CartasInventoryProduct = Product & {
	PRODUCT_ID: string;
	PARENT_CODE: string;
	PRODUCT_NAME: string;
	OPTION_NAME: string;
	SIZE: string;
	CHILD_CODE: string;
	QUANTITY: string;
	LIST_PRICE: string;
};

export class CartasInventory extends Vendor<CartasInventoryProduct> implements InventoryUpdatable<CartasInventoryProduct> {
	name = 'cartas-inventory';
	importLabel = 'Cartas Inventory CSV';
	useTitleForMatching = true;
	expectedHeaders = [
		'PRODUCT_ID',
		'PARENT_CODE',
		'PRODUCT_NAME',
		'OPTION_NAME',
		'SIZE',
		'CHILD_CODE',
		'QUANTITY',
		'LIST_PRICE'
	];
	getSKU = (product: CartasInventoryProduct) => product.CHILD_CODE;
	getQuantity = (product: CartasInventoryProduct) => Math.min(Number(product.QUANTITY), 50);
	getTitle = (product: CartasInventoryProduct) => product.PRODUCT_NAME;
};
