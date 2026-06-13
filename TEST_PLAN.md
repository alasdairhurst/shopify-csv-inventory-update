## Plan: Comprehensive test suite for vendor parsing and Shopify function behavior

TL;DR: Build a structured Vitest suite with dedicated file coverage for each main source function plus vendor parsing. Convert the temporary fixture generator into a regeneration flag inside e2e tests, and add per-vendor unit tests using real example CSV fixtures.

Steps
1. Remove `test/tmp-fixture-info.test.ts` from the test suite.
   - Check the content and see if it should be included within tests specifically part of the e2e folder.
   - Implement fixture regeneration inside the e2e-suite via an environment flag like `REGEN_FIXTURES=true`.
   - Store regenerated fixtures under `test/fixtures/expected/*` only when the flag is present.

2. Restructure e2e tests into function-specific files.
   - Create `test/e2e/addProducts.test.ts`, `test/e2e/updateInventory.test.ts`, and `test/e2e/updateProducts.test.ts`.
   - Keep a generic `test/e2e/blitz.test.ts` only if needed for a combined workflow, but very small and not the primary suite.
   - Each file should support vendor inputs, but use Blitz as the canonical example path.
   - Each e2e file should use example fixtures from `test/examples/*` and compare outputs to `test/fixtures/expected/*`.

3. Build function-specific test files under `test/functions/`.
   - Create `test/functions/addProducts.test.ts`, `test/functions/updateInventory.test.ts`, `test/functions/updateProducts.test.ts`, and `test/functions/parseProductsCSV.test.ts`.
   - These tests should directly exercise the corresponding source function with both small hand-crafted cases and one real example fixture path.
   - For `parseProductsCSV`, include one vendor fixture parse test for Blitz and one generic header-validation case.

4. Build vendor-specific test files under `test/vendors/`.
   - Create a test file for each supported class of each vendor: `blitz.test.ts`, `cartas.test.ts`, `cartas.inventory.test.ts`, `mtb.test.ts`, `reydon.test.ts`, `reydon.inventory.test.ts`, `unicorn.test.ts`.
   - Each file should verify: vendor import headers are accepted, `parseProductsCSV` processes the example fixture, and vendor-specific helper behavior is correct for at least one representative record.
   - Where the vendor has inventory and/or addProducts support, add one `canUpdateInventory` or `canAddProducts` assertion path.
   - Use the real CSV file under `test/examples/vendors/<vendor>/...`.

5. Introduce expected output assertions with regeneration support.
   - Use `csv.parseString` to parse expected output fixtures and actual output rows.
   - Compare by core identifiers such as `Handle`, `Variant SKU`, `SKU`, and `On hand (new)`.
   - Do not rely on full raw CSV string equality.
   - When `REGEN_FIXTURES=true`, write new expected CSV files from actual output and skip strict comparison.

6. Improve generic e2e coverage.
   - In `test/e2e/addProducts.test.ts`, verify that a vendor SKU not in Shopify is added and that output rows are marked edited.
   - In `test/e2e/updateInventory.test.ts`, verify returned rows contain updated `On hand (new)` for expected SKUs and values respect `maxQuantity`.
   - In `test/e2e/updateProducts.test.ts`, verify at least one existing Shopify product price changes and that vendor tags / edited state are preserved.
   - Where possible, assert that `billed` or `blitz` tag relationships exist to prove vendor-specific code paths were exercised.

7. Keep vendor coverage generic and extensible.
   - Design the vendor test files so additional vendors can be added without rewriting structure.
   - Use helper functions in tests to load example CSVs and route them to `parseProductsCSV` with the appropriate vendor class.
   - For each vendor test, include a minimal smoke validation of `vendor.getSKU`, `vendor.getTitle`, and `vendor.getParsedBarcode` or equivalent.

Relevant files / structure
- `test/e2e/addProducts.test.ts` — e2e coverage for `addProducts` and expected output fixture validation.
- `test/e2e/updateInventory.test.ts` — e2e coverage for `updateInventory` with `maxQuantity` and expected inventory fixture validation.
- `test/e2e/updateProducts.test.ts` — e2e coverage for `updateProducts` and price/edit changes.
- `test/functions/addProducts.test.ts` — unit tests for `src/functions/addProducts.ts` with small input plus one example fixture.
- `test/functions/updateInventory.test.ts` — unit tests for `src/functions/updateInventory.ts`.
- `test/functions/updateProducts.test.ts` — unit tests for `src/functions/updateProducts.ts`.
- `test/functions/parseProductsCSV.test.ts` — unit tests for CSV parsing and vendor header validation.
- `test/vendors/blitz.test.ts`, `test/vendors/cartas.test.ts`, `test/vendors/mtb.test.ts`, `test/vendors/reydon.test.ts`, `test/vendors/tuff.test.ts`, `test/vendors/unicorn.test.ts` — vendor parsing tests using real example files.
- `test/examples/*` — source fixture inputs.
- `test/fixtures/expected/*` — expected regression outputs.

Verification
1. Run `vitest run test/functions/*.test.ts test/vendors/*.test.ts test/e2e/*.test.ts`.
2. Confirm each category passes independently: vendor parsing, function logic, and e2e regression.
3. Confirm the regeneration mode works with `REGEN_FIXTURES=true vitest run test/e2e/*.test.ts` and only rewrites expected fixture files when requested.
4. Confirm that without `REGEN_FIXTURES`, the e2e tests fail if output rows differ from expected fixtures.
5. Confirm the temporary generator file is no longer run as a test.

Decisions
- Remove `tmp-fixture-info.test.ts` from the test discovery path.
- Prefer file-per-function e2e tests instead of a single `blitz.test.ts` monolith.
- Keep Blitz as the main example vendor but structure tests so other vendors can be exercised later.
- Use parsed-row comparisons on key identifiers, not full CSV string matching.

Further considerations
1. If more vendors are added, add their example files and one vendor test file at a time.
2. If fixture regeneration becomes frequent, add a shared helper for `writeExpectedFixture` so the same flag logic is reused.

# Test Framework Summary

## Overview
A minimal Vitest-based test framework for the nembol-csv project, covering core CSV processing and vendor-based product import workflows.

## Setup & Configuration

### Dependencies
- **vitest@4.1.8**: Main test runner with jsdom environment
- **@testing-library/react@16.3.2**: React component testing utilities
- **jsdom@22.0.0**: DOM environment for browser-based tests

### Configuration Files

#### vitest.config.ts
- **Environment**: jsdom (simulates browser context)
- **Globals**: enabled (no need for `import { describe, expect, it } ...` in each test)
- **Test Timeout**: 20s (important for e2e tests processing large CSV files)
- **Include Pattern**: `test/**/*.{test,spec}.{ts,tsx}`

#### tsconfig.test.json
- **Extends**: root tsconfig.json with test-specific types
- **Lib**: ["es2020", "jsdom"]
- **Types**: vitest, node, jsdom

#### package.json
- **Test Script**: `"test": "vitest run"`
- **Install**: `npm install`

## Test Organization

```
test/
├── components/
│   └── Alert.test.tsx           (React component unit test)
├── files/
│   └── csv.test.ts              (CSV parser unit tests)
├── e2e/
│   └── blitz.test.ts            (Blitz vendor integration tests)
├── examples/                    (Test fixture CSVs)
│   ├── shopify/
│   │   ├── products.csv
│   │   └── inventory.csv
│   └── vendors/
│       └── blitz/
│           └── blitz.csv
└── fixtures/
    └── expected/                (Generated output fixtures)
        ├── blitz-add-products.csv
        ├── blitz-update-inventory.csv
        └── blitz-stats.json
```

## Test Coverage

### 1. **Alert Component** (`test/components/Alert.test.tsx`)
- **Purpose**: React component unit test
- **Coverage**: Alert component rendering and styling
- **Status**: ✅ PASSING

### 2. **CSV Parser** (`test/files/csv.test.ts`)
- **Purpose**: Verify CSV parsing utility functions
- **Coverage**:
  - Parsing Shopify products CSV
  - Header extraction
  - Row count assertions
- **Status**: ✅ PASSING

### 3. **Blitz E2E Tests** (`test/e2e/blitz.test.ts`)
- **Purpose**: Integration tests for Blitz vendor workflow
- **Coverage**:

#### Test 1: Add Blitz Products
- Loads Shopify product catalog
- Parses Blitz CSV using vendor-specific parsing logic
- Invokes `addProducts()` business function
- Assertions:
  - Product count increases
  - Added products are marked as edited
  - Products tagged with 'blitz' and 'new in'
  - Product structure is valid (Handle, Title, SKU, Price)

#### Test 2: Update Inventory
- Loads Shopify inventory spreadsheet
- Parses Blitz products
- Invokes `updateInventory()` to apply quantity limits
- Assertions:
  - Inventory updates generated
  - Quantity values between 0-50 (enforced by `maxQuantity` option)
  - Update structure valid (SKU, "On hand (new)" fields)

#### Test 3: Update Product Prices
- Loads Shopify product catalog
- Parses Blitz products
- Invokes `updateProducts()` to refresh pricing/descriptions
- Assertions:
  - Product structure remains valid
  - All required fields present (Handle, Title, SKU, Price)
  - Products can be edited/marked as updated

- **Status**: ✅ PASSING (3/3 tests)

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npx vitest run test/e2e/blitz.test.ts
```

### Run Specific Test
```bash
npx vitest run test/e2e/blitz.test.ts -t "Add Blitz Products"
```

### Watch Mode (Development)
```bash
npx vitest
```

## Test Execution Details

- **Total Test Files**: 4 (1 component, 1 file parsing, 1 e2e, 1 vendor suite)
- **Total Tests**: 6 passing
- **Typical Runtime**: ~30 seconds
- **Timeout**: 20s per test (configurable in vitest.config.ts)

## Key Testing Patterns

### 1. Fixture Loading
```typescript
const readFixture = (segments: string[]) =>
  readFileSync(resolve(__dirname, '..', ...segments), 'utf8');
```

### 2. CSV Parsing & Normalization
```typescript
const [rows, headers] = await csv.parseString<T>(csvText);
const normalized = text.replace(/\r/g, '').trim();
```

### 3. Functional Assertions
- Row counts and structure integrity
- Field presence and type validation
- Business logic correctness (e.g., quantity limits)

## Architecture Highlights

### Separation of Concerns
- **Unit Tests**: CSV parser, React components
- **Integration Tests**: Vendor workflows with real CSV data
- **Fixtures**: Actual test data co-located with tests

### Vendor-Based Design
The test suite leverages the existing vendor abstraction:
- Each vendor (Blitz, Cartas, etc.) implements `Vendor<T>` interface
- Parsing logic is decoupled via `parseProductsCSV(csv, vendor)`
- Business logic (`addProducts`, `updateInventory`, `updateProducts`) is vendor-agnostic

### Business Function Coverage
- ✅ `addProducts()` - adds new vendor SKUs to Shopify catalog
- ✅ `updateInventory()` - syncs quantity levels with caps
- ✅ `updateProducts()` - refreshes prices/descriptions

## Future Enhancements

1. **Additional Vendors**: Add e2e tests for other vendors (Cartas, MTB, etc.)
2. **Error Cases**: Add negative test scenarios (malformed CSV, missing headers)
3. **Performance**: Benchmark large CSV processing
4. **Coverage**: Generate coverage reports (`--coverage` flag)
5. **Snapshot Testing**: Verify complex CSV output structures

## Debugging

### Enable Debug Output
```bash
npx vitest run test/e2e/blitz.test.ts --reporter=verbose
```

### Increase Timeout (for slow systems)
Edit `vitest.config.ts`:
```typescript
testTimeout: 60000  // 60 seconds
```

### Check Fixture Files
```bash
ls -la test/examples/shopify/
ls -la test/fixtures/expected/
```

## Notes

- Tests use the **jsdom environment** for browser API compatibility (papaparse, file operations)
- E2E tests process **real CSV data** from 1000+ product records, hence the 20s timeout
- Fixtures are source-controlled, allowing reproducible test results
- Tests are fully isolated; no setup/teardown dependencies between test suites



# Additional user-supplied information
 - There's a bunch of leftover files from agent activity which should not exist. ensure they are cleaned up when finishing implementation