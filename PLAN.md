# Plan: Nembol CSV

## Backlog (unordered)

- Service worker threads for main actions to avoid locking browser
- Integration tests with real examples
- Better validation on parsing products — ignore and log rather than propagating broken values (e.g. NaN)
- Abstract products rather than vendors; just use vendors to parse/unparse the CSVs
- Simplify code to only one vendor at a time. Could improve pulling out full csv-first logic from browser-specific code.
- **Improvement:** Add product structure type as code and derive both TypeScript type and headers from one place
- Pull out as much logic as possible from `App`

---

## UI Rewrite

### Context

The current UI is a flat form that shows all vendors and all file inputs at once, with no preview of output, no visible logs, and a browser that locks during heavy processing. The goals: a wizard-based rewrite that processes one vendor at a time, supports URL-based file fetching, shows CSV output before download, and surfaces logs in the UI. Web Workers are deferred to a follow-up. Unit tests for the new UI components are in scope for this pass.

---

## Phase 1 status: COMPLETE (visual mock-up wired)

All wizard components exist and type-check. The app renders the new wizard via `USE_NEW_UI = true` in `src/App.tsx`. Switching to `false` restores the old form.

**Files created in Phase 1:**

| File | Purpose |
|---|---|
| `tailwind.config.js` | Enables Tailwind (webpack already watched for this file) |
| `src/vendors/brand.ts` | `BrandIcon` and `Brand` type definitions |
| `src/vendors/brands.ts` | Thin aggregator — imports brand exports from each vendor file |
| `src/components/wizard/types.ts` | Shared state shape, dispatch union, ACTION_LABELS, SHOPIFY_FILE_LABELS |
| `src/components/wizard/Wizard.tsx` | Outer shell, reducer, interactive breadcrumb, clickable title |
| `src/components/wizard/Step1Home.tsx` | Homepage — three action cards, no step indicator |
| `src/components/wizard/Step2ShopifyFile.tsx` | Shopify file upload (multiple files supported) |
| `src/components/wizard/Step3Vendor.tsx` | Brand grid with icons, filtered by action |
| `src/components/wizard/Step4VendorFile.tsx` | Vendor file upload + expected-headers panel + URL/File toggle (multiple files supported) |
| `src/components/wizard/Step5Run.tsx` | Summary + settings (locked after run) + mock run + CSVPreview + Download |
| `src/components/wizard/BackButton.tsx` | Reusable back nav |
| `src/components/FileOrURL.tsx` | Standalone file/URL component (used in Step4 via inline implementation) |
| `src/components/CSVPreview.tsx` | Table/text toggle, 500-row cap |
| `src/components/LogPanel.tsx` | Level-filtered log panel, closed by default, version text integrated |

**Brand definitions** are co-located with each vendor class (not centralised):
- `blitzBrand` in `src/vendors/blitz.ts`
- `cartasportBrand` in `src/vendors/cartasport.ts`
- `mtbBrand` in `src/vendors/mtb.ts`
- `reydonBrand` in `src/vendors/reydon.ts`
- `tufBrand` in `src/vendors/tuf.ts`
- `unicornBrand` in `src/vendors/unicorn.ts`

**Modified in Phase 1:**
- `src/index.css` — `@tailwind` directives added
- `src/App.tsx` — `USE_NEW_UI` flag; passes build version to Wizard

---

## Step flow (5 steps, home is not numbered)

```
Home          Action cards — no breadcrumb, no step counter
  ↓
Shopify file  Upload Shopify export (multiple files allowed)
  ↓
Vendor        Brand grid (icon + name) filtered by action
  ↓
Vendor file   Upload vendor feed (multiple files; file or URL tabs; expected-headers panel)
  ↓
Run           Summary + locked settings + Run button → CSVPreview + Download
```

**Rationale for Shopify-before-vendor order:** the Shopify export is the same file regardless of vendor — uploading it first is a natural starting point before narrowing down to a specific vendor feed.

**Navigation:**
- App title ("Shopify CSV Update") is a button → goes home
- Interactive breadcrumb: `Home › Update Inventory › Blitz` — each item is clickable to go back to that step
- Arriving at any step clears that step's output and all subsequent state (brand, files, run result)
- `BACK` dispatch mirrors breadcrumb navigation

**Step/state mapping:**
| Step | Produces | Cleared when navigating to this step |
|---|---|---|
| home | action | — |
| shopifyFile | shopifyCSV[], shopifyFileName | shopifyCSV, shopifyFileName, brand, vendorCSV, vendorFileName, runState, resultCSV |
| vendor | brand | brand, vendorCSV, vendorFileName, runState, resultCSV |
| vendorFile | vendorCSV[], vendorFileName | vendorCSV, vendorFileName, runState, resultCSV |
| run | runState, resultCSV | runState, resultCSV |

---

## Brands registry

Each brand is exported from its vendor file and imported by `src/vendors/brands.ts`. Each brand has:
- `id`, `name`, `icon: BrandIcon` — emoji string or `{ url, size? }` image
- `fileInfo: Partial<Record<WizardAction, { label, description }>>` — shown in Step4
- `vendorFor: Partial<Record<WizardAction, () => Vendor<any>>>` — factory per action

**Icon sizes:** `size: 'large'` renders the image as the dominant card element (logo fills the card); default/`'small'` renders a small icon beside the brand name.

Brands available per action:
| Action | Brands |
|---|---|
| inventory | Blitz, Cartasport (→ CartasportInventory), MTB, Reydon (→ ReydonInventory), Unicorn, Tuf (→ TufInventory) |
| addProducts | Blitz, Cartasport, MTB, Reydon, Tuf |
| editProducts | Blitz, Cartasport, MTB, Reydon, Tuf |

Unicorn is inventory-only. Each brand appears once regardless of how many vendor classes it has internally.

---

## UX design decisions

- **Homepage**: no "Step X of Y" — behaves as a landing page
- **Breadcrumb only** shows context — step headings are generic, not repeated with action/brand
- **Log panel**: closed by default; version string lives in the log panel bar (right side) instead of a fixed footer
- **Settings**: inputs are `disabled` once `runState !== 'idle'` (opacity-50 + cursor-not-allowed)
- **`updateImages`**: not persisted to localStorage (defaults false each session)
- **`maxQuantity`**: persisted in `localStorage['settings:maxQuantity']`
- **Vendor file URLs**: last used URL persisted in `localStorage['lastUrl:{brand.id}']`
- **Expected headers panel**: Step4 shows up to 6 expected column names from the vendor class as chips, with "+N more" if there are additional ones
- **Multiple files**: both Shopify and vendor file steps accept multiple files; state holds `string[]` for CSV content

---

## Logger (observable, batched) — PENDING (Phase 2)

Rewrite `src/utils/logger.ts`:
```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogEntry = { level: LogLevel; message: string; timestamp: Date };

const logger = {
  entries: [] as LogEntry[],
  subscribers: new Set<() => void>(),
  subscribe(fn: () => void): () => void,
  clear(): void,
  debug / log (info) / warn / error: each pushes to entries + schedules notify
};
```
Key: subscribers receive no data — they re-read `logger.entries` on trigger. Notifications debounced at ~100ms.

`LogPanel` subscribes via `useEffect`, reads `logger.entries` into a `useRef`, single `useState` counter for re-renders. Never copies full array into state.

---

## Performance constraints

### Log panel
- Render last 500 filtered entries; "X earlier entries not shown" note if truncated
- All entries remain in memory — toggling Debug on shows accumulated debug history
- Auto-scroll to bottom ref on each update

### CSV preview
- Table view: first 500 data rows; "Showing 500 of X rows" banner if truncated
- Text view: `<textarea readOnly>` — browser handles natively
- Full virtualization is a future enhancement

---

## LocalStorage caching

```
lastUrl:{brand.id}         → last used URL for that vendor's file input
settings:maxQuantity       → persisted max quantity (default 5)
```

`updateImages` is NOT persisted.

---

## Phase 2 — Wire up functionality (PENDING)

1. `logger.ts` — observable with debounced notify
2. `src/files/read.ts` — extract `readFileAsText`, `readCSVFileList`, `fetchCSVFromURL`
3. `src/orchestrate.ts` — pure async functions returning CSV text
4. `src/vendors/vendor.ts` — add optional `urlConfig` property to base class
5. Each vendor class — add `urlConfig` where applicable
6. Connect `Step2ShopifyFile.tsx` to real file reading (multiple files → `string[]`)
7. Connect `Step4VendorFile.tsx` to real file reading + URL fetch
8. Connect `Step5Run.tsx` to real orchestration
9. Connect `LogPanel.tsx` to real logger
10. Connect `CSVPreview.tsx` to real result CSV
11. Remove old App form; clean up `App.css`

### `src/orchestrate.ts` functions

```typescript
export async function runUpdateInventory(shopifyCSVs: string[], vendorCSVs: string[], vendor, { maxQuantity }): Promise<string>
export async function runAddProducts(shopifyCSVs: string[], vendorCSVs: string[], vendor): Promise<string>
export async function runUpdateProducts(shopifyCSVs: string[], vendorCSVs: string[], vendor, { updateImages }): Promise<string>
```

Each: parses both CSV arrays via `parseProductsCSVs` → calls existing action function → `csv.unparse()` → returns text. Throws `ExpectedError("Nothing to export")` on empty result.

Reuses without modification: `parseProductsCSVs`, `updateInventory`, `addProducts`, `updateProducts`, `csv.unparse`, `downloadTextFile`, `readZip`, `shopifyVendor`, `shopifyInventoryVendor`.

### Vendor URL config

Add to `Vendor` base class in `src/vendors/vendor.ts`:
```typescript
urlConfig?: {
  defaultURL?: string;
  supportsFile: boolean;
  supportsURL: boolean;
};
```

Step4VendorFile reads `brand.vendorFor[action]!().urlConfig` to decide whether to show File tab, URL tab, or both. Currently shows both for all vendors (Phase 1 mock); Phase 2 respects the config.

---

## Phase 3 — Tests (PENDING)

Unit tests using Vitest + React Testing Library:

- `Step1Home` — clicking each card dispatches correct action
- `Step2ShopifyFile` — Next disabled until file provided; multiple files show as list
- `Step3Vendor` — correct brands shown per action (mock brands array); large vs small icon card layouts
- `Step4VendorFile` — file upload and URL fetch flows; multiple files; expected headers rendered
- `Step5Run` — settings locked after run; correct orchestrate fn called; download button shown on done
- `CSVPreview` — table capped at 500 rows with banner; text view renders textarea
- `LogPanel` — level filter hides/shows entries; "earlier entries" note; closed by default
- `orchestrate.ts` — mock `parseProductsCSVs` + action fns; verify CSV text returned

Any existing files that are touched during implementation should be covered by tests including new features and changed features.

---

## Reuse (do not duplicate)

| Thing | Location |
|---|---|
| `vendors`, `shopifyVendor`, `shopifyInventoryVendor` | `src/vendors/index.ts` |
| `parseProductsCSVs` | `src/functions/parseProductsCSV.ts` |
| `updateInventory`, `addProducts`, `updateProducts` | `src/functions/` |
| `csv.unparse` | `src/files/csv.ts` |
| `downloadTextFile` | `src/files/download.ts` |
| `readZip` | `src/files/zip.ts` |
| `ExpectedError` | `src/utils/ExpectedError.ts` |
| `Spinner`, `Alert` | `src/components/` (keep as-is) |

---

## Verification (full)

1. `npm run tsc` — zero type errors
2. `npm test` — all existing tests pass (business logic untouched)
3. `npm start` — walk each of the three action flows end-to-end with real CSVs
4. Breadcrumb navigation: clicking each crumb item resets state correctly from that step onward
5. App title click → returns to home
6. Multiple Shopify files: select 2+ files, names listed, both passed to orchestration
7. URL fetch: paste a vendor URL → CSV loads; bad URL → clear error shown
8. Settings persist across runs (maxQuantity pre-filled on reload)
9. Log panel: closed on load; opens on click; level toggles work; debug entries appear when toggled on
10. CSV preview: table capped at 500 rows with banner; text view shows full content
11. Settings locked after Run clicked (opacity-50, disabled inputs)
