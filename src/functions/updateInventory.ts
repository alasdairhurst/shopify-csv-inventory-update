import logger from '../utils/logger.ts';
import { matchInventory } from '../shopify/inventory.ts';
import { parseSKU } from '../utils/helpers.ts';
import { vendors, Product } from '../vendors/index.ts';
import { ShopifyInventoryProduct } from '../vendors/shopify.ts';

// Updates existing items in inventory
// The full inventory is not downloaded, only updated rows
const updateInventory = (shopifyInventoryCSV: ShopifyInventoryProduct[], vendorInventory: Record<string, Product[]>, { maxQuantity }: { maxQuantity: number }) => {
	const shopifyInventoryUpdates: ShopifyInventoryProduct[] = [];
	for (const vendor of vendors) {
		if (!vendor.canUpdateInventory()) {
				logger.debug(`[SKIP] no inventory update support for ${vendor.name}`);
				continue;
		}

		let vendorInventoryCSV = vendorInventory[vendor.name];
		if (!vendorInventoryCSV) {
			logger.log(`[SKIP] no inventory file selected for ${vendor.name}`);
			continue;
		}

		for (const vendorItem of vendorInventoryCSV) {
			const vendorItemSKU = parseSKU(vendor.getSKU(vendorItem));
			const shopifyItem = shopifyInventoryCSV.find((r: any) => {
				return !!matchInventory(r, vendor, vendorItem)
			});

			if (!shopifyItem) {
				logger.debug(`[NOT FOUND] ${vendor.name} SKU ${vendorItemSKU} in shopify inventory`);
				continue;
			}
			logger.debug(`[FOUND] ${vendor.name} SKU ${vendorItemSKU} in shopify inventory`);
			let updated = false

			// Update quantity

			// Cap the new quantity
			const vendorItemQuantity = Math.min(vendor.getQuantity(vendorItem), maxQuantity);
			const shopifyItemQuantity = Number(shopifyItem['On hand (current)']);
			if (shopifyItemQuantity === vendorItemQuantity) {
				logger.debug(`[QUANTITY MATCH] ${vendor.name} SKU ${vendorItemSKU} quantity ${vendorItemQuantity} matches shopify inventory: ${shopifyItemQuantity}`);
			} else {
				logger.log(`[QUANTITY UPDATE] ${vendor.name} SKU ${vendorItemSKU} quantity ${vendorItemQuantity} differs in shopify inventory: ${shopifyItemQuantity}`);
				shopifyItem['On hand (new)'] = String(vendorItemQuantity);
				updated = true;
			}

			// If there are any updates, push to updates array
			if (updated) {
				shopifyInventoryUpdates.push(shopifyItem);
			}
		}
	}
	return shopifyInventoryUpdates;
}

export default updateInventory;