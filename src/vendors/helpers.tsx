export const PARENT_SYMBOL = Symbol.for('parent');
export const RM_SMALL_SHIPPING = 5;
export const RM_LARGE_SHIPPING = 20;

export type Item = any;

export type Vendor = {
    name: string;
    importLabel: string;
    updateInventory: boolean;
    getSKU: (item: Item) => string;
    getQuantity: (item: Item) => number;
    useTitleForMatching: boolean;
    getTitle: (item: Item) => string;
    expectedHeaders: Array<string>;
};
