import { vendors, Product } from '../vendors/index.ts';
import logger from '../utils/logger.ts';
import {
	escapeBarcode,
	escapeSKU,
	parseSKU,
	roundPrice
} from '../utils/helpers.ts';
import {
	getShopifyProductAndParent,
	isOnSale,
	ShopifyProduct
} from '../shopify/products.ts';
import { PARENT_SYMBOL } from '../utils/constants.ts';
import { intRange } from '../utils/number.ts';
import { DEFAULT_SHOPIFY_PRODUCT, ExternalShopifyProduct } from '../vendors/shopify.ts';

const addProducts = (shopifyProducts: ShopifyProduct[], vendorProducts: Record<string, Product[]>) => {
	for (const vendor of vendors) {
		if (!vendor.canAddProducts()) {
			logger.debug(`[SKIP] Vendor ${vendor.name} does not support adding products`);
			continue;
		}

		const vendorProductCSV = vendorProducts[vendor.name];
		if (!vendorProductCSV) {
			logger.log(`[SKIP] no product file selected for ${vendor.name}`);
			continue;
		}

		logger.log(`[INFO] loading ${vendorProductCSV.length} items from ${vendor.name}`);
		for (const vendorProduct of vendorProductCSV) {
			const vendorProductSKU = parseSKU(vendor.getSKU(vendorProduct));
			if (!vendorProductSKU) {
				logger.debug(`[NOT FOUND] ${vendor.name} no SKU found for product`, vendorProduct);
				continue;
			}

			const Title = vendor.getTitle(vendorProduct).trim();
			// FIXME: allow the parsedBarcode as string since we already checked the sku
			// but should avoid undefined sku in the first place
			const vendorProductBarcode = vendor.getParsedBarcode(vendorProduct) as string;
			const vendorProductLabel = `${vendorProductSKU} (${Title}/${vendorProductBarcode})`;
			const { shopifyProduct } = getShopifyProductAndParent(
				shopifyProducts, vendor, vendorProduct
			);

			if (shopifyProduct) {
				logger.debug(`[FOUND] ${vendor.name} SKU ${vendorProductLabel} in shopify products`);
				continue;
			}

			const vendorParent = vendorProduct[PARENT_SYMBOL];
			const { shopifyParent } = vendorParent ? getShopifyProductAndParent(
				shopifyProducts, vendor, vendorParent
			) : { shopifyParent: undefined };
			const isNewProduct = !shopifyParent;

			// Generate a handle
			const Handle = isNewProduct
				? vendor.name + '-' + Title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-)|(-$)/g, '').replace(/-+/g, '-')
				: shopifyParent.primaryRow.Handle;

			let parentOnlyFields: Partial<ExternalShopifyProduct> = {};
			if (isNewProduct) {
				const features = vendor.getFeatures?.(vendorProduct) || [];
				const featureHTML = features.length ? `<br><ul>${features.map(f => `<li><p>${f}</p></li>`).join('')}</ul>` : '';

				// create product as parent
				parentOnlyFields = {
					Title,
					Handle,
					'Body (HTML)': featureHTML + vendor.getDescription(vendorProduct),
					Vendor: vendor.getVendor(vendorProduct),
					'Product Category': 'Sporting Goods',
					Type: vendor.getType?.(vendorProduct) ?? 'Sporting Goods',
					Published: 'TRUE',
					'Image Src': vendor.getMainImageURL(vendorProduct)
				};
				logger.log(`[ADDING] ${vendor.name} SKU ${vendorProductLabel} to shopify`);
			} else {
				logger.log(`[ADDING] ${vendor.name} SKU ${vendorProductLabel} to existing product in shopify`);
			}

			const price = roundPrice(vendor.getPrice(vendorProduct));
			const product: ExternalShopifyProduct = {
				...DEFAULT_SHOPIFY_PRODUCT,
				...parentOnlyFields,
				Handle,
				'Variant SKU': escapeSKU(vendorProductSKU),
				'Variant Inventory Tracker': 'shopify',
				'Variant Inventory Policy': 'deny',
				'Variant Fulfillment Service': 'manual',
				'Variant Price': String(price),
				'Variant Compare At Price': String(vendor.getRRP ? roundPrice(vendor.getRRP(vendorProduct)) : price),
				'Variant Requires Shipping': 'TRUE',
				'Variant Taxable': vendor.getTaxable?.(vendorProduct) === false ? 'FALSE' : 'TRUE',
				'Variant Barcode': escapeBarcode(vendorProductBarcode),
				'Gift Card': 'FALSE',
				'Variant Weight Unit': 'kg',
				'Status': 'active'
			};

			if (vendor.getWeight) {
				product['Variant Grams'] = Math.min(vendor.getWeight(vendorProduct), 999).toString();
			}

			const variants = vendor.getVariants?.(vendorProduct);
			if (variants?.length) {
				// Add an image spepecifically for the variant if the vendor offers one to allow image changes when changing selection
				if (vendor.getVariantImageURL) {
					product['Variant Image'] = vendor.getVariantImageURL(vendorProduct);
				}

				for (const i of intRange(1, 3)) {
					if (variants[i]) {
						product[`Option${i} Name`] = variants[i].name;
						product[`Option${i} Value`] = variants[i].value;
					}
				}
			} else {
				product['Option1 Name'] = 'Title';
				product['Option1 Value'] = 'Default Title';
			}
			let additionalImages: ExternalShopifyProduct[] = [];
			if (vendor.getAdditionalImages) {
				additionalImages = vendor.getAdditionalImages(vendorProduct).map(image => ({
					...DEFAULT_SHOPIFY_PRODUCT,
					Handle,
					'Image Src': image,
				}))
			}

			// Add or update parent tags
			const tags = shopifyParent?.primaryRow.Tags.split(', ') ?? [];

			// Ensure any product has new in when importing a new product or variant
			if (!tags.includes('new in')) {
				tags.push('new in');
			}

			// Ensure any product has the vendor as a tag
			if (!tags.includes(vendor.name)) {
				tags.push(vendor.name);
			}

			// Ensure the sale tag is either set or not set
			// Check all the current rows with a price to see if any are already on sale
			const currentOnSale = isOnSale(product);
			const anyVariantOnSale = shopifyParent?.secondaryRows.some(product => {
				if (!product['Variant Price']) {
					return false;
				}
				return isOnSale(product);
			}) ?? false;
			const parentOnSale = shopifyParent && isOnSale(shopifyParent.primaryRow);
			const onSale = currentOnSale || anyVariantOnSale || parentOnSale;

			if (onSale && !tags.includes('sale')) {
				tags.push('sale');
			}

			if (!onSale && tags.includes('sale')) {
				tags.splice(tags.indexOf('sale'), 1);
			}

			if (!isNewProduct) {
				shopifyParent.primaryRow.Tags = tags.join(', ');
				shopifyParent.secondaryRows.push(product);
				shopifyParent.secondaryRows.push(...additionalImages);
				shopifyParent.edited = true;
			} else {
				product.Tags = tags.join(', ');
				shopifyProducts.push({
					primaryRow: product,
					secondaryRows: additionalImages,
					edited: true
				});
			}
		}
	}

	return shopifyProducts;
}

export default addProducts;