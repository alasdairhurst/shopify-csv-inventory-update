import { describe, expect, it } from 'vitest';
import { parseString } from '../../src/files/csv.ts';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const fixturePath = resolve(__dirname, '..', 'examples', 'shopify', 'products.csv');

describe('CSV parsing', () => {
  it('parses Shopify products fixture and returns rows and headers', async () => {
    const csvText = readFileSync(fixturePath, 'utf8');
    const [rows, headers] = await parseString<Record<string, string>>(csvText);

    expect(headers).toContain('Handle');
    expect(headers).toContain('Variant SKU');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveProperty('Handle');
    expect(rows[0]).toHaveProperty('Variant SKU');
  });
});
