import { describe, expect, it } from 'vitest';
import parseProductsCSV from '../../src/functions/parseProductsCSV.ts';
import { Cartas } from '../../src/vendors/cartas.ts';
import { loadExampleFixture } from '../testUtils/fixtureHelpers.ts';

describe('vendor Cartas', () => {
	const cartas = new Cartas();

	it ('Validates the vendor features', () => {
		expect(cartas.name).toBe('cartas');
		expect(cartas.importLabel).toBe('Cartas Products CSV');
		expect(cartas.useBarcodeForExclusiveMatching).toBe(undefined);
		expect(cartas.useTitleForMatching).toBe(true);
		expect(cartas.canAddProducts()).toBe(true);
		expect(cartas.canUpdateInventory()).toBe(true);
	});

  it('accepts Cartas headers and parses the product example file', async () => {
    const cartasCsv = loadExampleFixture(['vendors', 'cartas', 'product.csv']);
    const products = await parseProductsCSV(cartasCsv, cartas);

    expect(products.length).toBeGreaterThan(0);
		const product = products[0]!;

		expect(cartas.getTitle(product)).toEqual('Mizuno Core Short Sleeve T Shirt');
		expect(cartas.getDescription(product)).toEqual(`The Mizuno Core Shirt has everything you need to perform!
Features and benefits
Designed for all sports
Extreme soft fabric for even more comfort
Active fit and athletic silhouette
Sharp lines for the best air displacement
Made of 100% polyester`);
		expect(cartas.getVendor(product)).toEqual('Mizuno');
		expect(cartas.getSKU(product)).toEqual('MIZU00001');
		expect(cartas.getMainImageURL(product)).toEqual('https://cartasport.net/main_images/MIZU00001.jpg');
		expect(cartas.getVariantImageURL(product)).toEqual('https://cartasport.net/main_images/MIZU00001.jpg');
		expect(cartas.getQuantity(product)).toEqual(4);
		expect(cartas.getType(product)).toEqual('CLOTHING');
		expect(cartas.getVAT(product)).toEqual(1.2);
		expect(cartas.getTaxable(product)).toEqual(true);
		expect(cartas.getRRP(product)).toEqual(28.99);
		expect(cartas.getShipping(product)).toEqual(5);
		expect(cartas.getPrice(product)).toEqual(22.99);
		expect(cartas.getWeightGrams(product)).toEqual(0);
		expect(cartas.getAdditionalImages(product)).toEqual([]);
		expect(cartas.getVariants(product)).toEqual([
			{
				name: 'Colour',
				value: 'Black'
			},
			{
				name: 'Size',
				value: 'Small'
			}
		]);
		expect(cartas.getBarcode(product)).toEqual('5054698692271');
		expect(cartas.getVariantCorrelationId(product)).toEqual('10032007');
  });
});
