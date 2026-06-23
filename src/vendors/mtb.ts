import { RM_SMALL_SHIPPING } from '../utils/constants.ts';
import { roundPrice } from '../utils/helpers.ts';
import { InventoryUpdatable, Product, ProductAddable, Vendor } from './vendor.ts';
import type { Brand } from './brand.ts';

const RM_LARGE_SHIPPING_MTB = 25;

export type MTBProduct = Product & {
	['Variant SKU']: string;
	['Variant Barcode']: string;
	['Variant Inventory Qty']: string;
	Title: string;
	Vendor: string;
	['Variant Weight']: string;
	['Variant Taxable']: string;
	['Variant Price']: string;
	['Body HTML']: string;
	['Image Src']: string;
	['Option1 Name']: string;
	['Option1 Value']: string;
	Handle: string;
	// Additional
	_additionalImages?: string[];
};

export class MTB extends Vendor<MTBProduct> implements ProductAddable<MTBProduct>, InventoryUpdatable<MTBProduct> {
	name = 'mtb';
	importLabel = 'Muay Thai Boxing CSV';
	useTitleForMatching = true;
	useBarcodeForExclusiveMatching = true;
	expectedHeaders = [
		'Variant SKU',
		'Variant Barcode',
		'Variant Inventory Qty',
		'Title',
		'Vendor',
		'Variant Weight',
		'Variant Taxable',
		'Variant Price',
		'Body HTML',
		'Image Src',
		'Option1 Name',
		'Option1 Value',
		'Handle'
	];
	getSKU = (product: MTBProduct) => product['Variant SKU'];
	getBarcode = (product: MTBProduct) => this._parseBarcode(product, product['Variant Barcode']);
	getQuantity = (product: MTBProduct) => Number(product['Variant Inventory Qty']);
	getTitle = (product: MTBProduct) => {
		const title = product.Title;
		if (['Fairtex', 'Twins Special', 'MTG Pro'].includes(product.Vendor)) {
			const skuStart = product['Variant SKU'].split('-')[0];
			let newTitle = title.replace(new RegExp(`^${skuStart}\\s`), '');
			if (newTitle === title) {
				const skuMiddle = product['Variant SKU'].split('-')[1];
				newTitle = title.replace(new RegExp(`^${skuStart}-${skuMiddle}\\s`), '');
			}
			return newTitle;

		} else if (product.Vendor === 'TUFF Sport') {
			const skuStart = product['Variant SKU'].split('-')[1];
			return title.replace(new RegExp(`^${skuStart}\\s`), '');
		}
		return title;
	};
	getWeightGrams = (product: MTBProduct) => Number(product['Variant Weight']) * 1000;
	getTaxable = (product: MTBProduct) => product['Variant Taxable'] === 'true';
	getPrice = (product: MTBProduct) => {
		const rrp = this.getRRP(product);
		// Add price for heavy/large items like punching bags
		if (this.getWeightGrams(product) >= 3000) {
			return rrp + RM_LARGE_SHIPPING_MTB;
		}
		if (this.getVendor(product) === 'TUFF Sport') {
			return rrp;
		}
		return rrp + RM_SMALL_SHIPPING;
	};
	getRRP = (product: MTBProduct) => roundPrice(Number(product['Variant Price']));
	getDescription = (product: MTBProduct) => product['Body HTML'];
	getVendor = (product: MTBProduct) => product.Vendor;
	getMainImageURL = (product: MTBProduct) => product['Image Src'];
	getAdditionalImages = (product: MTBProduct) => {
		return product._additionalImages || [];
	};
	getVariants = (product: MTBProduct) => {
		return [
			{
				name: product['Option1 Name'],
				value: product['Option1 Value'],
			}
		];
	};
	getVariantCorrelationId = (product: MTBProduct) => product.Handle;
	parseImport = (products: MTBProduct[]) => {
		const csv: MTBProduct[] = [];
		let variant: typeof csv[0] | undefined;
		for (const product of products) {
			// variant parent
			if (product['Variant SKU']) {
				variant = product;
				csv.push(product);
				continue;
			}

			// who knows what happened here
			if (product.Handle !== variant?.Handle) {
				variant = undefined;
				continue;
			}

			// assume subsequent lines without sku are images
			variant._additionalImages = variant._additionalImages || [];
			variant._additionalImages.push(product['Image Src']);
		}
		return csv;
	}
};

export const mtbBrand: Brand = {
	id: 'mtb',
	name: 'Muay Thai Boxing',
	icon: {
		url: 'https://muaythai-boxing.com/cdn/shop/files/muaythai-boxing-logo-dark.png?v=1737681891&width=480',
		size: 'large' as const
	},
	fileInfo: {
		inventory:    { label: 'Muay Thai Boxing CSV', description: 'The MTB product export. Contains SKU, barcode, and inventory quantity columns.' },
		addProducts:  { label: 'Muay Thai Boxing CSV', description: 'The MTB product export. New products will be created in Shopify.' },
		editProducts: { label: 'Muay Thai Boxing CSV', description: 'The MTB product export. Prices and images will be updated in Shopify.' },
	},
	vendorFor: {
		inventory:    () => new MTB(),
		addProducts:  () => new MTB(),
		editProducts: () => new MTB(),
	},
};