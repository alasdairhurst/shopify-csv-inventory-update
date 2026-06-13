import { describe, expect, it } from 'vitest';
import parseProductsCSV from '../../src/functions/parseProductsCSV.ts';
import { ReydonInventory } from '../../src/vendors/reydon.ts';
import { loadExampleFixture } from '../testUtils/fixtureHelpers.ts';

describe('vendor Reydon Inventory', () => {
	const reydonInventory = new ReydonInventory();

	it ('Validates the vendor features', () => {
		expect(reydonInventory.name).toBe('reydon-inventory');
		expect(reydonInventory.importLabel).toBe('Reydon Inventory CSV');
		expect(reydonInventory.useBarcodeForExclusiveMatching).toBe(undefined);
		expect(reydonInventory.useTitleForMatching).toBe(true);
		expect(reydonInventory.canAddProducts()).toBe(false);
		expect(reydonInventory.canUpdateInventory()).toBe(true);
	});

  it('accepts Reydon inventory headers and parses the example file', async () => {
    const reydonCsv = loadExampleFixture(['vendors', 'reydon', 'inventory.csv']);
    const products = await parseProductsCSV(reydonCsv, reydonInventory);
    expect(products.length).toBeGreaterThan(0);

		const product = products[0]!;
		expect(reydonInventory.getSKU(product)).toEqual('52824');
		expect(reydonInventory.getQuantity(product)).toEqual(0);
		expect(reydonInventory.getTitle(product)).toEqual('Franklin Outdoor X-40 Pickleball');
  });
});
