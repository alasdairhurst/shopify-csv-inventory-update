import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import parseProductsCSV from '../../src/functions/parseProductsCSV.ts';
import { Blitz } from '../../src/vendors/blitz.ts';
import ExpectedError from '../../src/utils/ExpectedError.ts';

const readFixture = (segments: string[]) => readFileSync(resolve(__dirname, '..', ...segments), 'utf8');

describe('parseProductsCSV()', () => {
  it('parses a Blitz example fixture successfully', async () => {
    const blitzCsv = readFixture(['examples', 'vendors', 'blitz', 'blitz.csv']);
    const products = await parseProductsCSV(blitzCsv, new Blitz());

    expect(products.length).toBeGreaterThan(0);
    expect(products[0].Sku).toBeDefined();
    expect(products[0].Title).toBeDefined();
    expect(products[0].getQuantity).toBeUndefined();
  });

  it('throws an ExpectedError when headers do not match the vendor requirements', async () => {
    const badCsv = 'Title,Link,Description\nBroken Product,https://example.com,Missing SKU header';

    await expect(async () => {
      await parseProductsCSV(badCsv, new Blitz());
    }).rejects.toThrow(ExpectedError);
  });
});
