import { describe, expect, it } from 'vitest';
import * as csv from '../../src/files/csv.ts';
import parseProductsCSV from '../../src/functions/parseProductsCSV.ts';
import updateInventory from '../../src/functions/updateInventory.ts';
import { Blitz } from '../../src/vendors/blitz.ts';
import { assertCsvFixtureMatches, loadExampleFixture, isRegenFixtures } from '../testUtils/fixtureHelpers.ts';

describe('e2e updateInventory', () => {
  it('generates expected inventory updates for Blitz fixture', async () => {
    const shopifyInventoryCsv = loadExampleFixture(['shopify', 'inventory.csv']);
    const [shopifyInventory] = await csv.parseString<any>(shopifyInventoryCsv);
    const blitzCsv = loadExampleFixture(['vendors', 'blitz', 'blitz.csv']);
    const blitzProducts = await parseProductsCSV(blitzCsv, new Blitz());

    const updates = updateInventory(shopifyInventory as any, { blitz: blitzProducts as any }, { maxQuantity: 50 });
    const updatesCsv = csv.unparse(updates);

    await assertCsvFixtureMatches(updatesCsv, 'blitz-update-inventory.csv', ['Handle', 'SKU', 'On hand (new)']);
    expect(updates.every(row => Number(row['On hand (new)']) <= 50)).toBe(true);
    expect(updates.every(row => Number(row['On hand (new)']) >= 0)).toBe(true);
    expect(updates.length).toBeGreaterThan(0);

    if (isRegenFixtures()) {
      expect(updates.length).toBeGreaterThan(0);
    }
  }, 90000);
});
