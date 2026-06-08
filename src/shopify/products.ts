import { parseBarcode } from '../utils/helpers';
import { CSVItem } from '../vendors/types';
import type { Vendor } from '../vendors2';
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
} as const;

export type ExternalShopifyProduct = CSVItem<readonly (keyof typeof DEFAULT_SHOPIFY_PRODUCT)[]> & {
	_parsedBarcode?: string
};

export const SHOPIFY_PRODUCTS_OPTIONS = {
	orderBy: (item: ExternalShopifyProduct) => item.Handle,
	importLabel: 'Shopify products CSV',
	name: 'shopify-products',
	expectedHeaders: Object.keys(DEFAULT_SHOPIFY_PRODUCT)
};

export type ShopifyProduct = {
	primaryRow: ExternalShopifyProduct;
	secondaryRows: ExternalShopifyProduct[];
	edited: boolean;
	sale?: boolean; // TODO: do this better
	_parsedBarcode?: string;
};

export const isOnSale = (shopifyProduct: ExternalShopifyProduct) => {
	// Update the product sale tag - run after price update
	const price = +shopifyProduct['Variant Price'];
	const rrp = +shopifyProduct['Variant Compare At Price'];
	return (price / rrp) <= 0.7;
};

// Replace
export const getShopifyProductParsedBarcode = (product: ExternalShopifyProduct) => {
	if (!('_parsedBarcode' in product)) {
		product._parsedBarcode = parseBarcode(product['Variant Barcode']);
	}
	return product._parsedBarcode;
}

export const convertShopifyProductsToInternal = (shopifyProductsCSV: ExternalShopifyProduct[]) => {
	shopifyProductsCSV = shopifyProductsCSV.sort((a, b) => {
		return a.Handle.localeCompare(b.Handle);
	});

	// reformat
	const shopifyProductsNewFormat: ShopifyProduct[] = [];
	let currentProduct: ShopifyProduct | undefined;
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

export const convertShopifyProductsToExternal = (products: ShopifyProduct[], options: { onlyEdited?: boolean} = {}) => {
	const shopifyProductsCSV: ExternalShopifyProduct[] = [];
	for (const product of products) {
		if (options.onlyEdited && !product.edited) {
			continue;
		}
		shopifyProductsCSV.push(product.primaryRow);
		shopifyProductsCSV.push(...product.secondaryRows);
	}
	return shopifyProductsCSV;
}

const matchProduct = (shopifyParent: ShopifyProduct, shopifyProduct: ExternalShopifyProduct, vendor: Vendor<any>, vendorProduct: any) => {
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

export const getShopifyProductAndParent = (shopifyProducts: ShopifyProduct[], vendor: Vendor<any>, vendorProduct: any) => {
	let shopifyProduct: ExternalShopifyProduct | undefined;
	let shopifyProductLabel: string | undefined;
	const shopifyParent = shopifyProducts.find(product => {
		// eslint-disable-next-line no-cond-assign
		if (shopifyProductLabel = matchProduct(product, product.primaryRow, vendor, vendorProduct)) {
			shopifyProduct = product.primaryRow;
			return true;
		}
		return !!product.secondaryRows.find(secondaryRow => {
			// eslint-disable-next-line no-cond-assign
			if (shopifyProductLabel = matchProduct(product, secondaryRow, vendor, vendorProduct)) {
				shopifyProduct = secondaryRow;
				return true;
			}
			return false;
		});
	});
	return { shopifyProduct, shopifyParent, shopifyProductLabel };
}