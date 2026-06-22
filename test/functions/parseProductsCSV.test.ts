import { describe, expect, it } from 'vitest';
import parseProductsCSV from '../../src/functions/parseProductsCSV.ts';
import { Blitz } from '../../src/vendors/blitz.ts';
import ExpectedError from '../../src/utils/ExpectedError.ts';
import { loadExampleFixture } from '../testUtils/fixtureHelpers.ts';

describe('parseProductsCSV()', () => {
	it('parses a Blitz example fixture and returns product rows', async () => {
		const blitzCsv = loadExampleFixture(['vendors', 'blitz', 'blitz.csv']);
		const products = await parseProductsCSV(blitzCsv, new Blitz());

		expect(products.length).toBeGreaterThan(0);
		expect(products[0]!.Sku).not.toBe('');
		expect(products[0]!.Title).not.toBe('');
		expect(products[0]!.TradePrice).not.toBe('');
	});

	it('throws an ExpectedError when headers do not match the vendor requirements', async () => {
		const badCsv = 'Title,Link,Description\nBroken Product,https://example.com,Missing SKU header';

		await expect(async () => {
			await parseProductsCSV(badCsv, new Blitz());
		}).rejects.toThrow(ExpectedError);
	});
});
