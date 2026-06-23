import type { Brand } from '../../vendors/brand.ts';
import type { Product } from '../../vendors/vendor.ts';

export type WizardAction = 'inventory' | 'addProducts' | 'editProducts';
export type WizardStep = 'home' | 'vendor' | 'shopifyFile' | 'vendorFile' | 'run';
export type RunState = 'idle' | 'running' | 'done' | 'error';

export interface WizardSettings {
  maxQuantity: number;
  updateImages: boolean;
}

/** A vendor feed collected during the vendorFile step, keyed by brand id. */
export interface VendorFile {
  fileName: string;
  products: Product[];
}

export interface WizardState {
  step: WizardStep;
  action?: WizardAction;
  /** Vendors selected in the vendor step, in the order their feeds are collected. */
  brands: Brand[];
  /** Index of the brand whose feed is currently being collected in the vendorFile step. */
  vendorIndex: number;
  shopifyFileName?: string;
  shopifyProducts?: Product[];
  /** Collected vendor feeds, keyed by brand id. */
  vendorFiles: Record<string, VendorFile>;
  settings: WizardSettings;
  runState: RunState;
  resultCSV?: string;
  errorMessage?: string;
  /** When true the wizard UI is hidden and only the background scene plays. */
  cinematic?: boolean;
}

export type WizardDispatch =
  | { type: 'SET_ACTION'; action: WizardAction }
  | { type: 'SET_BRANDS'; brands: Brand[] }
  | { type: 'SET_SHOPIFY_FILE'; products: Product[]; fileName: string }
  | { type: 'SET_VENDOR_FILE'; brandId: string; products: Product[]; fileName: string }
  | { type: 'SET_SETTINGS'; settings: Partial<WizardSettings> }
  | { type: 'START_RUN' }
  | { type: 'RUN_DONE'; resultCSV: string }
  | { type: 'RUN_ERROR'; message: string }
  | { type: 'RESET_RUN' }
  | { type: 'ENTER_CINEMATIC' }
  | { type: 'BACK' }
  | { type: 'NAVIGATE_TO'; step: WizardStep };

export const ACTION_LABELS: Record<WizardAction, { title: string; verb: string; subtitle: string }> = {
  inventory: {
    title: 'Update Inventory',
    verb: 'Update inventory',
    subtitle: 'Sync stock quantities from a vendor feed into Shopify',
  },
  addProducts: {
    title: 'Add Products',
    verb: 'Add products',
    subtitle: 'Create new Shopify listings from products in a vendor feed',
  },
  editProducts: {
    title: 'Edit Products',
    verb: 'Edit products',
    subtitle: 'Update prices, barcodes, images, and tags on existing Shopify listings',
  },
};

/** Human-readable label for the Shopify export file needed per action */
export const SHOPIFY_FILE_LABELS: Record<WizardAction, { label: string; description: string }> = {
  inventory: {
    label: 'Shopify inventory export',
    description: 'Export from Shopify Admin → Products → Inventory → Export. Contains SKU and "On hand" quantity columns.',
  },
  addProducts: {
    label: 'Shopify products export',
    description: 'Export from Shopify Admin → Products → Export (all products). Used to check which products already exist.',
  },
  editProducts: {
    label: 'Shopify products export',
    description: 'Export from Shopify Admin → Products → Export (all products). Prices and images on existing rows will be updated.',
  },
};
