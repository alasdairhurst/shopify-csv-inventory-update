import { RM_SMALL_SHIPPING, PARENT_SYMBOL } from '../utils/constants';

const blitzShipping = {
	16098: 42,
	16829: 15.84,
	21891: 18,
	21892: 18,
	21893: 18,
	4021: 15.84,
	12836: 15.84,
	6371: 42
};

export const blitz = {
	name: 'blitz',
	importLabel: 'Blitz CSV',
	updateInventory: true,
	updateProducts: true,
	addProducts: true,
	htmlDecode: true,
	useTitleForMatching: true,
	useBarcodeForExclusiveMatching: true,
	expectedHeaders: ['Title', 'Link', 'LinkComponent', 'Description', 'Sku', 'ParentSku', 'Ean', 'CatCode', 'Type', 'Taxable', 'Brand', 'Category', 'ImageUrl', 'InStock', 'Weight', 'RetailPrice', 'TradePrice', 'Feature1', 'Feature2', 'Feature3', 'Feature4', 'Feature5', 'DueDate', 'Size', 'Colour', 'Design', 'AltImage1', 'AltImage2', 'AltImage3', 'AltImage4', 'AltImage5', 'AltImage6', 'AltImage7', 'AltImage8', 'AltImage9', 'AltImage10', 'AltImage11', 'AltImage12'],
	getSKU: item => item.Sku,
	getQuantity: item => item.InStock === 'True' ? 25 : 0,
	getPrice: item => {
		const VAT = item.Taxable === 'True' ? 0.2 : 0;
		const shipping = blitzShipping[item.Sku] || RM_SMALL_SHIPPING;
		return +item.TradePrice * 1.45 * (1+VAT) + shipping;
	},
	getRRP: item => item.RetailPrice,
	getMainImageURL: item => item.ImageUrl,
	getVariantImageURL: item => item.ImageUrl,
	getAdditionalImages: item => {
		if (item[PARENT_SYMBOL]) {
			return [];
		}
		const images = [];
		for (let i = 1; i <=12; i++) {
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
		for (let i = 1; i <=5; i++) {
			if (item[`Feature${i}`]) {
				features.push(item[`Feature${i}`]);
			}
		}
		return features;
	},
	getWeight: item => item.Weight,
	getType: item => item.Category,
	// getTags: item => [],
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
		const csv = [];
		const parents = {};
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
			const newItem = {...parentItem};
			for (const key in item) {
				if (key !== 'Title' && item[key] !== '') {
					newItem[key] = item[key];
				}
			}
			csv.push(newItem);
		}
		return csv;
	}
};