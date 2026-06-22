import { vendors, Product } from '../vendors/index.ts';
import logger from '../utils/logger.ts';
import {
	escapeBarcode,
	parseSKU
} from '../utils/helpers.ts';
import {
	convertShopifyProductsToExternal,
	convertShopifyProductsToInternal,
	getShopifyProductAndParent,
	getShopifyProductParsedBarcode,
	isOnSale
} from '../shopify/products.ts';
import { BARCODE_DOES_NOT_APPLY } from '../utils/constants.ts';
import { DEFAULT_SHOPIFY_PRODUCT, ExternalShopifyProduct } from '../vendors/shopify.ts';

const updateProducts = (externalShopifyProducts: ExternalShopifyProduct[], vendorProducts: Record<string, Product[]>, { updateImages }: { updateImages : boolean }) => {
	const shopifyProducts = convertShopifyProductsToInternal(externalShopifyProducts);
	for (const vendor of vendors) {
		const vendorProductCSV = vendorProducts[vendor.name];
		if (!vendorProductCSV) {
			logger.log(`[SKIP] no product file selected for ${vendor.name}`);
			continue;
		}

		logger.log(`Reading ${vendorProductCSV.length} items from product file for ${vendor.name}`);
		for (const vp of vendorProductCSV) {
			// FIXME to avoid any
			const vendorProduct: any = vp;
			const vendorProductSKU = parseSKU(vendor.getSKU(vendorProduct));
			const vendorProductTitle = vendor.getTitle?.(vendorProduct) ?? '';
			const vendorProductBarcode = vendor.getBarcode?.(vendorProduct) ?? '';
			const vendorProductLabel = `${vendorProductSKU} (${vendorProductTitle}/${vendorProductBarcode})`;
			const { shopifyProduct, shopifyParent, shopifyProductLabel } = getShopifyProductAndParent(
				shopifyProducts, vendor, vendorProduct
			);

			if (!shopifyProduct || !shopifyParent) {
				logger.debug(`[NOT FOUND] ${vendor.name} SKU ${vendorProductLabel} in shopify products`);
				continue;
			}

			// TODO: Is it possible to run an update on the parent row to change the shopify parent?
			const isParent = shopifyParent.primaryRow['Variant SKU'] === vendorProductSKU;

			// Update price
			if (!vendor.getPrice) {
				// logger.debug(`[WARN] cannot update price for vendor ${vendor.name} getPrice not implemented`);
			} else {
				const vendorProductPrice = vendor.getPrice(vendorProduct).toString();
				const shopifyProductPrice = shopifyProduct['Variant Price'].toString();

				if (shopifyProductPrice === vendorProductPrice) {
					logger.debug(`[PRICE MATCH] ${vendor.name} SKU ${vendorProductLabel} price ${vendorProductPrice} matches shopify product ${shopifyProductLabel}: ${shopifyProductPrice}`);
				} else {
					logger.log(`[PRICE UPDATE] ${vendor.name} SKU ${vendorProductLabel} price ${vendorProductPrice} differs in shopify product ${shopifyProductLabel}: ${shopifyProductPrice}`);
					shopifyProduct['Variant Price'] = vendorProductPrice;
					shopifyParent.edited = true;
				}
			}

			// Update barcode
			if (!vendor.getBarcode) {
				// logger.debug(`[WARN] cannot update barcode for vendor ${vendor.name} getBarcode not implemented`);
			} else {
				const shopifyProductBarcode = getShopifyProductParsedBarcode(shopifyProduct);
				if (shopifyProductBarcode === vendorProductBarcode) {
					logger.debug(`[BARCODE MATCH] ${vendor.name} SKU ${vendorProductLabel} barcode matches shopify product ${shopifyProductLabel}`);
					// even if the barcode matches it may not be nicely formatted. enable this once for existing products, then it's already handled
					// check the raw value to avoid updating absolutely everything
					// if ((shopifyProduct['Variant Barcode'] !== escapeBarcode(vendorProductBarcode))) {
					//   logger.log(`[BARCODE UPDATE] ${vendor.name} SKU ${vendorProductLabel} raw barcode differs in shopify product (${shopifyProduct['Variant Barcode']}) ${shopifyProductLabel}`);
					//   shopifyProduct['Variant Barcode'] = escapeBarcode(vendorProductBarcode);
					//   shopifyParent.edited = true;
					// }
				} else if (vendorProductBarcode === BARCODE_DOES_NOT_APPLY) {
					logger.debug(`[BARCODE UPDATE IGNORED] ${vendor.name} SKU ${vendorProductLabel} barcode missing but exists in shopify product ${shopifyProductLabel}`);
				} else {
					logger.log(`[BARCODE UPDATE] ${vendor.name} SKU ${vendorProductLabel} barcode differs in shopify product ${shopifyProductLabel}`);
					shopifyProduct['Variant Barcode'] = escapeBarcode(vendorProductBarcode);
					shopifyParent.edited = true;
				}
			}

			// Update tags
			const tags = shopifyParent.primaryRow.Tags.split(', ');

			// Ensure the product has a vendor tag
			if (!tags.includes(vendor.name)) {
				logger.log(`[TAGS UPDATE] shopify product ${shopifyProductLabel} tags are missing ${vendor.name} vendor: [${tags}]`);
				tags.push(vendor.name);
				shopifyParent.primaryRow.Tags = tags.join(', ');
				shopifyParent.edited = true;
			}

			// Set sale if any variant seen has a sale. then we'll use that to update the parent tags
			// This expects all variants from the vendor to be iterated so by the time we get to the
			// last one we'll know for sure. This may stil end up with an update if the tag is removed
			// before a later sale is seen.
			shopifyParent.sale = shopifyParent.sale ?? isOnSale(shopifyProduct);

			if (shopifyParent.sale && !tags.includes('sale')) {
				logger.log(`[TAGS UPDATE] shopify product ${shopifyProductLabel} tags are missing sale: [${tags}]`);
				tags.push('sale');
				shopifyParent.primaryRow.Tags = tags.join(', ');
				shopifyParent.edited = true;
			} else if (!shopifyParent.sale && tags.includes('sale')) {
				logger.log(`[TAGS UPDATE] shopify product ${shopifyProductLabel} tags should not have sale: [${tags}]`);
				tags.splice(tags.indexOf('sale'), 1);
				shopifyParent.primaryRow.Tags = tags.join(', ');
				shopifyParent.edited = true;
			}

			// Add main image on parent
			if (!vendor.getMainImageURL || !isParent) {
				// logger.debug(`[WARN] cannot update variant images for vendor ${vendor.name} getMainImageURL not implemented`);
			} else {
				// Edit the image if there is none set or we want to manually update them
				if (!shopifyProduct['Image Src'] || updateImages) {
					logger.log(`[IMAGE UPDATE] ${vendor.name} SKU ${vendorProductLabel} editing main image on product ${shopifyProductLabel}`);
					shopifyProduct['Image Src'] = vendor.getMainImageURL(vendorProduct);
					shopifyParent.edited = true;
				}
			}

			// Add variant image that is shown when you select a variant
			if (!vendor.getVariantImageURL) {
				// logger.debug(`[WARN] cannot update variant images for vendor ${vendor.name} getVariantImageURL not implemented`);
			} else {
				// Edit the image if there is none set or we want to manually update them
				if (!shopifyProduct['Variant Image'] || updateImages) {
					logger.log(`[IMAGE UPDATE] ${vendor.name} SKU ${vendorProductLabel} editing variant image on product ${shopifyProductLabel}`);
					shopifyProduct['Variant Image'] = vendor.getVariantImageURL(vendorProduct);
					shopifyParent.edited = true;
				}
			}

			// Update images. Do this for every sub item??
			if (!vendor.getAdditionalImages) {
				// logger.debug(`[WARN] cannot update additional images for vendor ${vendor.name} getAdditionalImages not implemented`);
			} else {
				const shopifyProductAdditionalImages = shopifyParent.secondaryRows.filter(row => {
					return row['Image Src'] && !row['Title'] && !row['Variant SKU'];
				});

				// Currently we only add new secondary images if there are no existing ones.
				// It's much harder to check if the images match between shopify and vendor because
				// the URL changes on import and we don't want to modify every listing every time.
				const vendorProductImages = vendor.getAdditionalImages(vendorProduct);
				if (!shopifyProductAdditionalImages.length && vendorProductImages.length) {
					logger.log(`[ADDITIONAL IMAGE UPDATE] ${vendor.name} SKU ${vendorProductLabel} adding ${vendorProductImages.length} more images to product ${shopifyProductLabel}`);
					// Add new images
					for (const image of vendorProductImages) {
						shopifyParent.secondaryRows.push({
							...DEFAULT_SHOPIFY_PRODUCT,
							Handle: shopifyParent.primaryRow.Handle,
							'Image Src': image,
						});
						shopifyParent.edited = true;
					};
				}
			}
		}
	}

	return convertShopifyProductsToExternal(shopifyProducts, { onlyEdited: true });
}

export default updateProducts;