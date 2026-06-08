import logger from '../utils/logger';
import {
	SHOPIFY_INVENTORY_ON_HAND_NEW,
	SHOPIFY_INVENTORY_ON_HAND_CURRENT,
	matchInventory
} from '../shopify/inventory';
import { parseSKU } from '../utils/helpers';
import { forEachVendor } from '../vendors2';

type VendorInventory = Record<string, any>;

// Updates existing items in inventory
// The full inventory is not downloaded, only updated rows
const updateInventory = (shopifyInventoryCSV: any[], vendorInventory: VendorInventory, { maxQuantity }: { maxQuantity: number }) => {
	const shopifyInventoryUpdates: any[] = [];
	forEachVendor((key, vendor) => {
		if (!vendor.canUpdateInventory()) {
				logger.debug(`[SKIP] no inventory update support for ${vendor.name}`);
				return;
		}

		let vendorInventoryCSV = vendorInventory[key];
		if (!vendorInventoryCSV) {
			logger.log(`[SKIP] no inventory file selected for ${vendor.name}`);
			return;
		}

		for (const vendorItem of vendorInventoryCSV) {
			const vendorItemSKU = parseSKU(vendor.getSKU(vendorItem));
			if (!vendorItemSKU) {
				continue;
			}

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
			const shopifyItemQuantity = +shopifyItem[SHOPIFY_INVENTORY_ON_HAND_CURRENT];
			if (shopifyItemQuantity === vendorItemQuantity) {
				logger.debug(`[QUANTITY MATCH] ${vendor.name} SKU ${vendorItemSKU} quantity ${vendorItemQuantity} matches shopify inventory: ${shopifyItemQuantity}`);
			} else {
				logger.log(`[QUANTITY UPDATE] ${vendor.name} SKU ${vendorItemSKU} quantity ${vendorItemQuantity} differs in shopify inventory: ${shopifyItemQuantity}`);
				shopifyItem[SHOPIFY_INVENTORY_ON_HAND_NEW] = vendorItemQuantity;
				updated = true;
			}

			// If there are any updates, push to updates array
			if (updated) {
				shopifyInventoryUpdates.push(shopifyItem);
			}
		}
	});
	return shopifyInventoryUpdates;
}

export default updateInventory;