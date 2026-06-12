import sc from 'string-comparison';
import { parseSKU } from '../utils/helpers.ts';
import logger from '../utils/logger.ts';
import { Product, Vendor } from '../vendors/vendor.ts';

type MatchShopifyItemsOptions = {
	matchVendorTag?: boolean;
	matchTitle?: boolean;
};

export const matchShopifyItems = <P extends Product>(shopifyItem: any, vendor: Vendor<P>, vendorProduct: P, options: MatchShopifyItemsOptions = {}) => {
	const vendorProductSKU = parseSKU(vendor.getSKU(vendorProduct));
	if (!vendorProductSKU || shopifyItem.sku !== vendorProductSKU) {
		return;
	}
	if (vendor.deny?.includes(vendorProductSKU)) {
		return;
	}

	const shopifyItemLabel = `${shopifyItem.sku} (${shopifyItem.title}/${shopifyItem.barcode})`;
	const vendorProductTitle = vendor.getTitle?.(vendorProduct) || '';
	const vendorProductBarcode = vendor.getParsedBarcode(vendorProduct);
	const vendorProductLabel = `${vendorProductSKU} (${vendorProductTitle}/${vendorProductBarcode})`;

	// Check the product for the vendor tag. Use this to differentiate matching skus across different vendors
	if (options.matchVendorTag) {
		if (!shopifyItem.tags.includes(vendor.name)) {
			logger.warn(`[WARN] ${vendor.name} SKU ${vendorProductLabel} matches SKU but the matched shopify product is missing ${vendor.name} tag ${shopifyItemLabel} (${shopifyItem.tags}). Not matching.`)
			return;
		}
	}

	// if the sku matches but could have a duplicate then we'll have to use the title to see how close it is.
	if (options.matchTitle && vendor.useTitleForMatching) {
		// compare titles to have some safety net
		const similarity = sc.diceCoefficient.similarity(vendorProductTitle, shopifyItem.title);
		if (similarity <= 0.4) {
			logger.warn(`[WARN] ${vendor.name} SKU ${vendorProductLabel} matches SKU but does not match shopify product title ${shopifyItemLabel}. (${similarity} similar)`);
			return;
		}
	}

	return shopifyItemLabel;
};
