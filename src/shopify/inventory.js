import { matchShopifyItems } from './items';

export const SHOPIFY_INVENTORY_ON_HAND_CURRENT = 'On hand (current)';
export const SHOPIFY_INVENTORY_ON_HAND_NEW = 'On hand (new)';
export const SHOPIFY_INVENTORY_OPTIONS = {
	orderBy: item => item.Handle,
	importLabel: 'Shopify inventory CSV',
	name: 'shopify-inventory',
	expectedHeaders: [
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
	]
};

export const matchInventory = (shopifyInventory, vendor, vendorProduct) => {
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
