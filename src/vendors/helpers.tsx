export const PARENT_SYMBOL = Symbol.for('parent');
export const RM_SMALL_SHIPPING = 5;
export const RM_LARGE_SHIPPING = 20;

export type Get<T> = (item: Item) => T;
export type GetV<T> = (item: Item, vendor: Vendor) => T;

export type Item = any;

export type ShopifyVariant = {
    name: string;
    value: string;
};

export type Vendor = {
    name: string;
    importLabel: string;
    updateInventory?: boolean;
    updateProducts?: boolean;
    addProducts?: boolean;
    useBarcodeForExclusiveMatching?: boolean;
    useTitleForMatching?: boolean;
    getSKU: Get<string>;
    getQuantity: Get<number>;
    getTitle: Get<string>;
    getDescription?: Get<string>;
    getVendor?: Get<string>;
    getMainImageURL?: Get<string>;
    getVariantImageURL?: Get<string>;
    getTaxable?: Get<boolean>;
    getRRP?: GetV<number>;
    getPrice?: Get<number>;
    getWeight?: Get<number>;
    getVariants?: Get<Array<ShopifyVariant>>;
    getBarcode?: Get<string>;
    getParent?: Get<string>;
    getVariantCorrelationId?: Get<string>;
    orderBy?: Get<string>;
    expectedHeaders: Array<string>;
};
