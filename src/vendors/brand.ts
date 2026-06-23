import type { Vendor } from './vendor.ts';

// Emoji string, or an image URL.
// size 'large' renders as the dominant element filling the vendor card;
// size 'small' (default) renders as a small icon beside the brand name.
export type BrandIcon = string | { url: string; size?: 'small' | 'large' };

type VendorKey = 'inventory' | 'addProducts' | 'editProducts';

export interface Brand {
  id: string;
  name: string;
  icon: BrandIcon;
  fileInfo: Partial<Record<VendorKey, { label: string; description: string }>>;
  vendorFor: Partial<Record<VendorKey, () => Vendor<any>>>;
}
