import { Product, Vendor } from './vendor.ts';

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

export type ExternalShopifyProduct = Product & typeof DEFAULT_SHOPIFY_PRODUCT & {
	_parsedBarcode?: string
};

export class Shopify extends Vendor<ExternalShopifyProduct> {
	name = 'shopify-products';
	importLabel = 'Shopify products CSV';
	expectedHeaders = Object.keys(DEFAULT_SHOPIFY_PRODUCT);
	getSKU = (product: ExternalShopifyProduct) => product['Variant SKU'].replace(/^'/, '');
	orderBy = (item: ExternalShopifyProduct) => item.Handle;
};

export type ShopifyInventoryProduct = Product & {
	Handle: string;
	Title: string;
	SKU: string;
};

export class ShopifyInventory extends Vendor<ShopifyInventoryProduct> {
	name = 'shopify-inventory';
	importLabel = 'Shopify inventory CSV';
	expectedHeaders = [
		'Handle',
		'Title',
		'Option1 Name',
		'Option1 Value',
		'Option2 Name',
		'Option2 Value',
		'Option3 Name',
		'Option3 Value',
		'SKU',
		'HS Code',
		'COO',
		'Location',
		'Bin name',
		'Incoming (not editable)',
		'Unavailable (not editable)',
		'Committed (not editable)',
		'Available (not editable)',
		'On hand (current)',
		'On hand (new)'
	];
	orderBy = (product: ShopifyInventoryProduct) => product.Handle;
	getSKU = (product: ShopifyInventoryProduct) => product.SKU.replace(/^'/, '');
	getTitle = (product: ShopifyInventoryProduct) => product.Title;
};
