import { describe, expect, it } from 'vitest';
import parseProductsCSV from '../../src/functions/parseProductsCSV.ts';
import { CartasInventory } from '../../src/vendors/cartas.ts';
import { loadExampleFixture } from '../testUtils/fixtureHelpers.ts';

describe('vendor Cartas Inventory', () => {
	const cartasInventory = new CartasInventory();

	it ('Validates the vendor features', () => {
		expect(cartasInventory.name).toBe('cartas-inventory');
		expect(cartasInventory.importLabel).toBe('Cartas Inventory CSV');
		expect(cartasInventory.useBarcodeForExclusiveMatching).toBe(undefined);
		expect(cartasInventory.useTitleForMatching).toBe(true);
		expect(cartasInventory.canAddProducts()).toBe(false);
		expect(cartasInventory.canUpdateInventory()).toBe(true);
	});

  it('accepts Cartas inventory headers and parses the example file', async () => {
    const cartasCsv = loadExampleFixture(['vendors', 'cartas', 'inventory.csv']);
    const products = await parseProductsCSV(cartasCsv, cartasInventory);

    expect(products.length).toBeGreaterThan(0);
		const product = products[0]!;

		expect(cartasInventory.getTitle(product)).toEqual('FLOOR TAPE 1 1/2\'\' BLACK');
		expect(cartasInventory.getSKU(product)).toEqual('1FTB');
		expect(cartasInventory.getQuantity(product)).toEqual(1);
  });
});
