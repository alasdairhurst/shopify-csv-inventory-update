import { describe, expect, it } from 'vitest';
import parseProductsCSV from '../../src/functions/parseProductsCSV.ts';
import { Blitz } from '../../src/vendors/blitz.ts';
import { loadExampleFixture } from '../testUtils/fixtureHelpers.ts';

describe('vendor Blitz', () => {
	const blitz = new Blitz();

	it('parses blitz csv and validates a single product', async () => {
		const blitzCsv = loadExampleFixture(['vendors', 'blitz', 'blitz.csv']);
		const products = await parseProductsCSV(blitzCsv, blitz);

		expect(products.length).toBeGreaterThan(0);
		const product = products[0]!;

		expect(blitz.canAddProducts()).toBe(true);
		expect(blitz.canUpdateInventory()).toBe(true);
		expect(blitz.getSKU(product)).toEqual('16491');
		expect(blitz.getQuantity(product)).toEqual(0);
		expect(blitz.getPrice(product)).toEqual(39.99);
		expect(blitz.getVAT(product)).toEqual(1.2);
		expect(blitz.getShipping(product)).toEqual(5);
		expect(blitz.getRRP(product)).toEqual(39.99);
		expect(blitz.getMainImageURL(product)).toEqual(
			'https://images.blitzsport.com/item/blitz-aero-training-shoes.jpg'
		);
		expect(blitz.getVariantImageURL(product)).toEqual(
			'https://images.blitzsport.com/item/blitz-aero-training-shoes.jpg'
		);
		expect(blitz.getAdditionalImages(product)).toEqual([
			'https://images.blitzsport.com/item/blitz-aero-training-shoes-1.jpg',
			'https://images.blitzsport.com/item/blitz-aero-training-shoes-2.jpg',
			'https://images.blitzsport.com/item/blitz-aero-training-shoes-3.jpg'
		]);
		expect(blitz.getTitle(product)).toEqual('Blitz Aero Training Shoes');
		expect(blitz.getBarcode(product)).toEqual('5055915138374');
		expect(blitz.getTaxable(product)).toEqual(true);
		expect(blitz.getVariantCorrelationId(product)).toEqual('16486');
		expect(blitz.getFeatures(product)).toEqual([
			'Multi-functional shoe for Martial Arts or leisure',
			'Convenient slip-on shoe with non-slip rubber sole',
			'Pivot spot on sole for kicking and spinning skills',
			'Quality stitching with attention to stress points',
			'Soft Nama Hide™ leather shoe'
		]);
		expect(blitz.getWeightGrams(product)).toEqual(1480);
		expect(blitz.getType(product)).toEqual('Clothing > Footwear');
		expect(blitz.getVendor(product)).toEqual('Blitz');
		expect(blitz.getDescription(product)).toEqual(
			'These multi-functional Blitz Aero Training Shoes are ideal for all Martial Arts and leisure activities. Whether worn when training, to or from the club or for general use, this convenient slip-on shoe combines a thin wedged shaped, rubber non-slip, sole for a comfortable fit and a circular pivot spot on the ball of the foot to allow for kicking and spinning techniques. High quality stitching is featured throughout the shoe with attention to stress points, ensuring resilience and durability. White shoe with black tongue, heel, sole and padded inside. Easy to wipe clean before and after use. Soft Nama Hide ™ Leather.'
		);
		expect(blitz.getVariants(product)).toEqual([
			{
				name: 'Size',
				value: 'UK 10'
			}
		]);
	});
});
