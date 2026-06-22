import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as csv from '../../src/files/csv.ts';
import { expect } from 'vitest';
import { Vendor } from '../../src/vendors/vendor.ts';

type CsvRow = Record<string, string>;

const root = resolve(__dirname, '..');
const expectedRoot = resolve(root, 'fixtures', 'expected');

export const PRODUCT_CSV_KEYS = [
	'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Product Category', 'Type', 'Tags',
	'Published', 'Status', 'Gift Card',
	'Option1 Name', 'Option1 Value', 'Option2 Name', 'Option2 Value', 'Option3 Name', 'Option3 Value',
	'Variant SKU', 'Variant Grams', 'Variant Inventory Tracker', 'Variant Inventory Policy',
	'Variant Fulfillment Service', 'Variant Price', 'Variant Compare At Price',
	'Variant Requires Shipping', 'Variant Taxable', 'Variant Barcode',
	'Variant Weight Unit', 'Image Src', 'Variant Image'
];

export const INVENTORY_CSV_KEYS = [
	'Handle', 'Title', 'Option1 Name', 'Option1 Value', 'Option2 Name', 'Option2 Value',
	'Option3 Name', 'Option3 Value', 'SKU', 'HS Code', 'COO', 'Location',
	'Bin name', 'Incoming (not editable)', 'Unavailable (not editable)',
	'Committed (not editable)', 'Available (not editable)', 'On hand (current)', 'On hand (new)'
];

export const loadExampleFixture = (segments: string[]) => {
  const filePath = resolve(root, 'examples', ...segments);
  try {
    return readFileSync(filePath, 'utf8');
  } catch (e) {
		console.error(e);
    return readFileSync(filePath, 'latin1');
  }
};

export const loadExpectedFixture = (filename: string) => {
  return readFileSync(resolve(expectedRoot, filename), 'utf8');
};

export const isRegenFixtures = () => process.env.REGEN_FIXTURES === 'true';

export const writeExpectedFixture = (filename: string, content: string) => {
  writeFileSync(resolve(expectedRoot, filename), content, 'utf8');
};

const normalizeRow = (row: CsvRow, keys: string[]) => {
  return keys.reduce((acc, key) => {
    acc[key] = row[key] ?? '';
    return acc;
  }, {} as CsvRow);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const assertCsvFixtureMatches = async (actualCsv: string, expectedFilename: string, keys: string[], vendor: Vendor<any>) => {
  if (isRegenFixtures()) {
    writeExpectedFixture(expectedFilename, actualCsv);
    return;
  }

  const [actualRows] = await csv.parseString(actualCsv, vendor);
  const [expectedRows] = await csv.parseString(loadExpectedFixture(expectedFilename), vendor);

  expect(actualRows.length).toBe(expectedRows.length);
  expect(actualRows.map(row => normalizeRow(row, keys))).toEqual(
    expectedRows.map(row => normalizeRow(row, keys))
  );
};

export const assertJsonFixtureMatches = async (expectedFilename: string, actualObject: Object) => {
  if (isRegenFixtures()) {
    writeExpectedFixture(expectedFilename, JSON.stringify(actualObject, null, 2));
    return;
  }

  const expectedObject = JSON.parse(loadExpectedFixture(expectedFilename));

	expect(expectedObject).toEqual(actualObject);
};
