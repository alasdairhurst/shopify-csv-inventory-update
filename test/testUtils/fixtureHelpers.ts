import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as csv from '../../src/files/csv.ts';
import { expect } from 'vitest';

type CsvRow = Record<string, string>;

const root = resolve(__dirname, '..');
const expectedRoot = resolve(root, 'fixtures', 'expected');

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

export const writeExpectedFixture = (filename: string, csvText: string) => {
  writeFileSync(resolve(expectedRoot, filename), csvText, 'utf8');
};

const normalizeRow = (row: CsvRow, keys: string[]) => {
  return keys.reduce((acc, key) => {
    acc[key] = row[key] ?? '';
    return acc;
  }, {} as CsvRow);
};

export const assertCsvFixtureMatches = async (actualCsv: string, expectedFilename: string, keys: string[]) => {
  if (isRegenFixtures()) {
    writeExpectedFixture(expectedFilename, actualCsv);
    return;
  }

  const [actualRows] = await csv.parseString<CsvRow>(actualCsv);
  const [expectedRows] = await csv.parseString<CsvRow>(loadExpectedFixture(expectedFilename));

  expect(actualRows.length).toBe(expectedRows.length);
  expect(actualRows.map(row => normalizeRow(row, keys))).toEqual(
    expectedRows.map(row => normalizeRow(row, keys))
  );
};
