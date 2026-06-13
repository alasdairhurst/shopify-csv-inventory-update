import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as csv from '../../src/files/csv.ts';
import updateInventory from '../../src/functions/updateInventory.ts';
import { ReydonInventory, ReydonInventoryProduct } from '../../src/vendors/reydon.ts';
import { Blitz } from '../../src/vendors/blitz.ts';
import parseProductsCSV from '../../src/functions/parseProductsCSV.ts';

const readFixture = (segments: string[]) => readFileSync(resolve(__dirname, '..', ...segments), 'utf8');

describe('updateInventory()', () => {
  it('applies vendor quantity updates and respects maxQuantity', () => {
    const shopifyInventory = [
      {
        Handle: 'test-handle',
        Title: 'Test Item',
        'Option1 Name': 'Title',
        'Option1 Value': 'Default Title',
        'Option2 Name': '',
        'Option2 Value': '',
        'Option3 Name': '',
        'Option3 Value': '',
        SKU: 'ABC123',
        'HS Code': '',
        COO: '',
        Location: '',
        'Bin name': '',
        'Incoming (not editable)': '',
        'Unavailable (not editable)': '',
        'Committed (not editable)': '',
        'Available (not editable)': '',
        'On hand (current)': '3',
        'On hand (new)': ''
      }
    ];

    const vendorInventory: ReydonInventoryProduct[] = [
      {
        'Product Name': 'Test Item',
        Code: 'ABC123',
        Quantity: '20'
      }
    ];

    const updates = updateInventory(shopifyInventory as any, { 'reydon-inventory': vendorInventory }, { maxQuantity: 10 });

    expect(updates.length).toBe(1);
    expect(updates[0]['On hand (new)']).toBe('10');
  });

  it('updates Blitz inventory from the example fixture and limits values to 25', async () => {
    const inventoryCsv = readFixture(['examples', 'shopify', 'inventory.csv']);
    const [inventoryRows] = await csv.parseString<any>(inventoryCsv);
    const blitzCsv = readFixture(['examples', 'vendors', 'blitz', 'blitz.csv']);
    const blitzProducts = await parseProductsCSV(blitzCsv, new Blitz());

    const updates = updateInventory(inventoryRows as any, { blitz: blitzProducts as any }, { maxQuantity: 25 });

    expect(updates.length).toBeGreaterThan(0);
    expect(updates.every(row => Number(row['On hand (new)']) <= 25)).toBe(true);
    expect(updates.every(row => Number(row['On hand (new)']) >= 0)).toBe(true);
  });
});
