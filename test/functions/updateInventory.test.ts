import { describe, expect, it } from 'vitest';
import * as csv from '../../src/files/csv.ts';
import updateInventory from '../../src/functions/updateInventory.ts';
import { Cartasport, CartasportInventory } from '../../src/vendors/cartasport.ts';
import { Reydon, ReydonInventory, ReydonInventoryProduct } from '../../src/vendors/reydon.ts';
import { Tuf, TufInventory } from '../../src/vendors/tuf.ts';
import { Unicorn } from '../../src/vendors/unicorn.ts';
import { Blitz } from '../../src/vendors/blitz.ts';
import parseProductsCSV from '../../src/functions/parseProductsCSV.ts';
import { ShopifyInventoryProduct } from '../../src/vendors/shopify.ts';
import { assertCsvFixtureMatches, assertJsonFixtureMatches, loadExampleFixture, INVENTORY_CSV_KEYS } from '../testUtils/fixtureHelpers.ts';
import { shopifyInventoryVendor } from '../../src/vendors/index.ts';

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
    const [inventoryRows] = await csv.parseString(inventoryCsv, shopifyInventoryVendor);
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

	it('updates inventory with Tuf product CSV and asserts the full CSV output', async () => {
		const inventoryCsv = loadExampleFixture(['shopify', 'inventory.csv']);
		const [inventoryRows] = await csv.parseString(inventoryCsv, shopifyInventoryVendor);
		const tufCsv = loadExampleFixture(['vendors', 'tuf', 'product.csv']);
		const tufProducts = await parseProductsCSV(tufCsv, new Tuf());

		const updates = updateInventory(inventoryRows, { tuf: tufProducts }, { maxQuantity: 25 });

		expect(updates.every(row => Number(row['On hand (new)']) <= 25)).toBe(true);
		expect(updates.every(row => Number(row['On hand (new)']) >= 0)).toBe(true);

		await assertCsvFixtureMatches(csv.unparse(updates), 'tuf-update-inventory.csv', INVENTORY_CSV_KEYS, shopifyInventoryVendor);
	});

	it('updates inventory with TufInventory CSV and asserts the full CSV output', async () => {
		const inventoryCsv = loadExampleFixture(['shopify', 'inventory.csv']);
		const [inventoryRows] = await csv.parseString(inventoryCsv, shopifyInventoryVendor);
		const tufInventoryCsv = loadExampleFixture(['vendors', 'tuf', 'inventory.csv']);
		const tufInventoryProducts = await parseProductsCSV(tufInventoryCsv, new TufInventory());

		const updates = updateInventory(inventoryRows, { 'tuf-inventory': tufInventoryProducts }, { maxQuantity: 25 });

		expect(updates.every(row => Number(row['On hand (new)']) <= 25)).toBe(true);
		expect(updates.every(row => Number(row['On hand (new)']) >= 0)).toBe(true);

		await assertCsvFixtureMatches(csv.unparse(updates), 'tuf-inventory-update-inventory.csv', INVENTORY_CSV_KEYS, shopifyInventoryVendor);
	});

	it('updates inventory with Cartas product CSV and asserts the full CSV output', async () => {
		const inventoryCsv = loadExampleFixture(['shopify', 'inventory.csv']);
		const [inventoryRows] = await csv.parseString(inventoryCsv, shopifyInventoryVendor);
		const cartasCsv = loadExampleFixture(['vendors', 'cartas', 'product.csv']);
		const cartasProducts = await parseProductsCSV(cartasCsv, new Cartasport());

		const updates = updateInventory(inventoryRows, { cartas: cartasProducts }, { maxQuantity: 25 });

		expect(updates.every(row => Number(row['On hand (new)']) <= 25)).toBe(true);
		expect(updates.every(row => Number(row['On hand (new)']) >= 0)).toBe(true);

		await assertCsvFixtureMatches(csv.unparse(updates), 'cartas-update-inventory.csv', INVENTORY_CSV_KEYS, shopifyInventoryVendor);
	});

	it('updates inventory with CartasInventory CSV and asserts the full CSV output', async () => {
		const inventoryCsv = loadExampleFixture(['shopify', 'inventory.csv']);
		const [inventoryRows] = await csv.parseString(inventoryCsv, shopifyInventoryVendor);
		const cartasInventoryCsv = loadExampleFixture(['vendors', 'cartas', 'inventory.csv']);
		const cartasInventoryProducts = await parseProductsCSV(cartasInventoryCsv, new CartasportInventory());

		const updates = updateInventory(inventoryRows, { 'cartas-inventory': cartasInventoryProducts }, { maxQuantity: 25 });

		expect(updates.every(row => Number(row['On hand (new)']) <= 25)).toBe(true);
		expect(updates.every(row => Number(row['On hand (new)']) >= 0)).toBe(true);

		await assertCsvFixtureMatches(csv.unparse(updates), 'cartas-inventory-update-inventory.csv', INVENTORY_CSV_KEYS, shopifyInventoryVendor);
	});

	it('updates inventory with Reydon product CSV and asserts the full CSV output', async () => {
		const inventoryCsv = loadExampleFixture(['shopify', 'inventory.csv']);
		const [inventoryRows] = await csv.parseString(inventoryCsv, shopifyInventoryVendor);
		const reydonCsv = loadExampleFixture(['vendors', 'reydon', 'product.csv']);
		const reydonProducts = await parseProductsCSV(reydonCsv, new Reydon());

		const updates = updateInventory(inventoryRows, { reydon: reydonProducts }, { maxQuantity: 25 });

		expect(updates.every(row => Number(row['On hand (new)']) <= 25)).toBe(true);
		expect(updates.every(row => Number(row['On hand (new)']) >= 0)).toBe(true);

		await assertCsvFixtureMatches(csv.unparse(updates), 'reydon-update-inventory.csv', INVENTORY_CSV_KEYS, shopifyInventoryVendor);
	});

	it('updates inventory with ReydonInventory CSV and asserts the full CSV output', async () => {
		const inventoryCsv = loadExampleFixture(['shopify', 'inventory.csv']);
		const [inventoryRows] = await csv.parseString(inventoryCsv, shopifyInventoryVendor);
		const reydonInventoryCsv = loadExampleFixture(['vendors', 'reydon', 'inventory.csv']);
		const reydonInventoryProducts = await parseProductsCSV(reydonInventoryCsv, new ReydonInventory());

		const updates = updateInventory(inventoryRows, { 'reydon-inventory': reydonInventoryProducts }, { maxQuantity: 25 });

		expect(updates.every(row => Number(row['On hand (new)']) <= 25)).toBe(true);
		expect(updates.every(row => Number(row['On hand (new)']) >= 0)).toBe(true);

		await assertCsvFixtureMatches(csv.unparse(updates), 'reydon-inventory-update-inventory.csv', INVENTORY_CSV_KEYS, shopifyInventoryVendor);
	});

	it('updates inventory with Unicorn CSV and asserts the full CSV output', async () => {
		const inventoryCsv = loadExampleFixture(['shopify', 'inventory.csv']);
		const [inventoryRows] = await csv.parseString(inventoryCsv, shopifyInventoryVendor);
		const unicornCsv = loadExampleFixture(['vendors', 'unicorn', 'unicorn.csv']);
		const unicornProducts = await parseProductsCSV(unicornCsv, new Unicorn());

		const updates = updateInventory(inventoryRows, { unicorn: unicornProducts }, { maxQuantity: 25 });

		expect(updates.every(row => Number(row['On hand (new)']) <= 25)).toBe(true);
		expect(updates.every(row => Number(row['On hand (new)']) >= 0)).toBe(true);

		await assertCsvFixtureMatches(csv.unparse(updates), 'unicorn-update-inventory.csv', INVENTORY_CSV_KEYS, shopifyInventoryVendor);
	});
});
