import { RM_SMALL_SHIPPING } from '../utils/constants';
import { Vendor } from './types';

const RM_LARGE_SHIPPING_MTB = 25;

// TODO: order?
const mtbHeaders = [
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
] as const;

type Additional = {
	additionalImages?: string[]
};

export const mtb = {
	name: 'mtb',
	importLabel: 'Muay Thai Boxing CSV',
	updateInventory: true,
	updateProducts: true,
	addProducts: true,
	useTitleForMatching: true,
	useBarcodeForExclusiveMatching: true,
	expectedHeaders: mtbHeaders,
	// implemented later
	getParsedBarcode: () => '',
	getSKU: item => item['Variant SKU'],
	getBarcode: item => item['Variant Barcode'],
	getQuantity: item => +item['Variant Inventory Qty'],
	getTitle: item => {
		const title = item.Title;
		if (['Fairtex', 'Twins Special', 'MTG Pro'].includes(item.Vendor)) {
			const skuStart = item['Variant SKU'].split('-')[0];
			let newTitle = title.replace(new RegExp(`^${skuStart}\\s`), '');
			if (newTitle === title) {
				const skuMiddle = item['Variant SKU'].split('-')[1];
				newTitle = title.replace(new RegExp(`^${skuStart}-${skuMiddle}\\s`), '');
			}
			return newTitle;

		} else if (item.Vendor === 'TUFF Sport') {
			const skuStart = item['Variant SKU'].split('-')[1];
			return title.replace(new RegExp(`^${skuStart}\\s`), '');
		}
		return title;
	},
	getWeight: item => +item['Variant Weight'],
	getTaxable: item => item['Variant Taxable'] === 'true',
	getPrice: (item): number => {
		let rrp = mtb.getRRP(item);
		let weight = mtb.getWeight(item);
		let vendor = mtb.getVendor(item);
		// Add price for heavy/large items like punching bags
		if (weight >= 30) {
			return rrp + RM_LARGE_SHIPPING_MTB;
		}
		if (vendor === 'TUFF Sport') {
			return rrp;
		}
		return rrp + RM_SMALL_SHIPPING;
	},
	getRRP: item => +item['Variant Price'],
	getDescription: item => item['Body HTML'],
	getVendor: item => item.Vendor,
	getMainImageURL: item => item['Image Src'],
	getAdditionalImages: item => {
		return item.additionalImages || [];
	},
	getVariants: item => {
		return [
			{
				name: item['Option1 Name'],
				value: item['Option1 Value'],
			}
		];
	},
	getVariantCorrelationId: item => item.Handle,
	parseImport: items => {
		const csv: (typeof items[0] & Additional)[] = [];
		let variant: typeof csv[0] | undefined;
		for (const item of items) {
			// variant parent
			if (item['Variant SKU']) {
				variant = item;
				csv.push(item);
				continue;
			}

			// who knows what happened here
			if (item.Handle !== variant?.Handle) {
				variant = undefined;
				continue;
			}

			// assume subsequent lines without sku are images
			variant.additionalImages = variant.additionalImages || [];
			variant.additionalImages.push(item['Image Src']);
		}
		return csv;
	}
} satisfies Vendor<'mtb', typeof mtbHeaders, Additional>