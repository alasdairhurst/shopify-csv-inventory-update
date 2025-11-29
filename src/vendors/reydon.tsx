import { Vendor } from './helpers';

const reydon: Vendor = {
    name: 'reydon-inventory',
    importLabel: 'Reydon Inventory CSV',
    updateInventory: true,
    getSKU: item => item.Code.replace('\n', ''),
    getQuantity: item => +item.Quantity,
    useTitleForMatching: true,
    getTitle: item => item['Product Name'].replace(/\([^()]*\)/g, ''),
    expectedHeaders: [ 'Product Name', 'Code', 'Quantity' ]
};

export default reydon;