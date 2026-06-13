import { describe, expect, it } from 'vitest';
import parseProductsCSV from '../../src/functions/parseProductsCSV.ts';
import { Reydon } from '../../src/vendors/reydon.ts';
import { loadExampleFixture } from '../testUtils/fixtureHelpers.ts';

describe('vendor Reydon', () => {
	const reydon = new Reydon();

	it ('Validates the vendor features', () => {
		expect(reydon.name).toBe('reydon');
		expect(reydon.importLabel).toBe('Reydon CSV');
		expect(reydon.useBarcodeForExclusiveMatching).toBe(true);
		expect(reydon.useTitleForMatching).toBe(true);
		expect(reydon.canAddProducts()).toBe(true);
		expect(reydon.canUpdateInventory()).toBe(true);
	});

  it('accepts Reydon headers and parses the product example file', async () => {
    const reydonCsv = loadExampleFixture(['vendors', 'reydon', 'product.csv']);
    const products = await parseProductsCSV(reydonCsv, reydon);

    expect(products.length).toBeGreaterThan(0);
		const product = products[0]!;

		expect(reydon.getTitle(product)).toEqual('\'47 Arsenal Basic Cap');
		expect(reydon.getDescription(product)).toEqual(`<p>• Flat Embroidered Logos </p><p>• Brushed Cotton Material </p><p>• Adjustable Velcro Closure</p><p>    <br></p>`);
		expect(reydon.getVendor(product)).toEqual('47');
		expect(reydon.getSKU(product)).toEqual('EPL-MAC01BCV-BKA');
		expect(reydon.getMainImageURL(product)).toEqual('https://images.reydonsports.com/website/EPL-MAC01BCV-BKA.png');
		expect(reydon.getVariantImageURL(product)).toEqual('https://images.reydonsports.com/website/EPL-MAC01BCV-BKA.png');
		expect(reydon.getQuantity(product)).toEqual(79);
		expect(reydon.getVAT(product)).toEqual(1.2);
		expect(reydon.getTaxable(product)).toEqual(true);
		expect(reydon.getRRP(product)).toEqual(20.99);
		expect(reydon.getShipping(product)).toEqual(5);
		expect(reydon.getPrice(product)).toEqual(16.99);
		expect(reydon.getWeightGrams(product)).toEqual(87);
		expect(reydon.getVariants(product)).toEqual([
			{
				name: 'Colour',
				value: 'Black'
			}
		]);
		expect(reydon.getBarcode(product)).toEqual('198589463146');
		expect(reydon.getVariantCorrelationId(product)).toEqual('\'47 Arsenal Basic Cap');
		expect(reydon.orderBy(product)).toEqual('\'47 Arsenal Basic Cap');
  });
});
