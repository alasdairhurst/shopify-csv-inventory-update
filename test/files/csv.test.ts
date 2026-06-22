import { describe, expect, it } from 'vitest';
import { parseString, unparse } from '../../src/files/csv.ts';
import { loadExampleFixture } from '../testUtils/fixtureHelpers.ts';

describe('CSV parsing', () => {
	it('parses Shopify products fixture and returns rows and headers', async () => {
		const csvText = loadExampleFixture(['shopify', 'products.csv']);
		const [rows, headers] = await parseString<Record<string, string>>(csvText);

		expect(headers).toContain('Handle');
		expect(headers).toContain('Variant SKU');
		expect(rows.length).toBeGreaterThan(0);
		expect(rows[0]).toHaveProperty('Handle');
		expect(rows[0]).toHaveProperty('Variant SKU');
	});

	it('round-trips data through unparse and parseString', async () => {
		const original = [{ Handle: 'test-handle', Title: 'Test Product' }];
		const csvText = unparse(original);
		const [rows, headers] = await parseString<Record<string, string>>(csvText);

		expect(headers).toEqual(['Handle', 'Title']);
		expect(rows).toEqual(original);
	});
});
