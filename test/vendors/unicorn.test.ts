import { describe, expect, it } from 'vitest';
import parseProductsCSV from '../../src/functions/parseProductsCSV.ts';
import { Unicorn } from '../../src/vendors/unicorn.ts';
import { loadExampleFixture } from '../testUtils/fixtureHelpers.ts';

describe('vendor Unicorn', () => {
	const unicorn = new Unicorn();

	it ('Validates the vendor features', () => {
		expect(unicorn.name).toBe('unicorn');
		expect(unicorn.importLabel).toBe('Unicorn CSV');
		expect(unicorn.useBarcodeForExclusiveMatching).toBe(true);
		expect(unicorn.useTitleForMatching).toBe(true);
		expect(unicorn.canAddProducts()).toBe(false);
		expect(unicorn.canUpdateInventory()).toBe(true);
	});

  it('accepts unicorn headers and parses the example file', async () => {
    const unicornCsv = loadExampleFixture(['vendors', 'unicorn', 'unicorn.csv']);
    const products = await parseProductsCSV(unicornCsv, unicorn);
    expect(products.length).toBeGreaterThan(0);

		const product = products[0]!;
		expect(unicorn.getSKU(product)).toEqual('52087');
		expect(unicorn.getQuantity(product)).toEqual(161);
		expect(unicorn.getBarcode(product)).toEqual('054722912738');
		expect(unicorn.getTitle(product)).toEqual('Prism Snooker Cue 2 Piece Split 9.5mm Tip');
  });
});
