import { RM_SMALL_SHIPPING } from '../../utils/constants';

export const cartas = {
	name: 'cartas',
	importLabel: 'Cartas Products CSV',
	updateInventory: false,
	updateProducts: true,
	addProducts: true,
	useTitleForMatching: true,
	useBarcodeForExclusiveMatching: false,
	expectedHeaders: ['STATUS','CODE','WEIGHT','STOCK','CATEGORY','BRAND','EAN','VAT','TRADE_PRICE','DESCRIPTION','MAIN_IMAGE','PRODUCT_NAME','IMAGE_1','IMAGE_2','IMAGE_3','IMAGE_4','SIZE','COLOUR','PERANT_ID', 'LENGTH', 'WIDTH', 'HEIGHT'],
	getSKU: item => item.STATUS === 'LIVE' ? item.CODE.trim() : undefined, 
	// What unit? Convert to kg
	getWeight: item => +item.WEIGHT.trim(),
	getQuantity: item => Math.min(+item.STOCK, 50),
	getType: item => item.CATEGORY.replace(item.BRAND.toUpperCase(), '').replace(/-/g, '').trim(),
	getBarcode: item => item.EAN || item.UPC,
	getBasePrice: item => {
		const VAT = cartas.getVAT(item);
		return +item.TRADE_PRICE * 1.45 * VAT;
	},
	getShipping: item => {
		return RM_SMALL_SHIPPING;
	},
	getPrice: item => {
		return (cartas.getBasePrice(item) * 0.9) + cartas.getShipping(item);
	},
	getRRP: item => {
		return (cartas.getBasePrice(item) + cartas.getShipping(item)) * 1.2;
	},
	getTaxable: item => cartas.getVAT(item) > 1,
	getVendor: item => item.BRAND.trim(),
	getDescription: item => item.DESCRIPTION.replace(/^'/, '').replace(/'$/, '').trim(),
	getMainImageURL: item => item.MAIN_IMAGE.trim(),
	getVariantImageURL: item => item.MAIN_IMAGE.trim(),
	// getTags: item => [],
	getTitle: item => item.PRODUCT_NAME.trim(),
	getAdditionalImages: item => {
		const images = [];
		for (let i = 1; i<= 4; i++) {
			const image = item[`IMAGE_${i}`].trim();
			if (image) {
				images.push(image);
			}

		}
		return images;
	},
	getVariants: item => {
		const variants = [];
		const size = item.SIZE.trim();
		const colour = item.COLOUR.trim();
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
	},
	getVariantCorrelationId: item => item.PERANT_ID || item.PARENT_ID,
	// Helpers
	getVAT: item => {
		const VATpc = +item.VAT.replace('%', '');
		const VAT = (VATpc / 100) + 1
		return VAT;
	}
};

export const cartasInventory = {
	name: 'cartas-inventory',
	importLabel: 'Cartas Inventory CSV',
	updateInventory: true,
	updateProducts: false,
	useTitleForMatching: true,
	getSKU: item => item.CHILD_CODE.trim(),
	getQuantity: item => Math.min(+item.QUANTITY.trim(), 50),
	getTitle: item => item.PRODUCT_NAME.trim(),
	expectedHeaders: ['PRODUCT_ID','PARENT_CODE','PRODUCT_NAME','OPTION_NAME','SIZE','CHILD_CODE','QUANTITY','LIST_PRICE'],
};
