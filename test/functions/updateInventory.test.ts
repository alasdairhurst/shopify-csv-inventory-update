import { describe, expect, it } from 'vitest';
import * as csv from '../../src/files/csv.ts';
import updateInventory from '../../src/functions/updateInventory.ts';
import { ReydonInventoryProduct } from '../../src/vendors/reydon.ts';
import { Blitz } from '../../src/vendors/blitz.ts';
import parseProductsCSV from '../../src/functions/parseProductsCSV.ts';
import { ShopifyInventoryProduct } from '../../src/vendors/shopify.ts';
import { assertJsonFixtureMatches, loadExampleFixture } from '../testUtils/fixtureHelpers.ts';

const makeShopifyProduct = (product: Partial<ShopifyInventoryProduct>): ShopifyInventoryProduct => {
	return {
			Handle: '',
			Title: '',
			'Option1 Name': 'Title',
			'Option1 Value': 'Default Title',
			'Option2 Name': '',
			'Option2 Value': '',
			'Option3 Name': '',
			'Option3 Value': '',
			SKU: '',
			'HS Code': '',
			COO: '',
			Location: '',
			'Bin name': '',
			'Incoming (not editable)': '',
			'Unavailable (not editable)': '',
			'Committed (not editable)': '',
			'Available (not editable)': '',
			'On hand (current)': '3',
			'On hand (new)': '',
			...product
		};
}

describe('updateInventory()', () => {
  it('applies vendor quantity updates and respects maxQuantity', () => {
    const shopifyInventory = [
			makeShopifyProduct({ SKU: 'ABC123', Handle: 'test-handle-1', Title: 'Test Item 1'}),
			makeShopifyProduct({ SKU: 'ABC456', Handle: 'test-handle-2', Title: 'Test Item 2'}),
			makeShopifyProduct({ SKU: 'ABC789', Handle: 'test-handle-3', Title: 'Test Item 3'})
    ];

    const reydonInventory: ReydonInventoryProduct[] = [
      {
        'Product Name': 'Test Item 1',
        Code: 'ABC123',
        Quantity: '20'
      },
			{
        'Product Name': 'Test Item 2',
        Code: 'ABC456',
        Quantity: '5'
      }
    ];

		const vendorInventory = { 'reydon-inventory': reydonInventory };
		const options = { maxQuantity: 10 };
    const updates = updateInventory(shopifyInventory, vendorInventory, options);

    expect(updates).toHaveLength(2);
		const product1 = updates[0]!;
		expect(product1.SKU).toBe('ABC123');
    expect(product1['On hand (new)']).toBe('10');

		const product2 = updates[1]!;
		expect(product2.SKU).toBe('ABC456');
    expect(product2['On hand (new)']).toBe('5');
  });

	it('ignores products that aren\'t found in shopify', async () => {
		const shopifyInventory = [
			makeShopifyProduct({
				SKU: 'BBC432',
				Handle: 'test-handle-1',
				Title: 'Test Item 1',
				'On hand (current)': '10'
			})
    ];

    const reydonInventory: ReydonInventoryProduct[] = [
      {
        'Product Name': 'Test Item',
        Code: 'ABC123',
        Quantity: '20'
      }
    ];

		const vendorInventory = { 'reydon-inventory': reydonInventory };
		const options = { maxQuantity: 10 };
    const updates = updateInventory(shopifyInventory, vendorInventory, options);

    expect(updates).toHaveLength(0);
	});

	it('ignores products that already have the expected quantity', async () => {
		const shopifyInventory = [
			makeShopifyProduct({
				SKU: 'ABC123',
				Handle: 'test-handle-1',
				Title: 'Test Item 1',
				'On hand (current)': '10'
			})
    ];

    const reydonInventory: ReydonInventoryProduct[] = [
      {
        'Product Name': 'Test Item',
        Code: 'ABC123',
        Quantity: '10'
      }
    ];

		const vendorInventory = { 'reydon-inventory': reydonInventory };
		const options = { maxQuantity: 10 };
    const updates = updateInventory(shopifyInventory, vendorInventory, options);

    expect(updates).toHaveLength(0);
	});

  it('Updates inventory with blitz csv and asserts the full output', async () => {
    const inventoryCsv = loadExampleFixture(['shopify', 'inventory.csv']);
    const [inventoryRows] = await csv.parseString<any>(inventoryCsv);
    const blitzCsv = loadExampleFixture(['vendors', 'blitz', 'blitz.csv']);
    const blitzProducts = await parseProductsCSV(blitzCsv, new Blitz());

		const vendorInventory = { blitz: blitzProducts };
		const options = { maxQuantity: 25 };
    const updates = updateInventory(inventoryRows, vendorInventory, options);

		// Assert some general functional guidelines to avoid bad test data
    expect(updates).toHaveLength(1261);

		// Validate maxQuantity is a number and between 0 and 25
    expect(updates.every(row => Number(row['On hand (new)']) <= 25)).toBe(true);
    expect(updates.every(row => Number(row['On hand (new)']) >= 0)).toBe(true);

		// Assert against the full fixture for consistency
		assertJsonFixtureMatches('blitz-update-inventory.json', updates);
  });
});
