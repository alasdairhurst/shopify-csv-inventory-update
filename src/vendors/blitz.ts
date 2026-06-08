import { RM_SMALL_SHIPPING, PARENT_SYMBOL } from '../utils/constants';
import type { Vendor } from './types';
import { intRange } from '../utils/number';
import { objEntries } from '../utils/object';

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

const blitzHeaders = [
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
] as const;

export const blitz = {
	name: 'blitz',
	importLabel: 'Blitz CSV',
	updateInventory: true,
	updateProducts: true,
	addProducts: true,
	htmlDecode: true,
	useTitleForMatching: true,
	useBarcodeForExclusiveMatching: true,
	expectedHeaders: blitzHeaders,
	// implemented later
	getParsedBarcode: () => '',
	getSKU: item => item.Sku,
	getQuantity: item => item.InStock === 'True' ? 25 : 0,
	getPrice: (item): number => {
		return +item.TradePrice * 1.45 * blitz.getVAT(item) + blitz.getShipping(item);
	},
	getVAT: item => {
		return item.Taxable === 'True' ? 1.2 : 1
	},
	getShipping: item => {
		return blitzShipping[item.Sku] || RM_SMALL_SHIPPING;
	},
	getRRP: item => Number(item.RetailPrice),
	getMainImageURL: item => item.ImageUrl,
	getVariantImageURL: item => item.ImageUrl,
	getAdditionalImages: item => {
		if (item[PARENT_SYMBOL]) {
			return [];
		}
		const images = [];
		for (const i of intRange(1, 12)) {
			const image = item[`AltImage${i}`];
			if (image) {
				images.push(image);
			}
		}
		return images;
	},
	getTitle: item => item.Title,
	getBarcode: item => item.Ean,
	getTaxable: item => item.Taxable === 'True',
	// getVariantCorrelationId: item => item.LinkComponent || item.Link.replace('https://www.blitzsport.com/', ', '),
	getVariantCorrelationId: item => item.ParentSku,
	getFeatures: item => {
		const features = [];
		for (const i of intRange(1, 5)) {
			if (item[`Feature${i}`]) {
				features.push(item[`Feature${i}`]);
			}
		}
		return features;
	},
	getWeight: item => Number(item.Weight),
	getType: item => item.Category,
	getVendor: item => item.Brand,
	getDescription: item => item.Description,
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
		if (item.Design) {
			variants.push({
				name: 'Design',
				value: item.Design
			});
		}
		return variants;
	},
	deny: [
		// Test item
		'21682'
	],
	parseImport: items => {
		const csv: typeof items = [];
		const parents: Record<string, typeof items[number]> = {};
		for (const item of items) {
			// variant parent
			if (item.Type === 'Parent') {
				if (parents[item.Sku]) {
					console.error(`[ERROR] blitz duplicate parent SKU ${item.Sku}`);
					continue;
				}
				parents[item.Sku] = item;
				continue;
			}
			// singular
			if (item.Type === 'Standard') {
				csv.push(item);
				continue;
			}
			if (item.Type !== 'Child') {
				continue;
			}
			// variant
			const parentItem = parents[item.ParentSku];
			if (!parentItem) {
				// there are one or two missing a parent, add as a regular?
				console.warn(`[WARN] blitz dangling child/variant without parent SKU ${item.Sku}`)
				parents[item.Sku] = item;
				csv.push(item);
				continue;
			}

			// use parent as a base and override with non-empty values for each key, ignoring title
			const newItem: typeof parentItem = { ...parentItem };
			for (const [ key, value ] of objEntries(item)) {
				if (key !== 'Title' && key !== PARENT_SYMBOL && value !== '') {
					newItem[key] = value;
				} else if (key === PARENT_SYMBOL) {
					// happens to be OK because parent_symbol is the only non-string value
					// maybe needs to be tweaked to always resolve the correct type later.
					newItem[key] = value;
				}
			}
			csv.push(newItem);
		}
		return csv;
	}
} satisfies Vendor<'blitz', typeof blitzHeaders>;