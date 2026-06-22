import { RM_SMALL_SHIPPING } from '../utils/constants.ts';
import { roundPrice } from '../utils/helpers.ts';
import { intRange } from '../utils/number.ts';
import { Vendor, Product, InventoryUpdatable, ProductAddable } from './vendor.ts';
import type { Brand } from './brand.ts';

export type CartasportProduct = Product & {
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

export class Cartasport extends Vendor<CartasportProduct> implements ProductAddable<CartasportProduct> {
	// backwards compatibility for handle
	name = 'cartas';
	importLabel = 'Cartasport Products CSV';
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
	getBasePrice = (product: CartasportProduct) => {
		return Number(product.TRADE_PRICE) * 1.45 * this.getVAT(product);
	};
	shouldNotIgnore = (product: CartasportProduct) => product.STATUS === 'LIVE';
	getSKU = (product: CartasportProduct) => product.CODE;
	getWeightGrams = (product: CartasportProduct) => Number(product.WEIGHT);
	getQuantity = (product: CartasportProduct) => Math.max(0, Math.min(Number(product.STOCK), 50));
	getType = (product: CartasportProduct) => product.CATEGORY.replace(product.BRAND.toUpperCase(), '').replace(/-/g, '');
	getBarcode = (product: CartasportProduct) => this._parseBarcode(product, product.EAN);
	getShipping = (_product: CartasportProduct) => RM_SMALL_SHIPPING;
	getPrice = (product: CartasportProduct) => {
		return roundPrice((this.getBasePrice(product) * 0.9) + this.getShipping(product));
	};
	getRRP = (product: CartasportProduct) => {
		return roundPrice((this.getBasePrice(product) + this.getShipping(product)) * 1.2);
	};
	getVAT = (product: CartasportProduct) => {
		const VATpc = Number(product.VAT.replace('%', ''));
		const VAT = (VATpc / 100) + 1;
		return VAT;
	};
	getTaxable = (product: CartasportProduct) => this.getVAT(product) > 1;
	getVendor = (product: CartasportProduct) => product.BRAND;
	getDescription = (product: CartasportProduct) => product.DESCRIPTION.replace(/^'/, '').replace(/'$/, '');
	getMainImageURL = (product: CartasportProduct) => product.MAIN_IMAGE;
	getVariantImageURL = (product: CartasportProduct) => product.MAIN_IMAGE;
	getTitle = (product: CartasportProduct) => product.PRODUCT_NAME;
	getAdditionalImages = (product: CartasportProduct) => {
		const images = [];
		for (const i of intRange(1, 4)) {
			const image = product[`IMAGE_${i}`];
			if (image) {
				images.push(image);
			}

		}
		return images;
	};
	getVariants = (product: CartasportProduct) => {
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
	getVariantCorrelationId = (product: CartasportProduct) => product.PERANT_ID
};

export type CartasportInventoryProduct = Product & {
	PRODUCT_ID: string;
	PARENT_CODE: string;
	PRODUCT_NAME: string;
	OPTION_NAME: string;
	SIZE: string;
	CHILD_CODE: string;
	QUANTITY: string;
	LIST_PRICE: string;
};

export class CartasportInventory extends Vendor<CartasportInventoryProduct> implements InventoryUpdatable<CartasportInventoryProduct> {
	name = 'cartasport-inventory';
	importLabel = 'Cartasport Inventory CSV';
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
	getSKU = (product: CartasportInventoryProduct) => product.CHILD_CODE;
	getQuantity = (product: CartasportInventoryProduct) => Math.min(Number(product.QUANTITY), 50);
	getTitle = (product: CartasportInventoryProduct) => product.PRODUCT_NAME;
};

export const cartasportBrand: Brand = {
	id: 'cartasport',
	name: 'Cartasport',
	icon: {
		url: 'https://cartasport.co.uk/online/image/catalog/Logo2023.png',
		size: 'large' as const
	},
	fileInfo: {
		inventory:    { label: 'Cartasport Inventory CSV', description: 'The Cartasport inventory export. Contains CHILD_CODE and stock quantity columns.' },
		addProducts:  { label: 'Cartasport Products CSV', description: 'The Cartasport full product export. Requires STATUS, TradePrice, and variant columns.' },
		editProducts: { label: 'Cartasport Products CSV', description: 'The Cartasport full product export. Prices and images will be updated in Shopify.' },
	},
	vendorFor: {
		inventory:    () => new CartasportInventory(),
		addProducts:  () => new Cartasport(),
		editProducts: () => new Cartasport(),
	},
};
