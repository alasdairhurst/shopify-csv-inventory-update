import { Vendor, shopifyInventoryVendor } from '../vendors/index.ts';
import { ShopifyInventoryProduct } from '../vendors/shopify.ts';
import { matchShopifyItems } from './items.ts';

export const SHOPIFY_INVENTORY_ON_HAND_CURRENT = 'On hand (current)';
export const SHOPIFY_INVENTORY_ON_HAND_NEW = 'On hand (new)';

export const matchInventory = (shopifyInventoryProduct: ShopifyInventoryProduct, vendor: Vendor<any>, vendorProduct: any) => {
	return matchShopifyItems(
		{
			sku: shopifyInventoryVendor.getSKU(shopifyInventoryProduct),
			title: shopifyInventoryVendor.getTitle(shopifyInventoryProduct)
		},
		vendor,
		vendorProduct,
		{
			matchTitle: true
		}
	);
};
