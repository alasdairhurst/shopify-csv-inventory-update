import { BARCODE_DOES_NOT_APPLY } from './constants';

const GLOBAL_QUOTE_RX = /[["']/g;
const UPEC_EAN_RX_SMALLER = /^[0-9]+$/;
const NUMBER_SKU_RX = /^0+[0-9]*$/;

window.barcodes = {};

export const parseSKU = (sku) => {
  if (!sku) {
    return;
  }
  if (sku[0] === '\'') {
    return sku.substring(1);
  }
  return sku;
}

export const parseBarcode = (barcode) => {
  window.barcodes[barcode] = window.barcodes[barcode] || 0;
  window.barcodes[barcode]++;
  if (barcode) {
    let newBarcode = barcode.trim().replace(GLOBAL_QUOTE_RX, '');
    if (newBarcode.length === 11) {
      // really hope it's a UPC missing a leading 0
      newBarcode = '0' + newBarcode;
    }
    // 12 is UPC, 13 is EAN
    if (newBarcode.length === 12 || newBarcode.length === 13) {
      if (UPEC_EAN_RX_SMALLER.test(newBarcode)) {
        return newBarcode;
      }
    }
  }
  return BARCODE_DOES_NOT_APPLY;
}

export const escapeBarcode = (barcode) => {
  if (barcode === BARCODE_DOES_NOT_APPLY) {
    return barcode;
  }
  return `'${barcode}`;
}

export const escapeSKU = (sku) => {
  if (sku[0] !== '0') {
    return sku;
  }
  if (NUMBER_SKU_RX.test(sku)) {
    return `'${sku}`;
  }
  return sku;
}

export function roundPrice(price) {
  if (isNaN(price)) {
    throw new Error('Price is not a number');
  }
  return Math.ceil(price) - 0.01
}