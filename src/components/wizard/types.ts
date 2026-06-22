import type { Brand } from '../../vendors/brand.ts';

export type WizardAction = 'inventory' | 'addProducts' | 'editProducts';
export type WizardStep = 'home' | 'vendor' | 'shopifyFile' | 'vendorFile' | 'run';
export type RunState = 'idle' | 'running' | 'done' | 'error';

export interface WizardSettings {
  maxQuantity: number;
  updateImages: boolean;
}

export interface WizardState {
  step: WizardStep;
  action?: WizardAction;
  brand?: Brand;
  shopifyFileName?: string;
  vendorFileName?: string;
  shopifyCSV?: string[];
  vendorCSV?: string[];
  settings: WizardSettings;
  runState: RunState;
  resultCSV?: string;
  errorMessage?: string;
}

export type WizardDispatch =
  | { type: 'SET_ACTION'; action: WizardAction }
  | { type: 'SET_BRAND'; brand: Brand }
  | { type: 'SET_SHOPIFY_FILE'; csv: string[]; fileName: string }
  | { type: 'SET_VENDOR_FILE'; csv: string[]; fileName: string }
  | { type: 'SET_SETTINGS'; settings: Partial<WizardSettings> }
  | { type: 'START_RUN' }
  | { type: 'RUN_DONE'; resultCSV: string }
  | { type: 'RUN_ERROR'; message: string }
  | { type: 'RESET_RUN' }
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
