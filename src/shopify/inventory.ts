import { Vendor } from '../vendors2/index.ts';
import { CSVItem } from '../vendors/types.ts';
import { matchShopifyItems } from './items.ts';

export const SHOPIFY_INVENTORY_ON_HAND_CURRENT = 'On hand (current)';
export const SHOPIFY_INVENTORY_ON_HAND_NEW = 'On hand (new)';
const SHOPIFY_INVENTORY_HEADERS = [
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
	SHOPIFY_INVENTORY_ON_HAND_CURRENT,
	SHOPIFY_INVENTORY_ON_HAND_NEW
] as const;
export type ShopifyInventory = CSVItem<typeof SHOPIFY_INVENTORY_HEADERS>;

// TODO: FIXME as vendor of some sort
export const SHOPIFY_INVENTORY_OPTIONS = {
	orderBy: (item: ShopifyInventory) => item.Handle,
	importLabel: 'Shopify inventory CSV',
	name: 'shopify-inventory',
	expectedHeaders: SHOPIFY_INVENTORY_HEADERS
} as const;


export const matchInventory = (shopifyInventory: ShopifyInventory, vendor: Vendor<any>, vendorProduct: any) => {
	return matchShopifyItems(
		{
			sku: shopifyInventory.SKU.replace(/^'/, ''),
			title: shopifyInventory.Title
		},
		vendor,
		vendorProduct,
		{
			matchTitle: true
		}
	);
};
