import { parseBarcode } from '../utils/helpers';
import { matchShopifyItems } from './items';

export const DEFAULT_SHOPIFY_PRODUCT = {
	'Handle': '',
	'Title': '',
	'Body (HTML)': '',
	'Vendor': '',
	'Product Category': '',
	'Type': '',
	'Tags': '',
	'Published': '',
	'Option1 Name': '',
	'Option1 Value': '',
	'Option2 Name': '',
	'Option2 Value': '',
	'Option3 Name': '',
	'Option3 Value': '',
	'Variant SKU': '',
	'Variant Grams': '',
	'Variant Inventory Tracker': '',
	'Variant Inventory Policy': '',
	'Variant Fulfillment Service': '',
	'Variant Price': '',
	'Variant Compare At Price': '',
	'Variant Requires Shipping': '',
	'Variant Taxable': '',
	'Variant Barcode': '',
	'Image Src': '',
	'Image Position': '',
	'Image Alt Text': '',
	'Gift Card': '',
	'SEO Title': '',
	'SEO Description': '',
	'Google Shopping / Google Product Category': '',
	'Google Shopping / Gender': '',
	'Google Shopping / Age Group': '',
	'Google Shopping / MPN': '',
	'Google Shopping / Condition': '',
	'Google Shopping / Custom Product': '',
	'Google Shopping / Custom Label 0': '',
	'Google Shopping / Custom Label 1': '',
	'Google Shopping / Custom Label 2': '',
	'Google Shopping / Custom Label 3': '',
	'Google Shopping / Custom Label 4': '',
	'Google: Custom Product (product.metafields.mm-google-shopping.custom_product)': '',
	'Product rating count (product.metafields.reviews.rating_count)': '',
	'Color (product.metafields.shopify.color-pattern)': '',
	'Fabric (product.metafields.shopify.fabric)': '',
	'Neckline (product.metafields.shopify.neckline)': '',
	'Sleeve length type (product.metafields.shopify.sleeve-length-type)': '',
	'Target gender (product.metafields.shopify.target-gender)': '',
	'Top length type (product.metafields.shopify.top-length-type)': '',
	'Complementary products (product.metafields.shopify--discovery--product_recommendation.complementary_products)': '',
	'Related products (product.metafields.shopify--discovery--product_recommendation.related_products)': '',
	'Related products settings (product.metafields.shopify--discovery--product_recommendation.related_products_display)': '',
	'Search product boosts (product.metafields.shopify--discovery--product_search_boost.queries)': '',
	'Variant Image': '',
	'Variant Weight Unit': '',
	'Variant Tax Code': '',
	'Cost per item': '',
	'Status': ''
};

export const isOnSale = shopifyProduct => {
	// Update the product sale tag - run after price update
	const price = +shopifyProduct['Variant Price'];
	const rrp = +shopifyProduct['Variant Compare At Price'];
	return (price / rrp) <= 0.7;
};

export const getShopifyProductParsedBarcode = product => {
	if (!('_parsedBarcode' in product)) {
		product._parsedBarcode = parseBarcode(product['Variant Barcode']);
	}
	return product._parsedBarcode;
}

export const convertShopifyProductsToInternal = (shopifyProductsCSV) => {
	shopifyProductsCSV = shopifyProductsCSV.sort((a, b) => {
		return a.Handle.localeCompare(b.Handle);
	});

	// reformat
	const shopifyProductsNewFormat = [];
	let currentProduct;
	for (const shopifyProduct of shopifyProductsCSV) {
		shopifyProduct['Variant SKU'] = shopifyProduct['Variant SKU'].replace(/^'/, '');
		if (currentProduct?.primaryRow.Handle !== shopifyProduct.Handle) {
			currentProduct = {
				primaryRow: shopifyProduct,
				secondaryRows: [],
				edited: false
			};
			shopifyProductsNewFormat.push(currentProduct);
		} else {
			currentProduct.secondaryRows.push(shopifyProduct);
		}
	}
	return shopifyProductsNewFormat;
}

export const convertShopifyProductsToExternal = (products, options = {}) => {
	const shopifyProductsCSV = [];
	for (const product of products) {
		if (options.onlyEdited && !product.edited) {
			continue;
		}
		shopifyProductsCSV.push(product.primaryRow);
		shopifyProductsCSV.push(...product.secondaryRows);
	}
	return shopifyProductsCSV;
}

const matchProduct = (shopifyParent, shopifyProduct, vendor, vendorProduct) => {
	return matchShopifyItems(
		{
			sku: shopifyProduct['Variant SKU'],
			title: shopifyParent.primaryRow.Title,
			barcode: getShopifyProductParsedBarcode(shopifyProduct),
			tags: shopifyParent.primaryRow.Tags.split(', ')
		},
		vendor,
		vendorProduct,
		{
			matchVendorTag: true
		}
	);
};

export const getShopifyProductAndParent = (shopifyProducts, vendor, vendorProduct) => {
	let shopifyProduct;
	let shopifyProductLabel;
	const shopifyParent = shopifyProducts.find(r => {
		// eslint-disable-next-line no-cond-assign
		if (shopifyProductLabel = matchProduct(r, r.primaryRow, vendor, vendorProduct)) {
			shopifyProduct = r.primaryRow;
			return true;
		}
		return !!r.secondaryRows.find(secondaryRow => {
			// eslint-disable-next-line no-cond-assign
			if (shopifyProductLabel = matchProduct(r, secondaryRow, vendor, vendorProduct)) {
				shopifyProduct = secondaryRow;
				return true;
			}
			return false;
		});
	});
	return { shopifyProduct, shopifyParent, shopifyProductLabel };
}