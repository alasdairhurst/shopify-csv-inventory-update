import { RM_SMALL_SHIPPING, PARENT_SYMBOL } from '../utils/constants.ts';
import { Vendor, Product, InventoryUpdatable, ProductAddable } from './vendor.ts';
import { intRange } from '../utils/number.ts';
import { roundPrice } from '../utils/helpers.ts';

// Fixed price shipping for certain SKUs
const blitzShipping: Record<string, number> = {
	'16098': 42,
	'16829': 15.84,
	'21891': 18,
	'21892': 18,
	'21893': 18,
	'4021': 15.84,
	'12836': 15.84,
	'6371': 42
};

export type BlitzProduct = Product & {
	Title: string;
	Link: string;
	LinkComponent: string;
	Description: string;
	Sku: string;
	ParentSku: string;
	Ean: string;
	CatCode: string;
	Type: string;
	Taxable: 'True' | 'False';
	Brand: string;
	Category: string;
	ImageUrl: string;
	InStock: 'True' | 'False';
	Weight: string;
	RetailPrice: string;
	TradePrice: string;
	Feature1: string;
	Feature2: string;
	Feature3: string;
	Feature4: string;
	Feature5: string;
	DueDate: string;
	Size: string;
	Colour: string;
	Design: string;
	AltImage1: string;
	AltImage2: string;
	AltImage3: string;
	AltImage4: string;
	AltImage5: string;
	AltImage6: string;
	AltImage7: string;
	AltImage8: string;
	AltImage9: string;
	AltImage10: string;
	AltImage11: string;
	AltImage12: string;
}

export class Blitz extends Vendor<BlitzProduct> implements InventoryUpdatable<BlitzProduct>, ProductAddable<BlitzProduct> {
	name = 'blitz';
	importLabel = 'Blitz CSV';
	htmlDecode = true;
	useTitleForMatching = true;
	useBarcodeForExclusiveMatching = true;
	deny = [
		'21682' // Test product
	];
	expectedHeaders = [
		'Title',
		'Link',
		'LinkComponent',
		'Description',
		'Sku',
		'ParentSku',
		'Ean',
		'CatCode',
		'Type',
		'Taxable',
		'Brand',
		'Category',
		'ImageUrl',
		'InStock',
		'Weight',
		'RetailPrice',
		'TradePrice',
		'Feature1',
		'Feature2',
		'Feature3',
		'Feature4',
		'Feature5',
		'DueDate',
		'Size',
		'Colour',
		'Design',
		'AltImage1',
		'AltImage2',
		'AltImage3',
		'AltImage4',
		'AltImage5',
		'AltImage6',
		'AltImage7',
		'AltImage8',
		'AltImage9',
		'AltImage10',
		'AltImage11',
		'AltImage12',
	]
	getSKU = (product: BlitzProduct) => product.Sku;
	getQuantity = (product: BlitzProduct) => product.InStock === 'True' ? 25 : 0;
	getPrice = (product: BlitzProduct) => {
		const price = Number(product.TradePrice) * 1.45 * this.getVAT(product) + this.getShipping(product);
		return roundPrice(price);
	};
	getVAT = (product: BlitzProduct) => {
		return product.Taxable === 'True' ? 1.2 : 1;
	};
	getShipping = (product: BlitzProduct) => {
		return blitzShipping[product.Sku] || RM_SMALL_SHIPPING;
	};
	getRRP = (product: BlitzProduct) => roundPrice(Number(product.RetailPrice));
	getMainImageURL = (product: BlitzProduct) => product.ImageUrl;
	getVariantImageURL = (product: BlitzProduct) => product.ImageUrl;
	getAdditionalImages = (product: BlitzProduct) => {
		if (product[PARENT_SYMBOL]) {
			return [];
		}
		const images = [];
		for (const i of intRange(1, 12)) {
			const image = product[`AltImage${i}`];
			if (image) {
				images.push(image);
			}
		}
		return images;
	};
	getTitle = (product: BlitzProduct) => product.Title;
	getBarcode = (product: BlitzProduct) => this._parseBarcode(product, product.Ean);
	getTaxable = (product: BlitzProduct) => product.Taxable === 'True';
	getVariantCorrelationId = (product: BlitzProduct) => product.ParentSku;
	getFeatures = (product: BlitzProduct) => {
		const features = [];
		for (const i of intRange(1, 5)) {
			if (product[`Feature${i}`]) {
				features.push(product[`Feature${i}`]);
			}
		}
		return features;
	};
	getWeightGrams = (product: BlitzProduct) => Number(product.Weight) * 1000;
	getType = (product: BlitzProduct) => product.Category;
	getVendor = (product: BlitzProduct) => product.Brand;
	getDescription = (product: BlitzProduct) => product.Description;
	getVariants = (product: BlitzProduct) => {
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
		if (product.Design) {
			variants.push({
				name: 'Design',
				value: product.Design
			});
		}
		return variants;
	};
	parseImport = (products: BlitzProduct[]) => {
		const csv: BlitzProduct[] = [];
		const parents: Record<string, typeof products[number]> = {};
		for (const product of products) {
			// variant parent
			if (product.Type === 'Parent') {
				if (parents[product.Sku]) {
					console.error(`[ERROR] blitz duplicate parent SKU ${product.Sku}`);
					continue;
				}
				parents[product.Sku] = product;
				continue;
			}
			// singular
			if (product.Type === 'Standard') {
				csv.push(product);
				continue;
			}
			if (product.Type !== 'Child') {
				continue;
			}
			// Add as a variant row
			const parentproduct = parents[product.ParentSku];
			if (!parentproduct) {
				// there are one or two missing a parent, add as a regular?
				console.warn(`[WARN] blitz dangling child/variant without parent SKU ${product.Sku}`)
				parents[product.Sku] = product;
				csv.push(product);
				continue;
			}

			// Add a regular product
			// Use parent as a base and override with non-empty values for each key, ignoring title
			const regularProduct: BlitzProduct = {
				...parentproduct,
				...Object.fromEntries(
					Object.entries(product).filter(
						([key, value]) =>
							key !== 'Title' &&
							value !== ''
						)
				)
			};
			csv.push(regularProduct);
		}
		return csv;
	};
};
