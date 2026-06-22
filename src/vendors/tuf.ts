import { roundPrice } from '../utils/helpers.ts';
import { intRange } from '../utils/number.ts';
import { Vendor, Product, InventoryUpdatable, ProductAddable } from './vendor.ts';

const parseQuantity = (product: TufInventoryProduct | TufProduct) => {
	const stock = product.STOCK;
	if (stock === '5+') {
		return 5;
	}
	return Number(stock);
};

export type TufProduct = Product & {
	LONGCODE: string;
	['PARENT CODE']: string;
	Name: string;
	SIZE: string;
	CARRIAGE: string; //
	SKU: string;
	STOCK: string;
	DESCRIPTION: string;
	Image1: string;
	Image2: string;
	Image3: string;
	Image4: string;
	RRP: string;
	Sell: string;
	Trade: string;
	Price1: string;
	Price2: string;
	MyPrice: string;
	Price: string;
	Discount: 'Y' | 'N';
};

export class Tuf extends Vendor<TufProduct> implements ProductAddable<TufProduct> {
	name = 'tuf';
	importLabel = 'Tuf Products CSV';
	expectedHeaders = [
		'LONGCODE',
		'PARENT CODE',
		'Name',
		'SIZE',
		'CARRIAGE',
		'SKU',
		'STOCK',
		'DESCRIPTION',
		'Image1',
		'Image2',
		'Image3',
		'Image4',
		'RRP',
		'Sell',
		'Trade',
		'Price1',
		'Price2',
		'MyPrice',
		'Price',
		'Discount'
	];
	// getBasePrice = (product: TufProduct) => {
	// 	return Number(product.TRADE_PRICE) * 1.45 * this.getVAT(product);
	// };
	getSKU = (product: TufProduct) => product.LONGCODE;
	getQuantity = parseQuantity;
	getBarcode = (product: TufProduct) => this._parseBarcode(product, product.SKU);
	getShipping = (product: TufProduct) => Number(product.CARRIAGE);
	getVAT = (_product: TufProduct) => 1.2;
	getDiscount = (product: TufProduct) => {
		// 15% discount on some products
		return product.Discount === 'Y' ? 0.85 : 1;
	}
	getPrice = (product: TufProduct) => {
		const profit = 1.45;
		// (myPrice - discount) + profit + VAT + shipping
		return roundPrice((Number(product.MyPrice) * this.getDiscount(product)) * profit * this.getVAT(product) + this.getShipping(product));
	};
	getRRP = (product: TufProduct) => {
		return roundPrice(Number(product.RRP));
	};
	getVendor = (_product: TufProduct) => 'Tuf Wear';
	getDescription = (product: TufProduct) => product.DESCRIPTION;
	getMainImageURL = (product: TufProduct) => product.Image1;
	getVariantImageURL = (product: TufProduct) => product.Image1;
	getTitle = (product: TufProduct) => product.Name;
	getAdditionalImages = (product: TufProduct) => {
		const images = [];
		for (const i of intRange(2, 4)) {
			const image = product[`Image${i}`];
			if (image) {
				images.push(image);
			}

		}
		return images;
	};
	getVariants = (product: TufProduct) => {
		return [{
			name: 'Size',
			value: product.SIZE
		}];
	};
	getVariantCorrelationId = (product: TufProduct) => product['PARENT CODE']
};

const tufHeaders = [
	'LONGCODE',
	'PARENT CODE',
	'Name',
	'SIZE',
	'SKU',
	'STOCK',
	'DESCRIPTION',
	'Image1',
	'Image2',
	'Image3',
	'Image4',
	'RRP',
	'Sell',
	'Trade',
	'Discount'
];

export type TufInventoryProduct = Product & {
	LONGCODE: string;
	['PARENT CODE']: string;
	Name: string;
	SIZE: string;
	SKU: string;
	STOCK: string;
	DESCRIPTION: string;
	Image1: string;
	Image2: string;
	Image3: string;
	Image4: string;
	RRP: string;
	Sell: string;
	Trade: string;
	Discount: 'Y' | 'N';
};

export class TufInventory extends Vendor<TufInventoryProduct> implements InventoryUpdatable<TufInventoryProduct> {
	name = 'tuf-inventory';
	importLabel = 'Tuf Inventory CSV';
	expectedHeaders = tufHeaders;
	forceHeaders = tufHeaders;
	getSKU = (product: TufInventoryProduct) => product.LONGCODE;
	getQuantity = parseQuantity;
	getTitle = (product: TufInventoryProduct) => product.Name;
};
