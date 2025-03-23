import Papa from 'papaparse';
import { ZipReader, BlobReader, BlobWriter } from '@zip.js/zip.js';
import he from 'he';
import { diceCoefficient } from 'string-comparison';
import './App.css';
import vendors from './vendors';
import { useState } from 'react';
import Alert from './Alert';

const DOWNLOAD_INVENTORY_FILE_NAME = 'completed_inventory_update_for_shopify.csv';
const DOWNLOAD_PRODUCTS_UPDATE_FILE_NAME = 'completed_products_update_for_shopify.csv';
const DONWLOAD_PRODUCTS_FILE_NAME = 'new_products_for_shopify.csv';
const DEFAULT_SHOPIFY_PRODUCT = {
  'Handle': '', 'Title': '', 'Body (HTML)': '', 'Vendor': '', 'Product Category': '', 'Type': '', 'Tags': '', 'Published': '', 'Option1 Name': '', 'Option1 Value': '', 'Option2 Name': '', 'Option2 Value': '', 'Option3 Name': '', 'Option3 Value': '', 'Variant SKU': '', 'Variant Grams': '', 'Variant Inventory Tracker': '', 'Variant Inventory Qty': '', 'Variant Inventory Policy': '', 'Variant Fulfillment Service': '', 'Variant Price': '', 'Variant Compare At Price': '', 'Variant Requires Shipping': '', 'Variant Taxable': '', 'Variant Barcode': '', 'Image Src': '', 'Image Position': '', 'Image Alt Text': '', 'Gift Card': '', 'SEO Title': '', 'SEO Description': '', 'Variant Image': '', 'Variant Weight Unit': '', 'Variant Tax Code': '', 'Cost per item': '', 'Included / United Kingdom': '', 'Status': ''
}
const PARENT_SYMBOL = Symbol.for('parent');

let logger = {
  debug: () => {},
  log: console.log,
  warn: console.warn,
  error: console.error
};

class ExpectedError extends Error {};

const DEBUG = false;
if (DEBUG) {
  logger.debug = console.debug;
}

let cancelled = false;

const GLOBAL_QUOTE_RX = /[["']/g;
const UPEC_EAN_RX_SMALLER = /^[0-9]+$/;
const BARCODE_DOES_NOT_APPLY = 'does not apply';

window.barcodes = {};
const parseBarcode = (barcode) => {
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

const escapeBarcode = (barcode) => {
  if (barcode === BARCODE_DOES_NOT_APPLY) {
    return barcode;
  }
  return `'${barcode}`;
}

const NUMBER_SKU_RX = /^0+[0-9]*$/;
const escapeSKU = (sku) => {
  if (sku[0] !== '0') {
    return sku;
  }
  if (NUMBER_SKU_RX.test(sku)) {
    return `'${sku}`;
  }
  return sku;
}

function roundPrice(price) {
  if (isNaN(price)) {
    throw new Error('Price is not a number');
  }
  return Math.ceil(price) - 0.01
}

function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';

  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Utility function to parse CSV string
function parseCSVString(csvString) {
  return new Promise((resolve, reject) => {
    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      complete (results) {
        resolve([results.data, results.meta.fields]);
      },
      error: reject
    });
  });
}

const SHOPIFY_PRODUCTS_OPTIONS = {
  orderBy: item => item.Handle,
  importLabel: 'Shopify products CSV',
  name: 'shopify-products',
  expectedHeaders: Object.keys(DEFAULT_SHOPIFY_PRODUCT)
};

const SHOPIFY_INVENTORY_OPTIONS = {
  orderBy: item => item.Handle,
  importLabel: 'Shopify inventory CSV',
  name: 'shopify-inventory',
  expectedHeaders: ['Handle', 'Title','Option1 Name','Option1 Value','Option2 Name','Option2 Value','Option3 Name','Option3 Value','SKU','HS Code','COO','Location','Incoming','Unavailable','Committed','Available','On hand']
};

async function parseFilesAsCSV(files, vendor) {
  const allFiles = await Promise.all(Array.from(files).map(f => parseFileAsCSV(f, vendor)));
  if (cancelled) {
    return;
  }
  let csv = [].concat(...allFiles);
  if (vendor?.orderBy) {
    csv = csv.sort((a, b) => {
      return vendor.orderBy(a).localeCompare(vendor.orderBy(b));
    });
  }
  return csv;
}

async function readZip(file){
  const entries = await (
    new ZipReader(new BlobReader(file))
  ).getEntries();

  if (cancelled) {
    return;
  }

  // Only read the first csv entry
  const csvFile = entries.find(entry => entry.filename.endsWith('.csv'));
  if (!csvFile) {
    throw new Error('Cannot find .csv in zip file', file.name)
  }
  const blob = await csvFile.getData(new BlobWriter());
  if (cancelled) {
    return;
  }
  return new File(new Array(blob), csvFile.filename);
}

async function parseFileAsCSV(file, vendor) {
  if (!file) return;

  if (file.name.endsWith('.zip')) {
    file = await readZip(file);
  }
  if (cancelled) {
    return;
  }

  if (!file.name.endsWith('.csv')) {
    throw new Error('Unknown file type', file.name);
  }

  const reader = new FileReader();
  // Read the file content synchronously
  reader.readAsText(file);
  await new Promise(resolve => {
    reader.onload = resolve;
  });
  if (cancelled) {
    return;
  }

  let fileContent = reader.result; // Get the file content
  let headerRow = '';
  // Add headers when csv is missing them
  if (vendor?.forceHeaders) {
    headerRow = vendor.forceHeaders.join(',') + '\n';
  }
  if (vendor?.htmlDecode) {
    fileContent = he.decode(fileContent);
  }

  let [ csv, headers ] = await parseCSVString(headerRow + fileContent);
  if (cancelled) {
    return;
  }
  // Check the headers as soon as we parse the csv before we use any properties.
  if (vendor?.expectedHeaders) {
    let match = false;
    // check if expected headers matches the ones we got
    match = vendor.expectedHeaders.every(expectedHeader => {
      // ideally we'd do a full match of all headers since the order sometimes matters,
      // but since shopify just decides to add random headers we'll just check for the 
      // fields we know/care about.
      const there = headers.includes(expectedHeader);
      if (!there) {
        logger.warn(`[WARN] ${vendor.name} csv missing possible header: ${expectedHeader}`);
      }
      return there;
    });

    if (!match) {
      const expected = vendor.expectedHeaders.map(JSON.stringify).join('\nor\n');
      throw new ExpectedError(`Did you pick the right file for ${vendor.importLabel}?\n CSV headers don't look right.\n\n  Expected:\n ${expected}\n\n  Got:\n ${JSON.stringify(headers)}`);
    }

  }

  if (vendor?.parseImport) {
    csv = vendor.parseImport(csv);
  }
  if (vendor?.orderBy) {
    csv = csv.sort((a, b) => {
      return vendor.orderBy(a).localeCompare(vendor.orderBy(b));
    });
  }
  if (vendor?.getVariantCorrelationId) {
    const parents = {};
    for (const item of csv) {
      if (cancelled) {
        return;
      }
      const id = vendor.getVariantCorrelationId(item);
      if (parents[id]) {
        item[PARENT_SYMBOL] = parents[id];
      } else if (id) {
        parents[id] = item;
      }
    }
  }

  vendor.getParsedBarcode = (product) => {
    if (!vendor.getBarcode) {
      return BARCODE_DOES_NOT_APPLY;
    }
    if (!('_parsedBarcode' in product)) {
      product._parsedBarcode = parseBarcode(vendor.getBarcode(product));
    }
    return product._parsedBarcode;
  }

  return csv;
}

const getShopifyProductParsedBarcode = product => {
  if (!('_parsedBarcode' in product)) {
    product._parsedBarcode = parseBarcode(product['Variant Barcode']);
  }
  return product._parsedBarcode;
}

const getFiles = (inputID) => {
  const form = document.getElementById('myform');
  const input = form?.querySelector(`#${inputID}`);
  return input?.files || [];
}

const parseSKU = (sku) => {
  if (!sku) {
    return;
  }
  if (sku[0] === '\'') {
    return sku.substring(1);
  }
  return sku;
}

// Updates existing items in inventory
// The full inventory is not downloaded, only updated rows
const updateInventory = async (e, { maxQuantity }) => {
  const shopifyInventoryFiles = getFiles('shopify-inventory');
  if (!shopifyInventoryFiles.length) {
   throw new ExpectedError('no shopify inventory CSV selected');
  }
  const shopifyInventoryCSV = await parseFilesAsCSV(shopifyInventoryFiles, SHOPIFY_INVENTORY_OPTIONS);
  if (cancelled) {
    return;
  }
  const shopifyInventoryUpdates = [];
  for (const vendor of vendors) {
    if (cancelled) {
      return;
    }
    if (!vendor.updateInventory) {
      logger.log(`[SKIP] inventory update not applicable to ${vendor.name}`);
      continue;
    }
    const vendorInventory = getFiles(vendor.name);
    let vendorInventoryCSV = await parseFileAsCSV(vendorInventory[0], vendor);
    if (cancelled) {
      return;
    }
    if (!vendorInventoryCSV) {
      logger.log(`[SKIP] no inventory file selected for ${vendor.name}`);
      continue;
    }

    for (const vendorItem of vendorInventoryCSV) {
      if (cancelled) {
        return;
      }
      const vendorItemSKU = parseSKU(vendor.getSKU(vendorItem));
      if (!vendorItemSKU) {
        continue;
      }

      const shopifyItem = shopifyInventoryCSV.find(r => {
        return !!matchInventory(r, vendor, vendorItem)
      });

      if (!shopifyItem) {
        logger.debug(`[NOT FOUND] ${vendor.name} SKU ${vendorItemSKU} in shopify inventory`);
        continue;
      }
      logger.debug(`[FOUND] ${vendor.name} SKU ${vendorItemSKU} in shopify inventory`);
      let updated = false

      // Update quantity

      // Cap the new quantity
      const vendorItemQuantity = Math.min(vendor.getQuantity(vendorItem), maxQuantity);
      const shopifyItemQuantity = +shopifyItem['On hand'];
      if (shopifyItemQuantity === vendorItemQuantity) {
        logger.debug(`[QUANTITY MATCH] ${vendor.name} SKU ${vendorItemSKU} quantity ${vendorItemQuantity} matches shopify inventory: ${shopifyItemQuantity}`);
      } else {
        logger.log(`[QUANTITY UPDATE] ${vendor.name} SKU ${vendorItemSKU} quantity ${vendorItemQuantity} differs in shopify inventory: ${shopifyItemQuantity}`);
        shopifyItem['On hand'] = vendorItemQuantity;
        updated = true;
      }

      // If there are any updates, push to updates array
      if (updated) {
        shopifyInventoryUpdates.push(shopifyItem);
      }
    }
  }
  if (!shopifyInventoryUpdates.length) {
    logger.log('[DONE] Nothing to download');
    return 'Nothing to download';
  }
  logger.log('[DONE] Downloading inventory CSV');
  const csv = Papa.unparse(shopifyInventoryUpdates, {
    header: true,
    newline: '\n',
  });
  downloadCSV(csv, DOWNLOAD_INVENTORY_FILE_NAME);
}

const matchShopifyItems = (shopifyItem, vendor, vendorProduct, options = {}) => {
  const vendorProductSKU = parseSKU(vendor.getSKU(vendorProduct));
  if (shopifyItem.sku !== vendorProductSKU) {
    return;
  }
  if (vendor.deny?.includes(vendorProductSKU)) {
    return;
  }

  const shopifyItemLabel = `${shopifyItem.sku} (${shopifyItem.title}/${shopifyItem.barcode})`;
  const vendorProductTitle = vendor.getTitle?.(vendorProduct) || '';
  const vendorProductBarcode = vendor.getParsedBarcode(vendorProduct);
  const vendorProductLabel = `${vendorProductSKU} (${vendorProductTitle}/${vendorProductBarcode})`;

  // Check the product for the vendor tag. Use this to differentiate matching skus across different vendors
  if (options.matchVendorTag) {
    if (!shopifyItem.tags.includes(vendor.name)) {
      logger.warn(`[WARN] ${vendor.name} SKU ${vendorProductLabel} matches SKU but the matched shopify product is missing ${vendor.name} tag ${shopifyItemLabel} (${shopifyItem.tags}). Not matching.`)
      return;
    }
  }

  // if the sku matches but could have a duplicate then we'll have to use the title to see how close it is.
  if (options.matchTitle && vendor.useTitleForMatching) {
    // compare titles to have some safety net
    const similarity = diceCoefficient.similarity(vendorProductTitle, shopifyItem.title);
    if (similarity <= 0.4) {
      logger.warn(`[WARN] ${vendor.name} SKU ${vendorProductLabel} matches SKU but does not match shopify product title ${shopifyItemLabel}. (${similarity} similar)`);
      return;
    }
  }

  return shopifyItemLabel;
};

const matchInventory = (shopifyInventory, vendor, vendorProduct) => {
  return matchShopifyItems(
    {
      sku: shopifyInventory.SKU.replace(/^'/, ''),
      title: shopifyInventory.Title
    },
    vendor,
    vendorProduct,
    {
      matchTitle: true
    }
  );
};

const matchProduct = (shopifyParent, shopifyProduct, vendor, vendorProduct) => {
  return matchShopifyItems(
    {
      sku: shopifyProduct['Variant SKU'],
      title: shopifyParent.primaryRow.Title,
      barcode: getShopifyProductParsedBarcode(shopifyProduct),
      tags: shopifyParent.primaryRow.Tags.split(', ')
    },
    vendor,
    vendorProduct,
    {
      matchVendorTag: true
    }
  );
};

const getShopifyProductAndParent = (shopifyProducts, vendor, vendorProduct) => {
  let shopifyProduct;
  let shopifyProductLabel;
  const shopifyParent = shopifyProducts.find(r => {
    if (shopifyProductLabel = matchProduct(r, r.primaryRow, vendor, vendorProduct)) {
      shopifyProduct = r.primaryRow;
      return true;
    }
    return !!r.secondaryRows.find(secondaryRow => {
      if (shopifyProductLabel = matchProduct(r, secondaryRow, vendor, vendorProduct)) {
        shopifyProduct = secondaryRow;
        return true;
      }
      return false;
    });
  });
  return { shopifyProduct, shopifyParent, shopifyProductLabel };
}

const updateProducts = async () => {
  const shopifyProductsFiles = getFiles('shopify-products');
  if (!shopifyProductsFiles.length) {
    throw new ExpectedError('no shopify products CSV selected');
  }
  const shopifyProductsCSV = await parseFilesAsCSV(shopifyProductsFiles, SHOPIFY_PRODUCTS_OPTIONS);
  if (cancelled) {
    return;
  }
  const shopifyProducts = convertShopifyProductsToInternal(shopifyProductsCSV);

  for (const vendor of vendors) {
    if (cancelled) {
      return;
    }

    if (!vendor.updateProducts) {
      logger.log(`[SKIP] product update not applicable to ${vendor.name}`);
      continue;
    }
    const vendorProductFiles = getFiles(vendor.name);
    let vendorProductCSV = await parseFileAsCSV(vendorProductFiles[0], vendor);
    if (cancelled) {
      return;
    }
    if (!vendorProductCSV) {
      logger.log(`[SKIP] no product file selected for ${vendor.name}`);
      continue;
    }

    logger.log(`Reading ${vendorProductCSV.length} items from product file for ${vendor.name}`);
    for (const vendorProduct of vendorProductCSV) {
      if (cancelled) {
        return;
      }
      const vendorProductSKU = parseSKU(vendor.getSKU(vendorProduct));
      if (!vendorProductSKU) {
        logger.debug(`[NOT FOUND] ${vendor.name} no SKU found for product`, vendorProduct);
        continue;
      }

      const vendorProductTitle = vendor.getTitle?.(vendorProduct) || '';
      const vendorProductBarcode = vendor.getParsedBarcode(vendorProduct);
      const vendorProductLabel = `${vendorProductSKU} (${vendorProductTitle}/${vendorProductBarcode})`;
      const { shopifyProduct, shopifyParent, shopifyProductLabel } = getShopifyProductAndParent(
        shopifyProducts, vendor, vendorProduct
      );
        
      if (!shopifyProduct) {
        logger.debug(`[NOT FOUND] ${vendor.name} SKU ${vendorProductLabel} in shopify products`);
        continue;
      }
      
      // Update price
      if (!vendor.getPrice) {
        // logger.debug(`[WARN] cannot update price for vendor ${vendor.name} getPrice not implemented`);
      } else {
        const vendorProductPrice = roundPrice(vendor.getPrice(vendorProduct)).toString();
        const shopifyProductPrice = shopifyProduct['Variant Price'].toString();

        if (shopifyProductPrice === vendorProductPrice) {
          logger.debug(`[PRICE MATCH] ${vendor.name} SKU ${vendorProductLabel} price ${vendorProductPrice} matches shopify product ${shopifyProductLabel}: ${shopifyProductPrice}`);
        } else {
          logger.log(`[PRICE UPDATE] ${vendor.name} SKU ${vendorProductLabel} price ${vendorProductPrice} differs in shopify product ${shopifyProductLabel}: ${shopifyProductPrice}`);
          shopifyProduct['Variant Price'] = vendorProductPrice;
          shopifyParent.edited = true;
        }
      }

      // Update barcode
      if (!vendor.getBarcode) {
        // logger.debug(`[WARN] cannot update barcode for vendor ${vendor.name} getBarcode not implemented`);
      } else {
        const shopifyProductBarcode = getShopifyProductParsedBarcode(shopifyProduct);
        if (shopifyProductBarcode === vendorProductBarcode) {
          logger.debug(`[BARCODE MATCH] ${vendor.name} SKU ${vendorProductLabel} barcode matches shopify product ${shopifyProductLabel}`);
          // even if the barcode matches it may not be nicely formatted. enable this once for existing products, then it's already handled
          // check the raw value to avoid updating absolutely everything
          // if ((shopifyProduct['Variant Barcode'] !== escapeBarcode(vendorProductBarcode))) {
          //   logger.log(`[BARCODE UPDATE] ${vendor.name} SKU ${vendorProductLabel} raw barcode differs in shopify product (${shopifyProduct['Variant Barcode']}) ${shopifyProductLabel}`);
          //   shopifyProduct['Variant Barcode'] = escapeBarcode(vendorProductBarcode);
          //   shopifyParent.edited = true;
          // }
        } else if (vendorProductBarcode === BARCODE_DOES_NOT_APPLY) {
          logger.debug(`[BARCODE UPDATE IGNORED] ${vendor.name} SKU ${vendorProductLabel} barcode missing but exists in shopify product ${shopifyProductLabel}`);
        } else {
          logger.log(`[BARCODE UPDATE] ${vendor.name} SKU ${vendorProductLabel} barcode differs in shopify product ${shopifyProductLabel}`);
          shopifyProduct['Variant Barcode'] = escapeBarcode(vendorProductBarcode);
          shopifyParent.edited = true;
        }
      }

      // Ensure the product has a vendor tag
      const shopifyParentTags = shopifyParent.primaryRow.Tags;
      if (!shopifyParentTags.split(', ').includes(vendor.name)) {
        logger.log(`[TAGS UPDATE] shopify product ${shopifyProductLabel} tags are missing ${vendor.name} vendor: [${shopifyParentTags}]`);
        shopifyParent.primaryRow.Tags += `, ${vendor.name}`;
        shopifyParent.edited = true;
      }

      // update main image
      if (!vendor.getVariantImageURL) {
        // logger.debug(`[WARN] cannot update variant images for vendor ${vendor.name} getVariantImageURL not implemented`);
      } else {
        const vendorVariantImage = vendor.getVariantImageURL(vendorProduct);
        if (!shopifyProduct['Image Src'] && vendorVariantImage) {
          logger.log(`[VARIANT IMAGE UPDATE] ${vendor.name} SKU ${vendorProductLabel} adding variant image to product ${shopifyProductLabel}`);
          shopifyProduct['Image Src'] = vendorVariantImage;
          shopifyParent.edited = true;
        }
      }

      // Update images. Do this for every sub item??
      if (!vendor.getAdditionalImages) {
        // logger.debug(`[WARN] cannot update additional images for vendor ${vendor.name} getAdditionalImages not implemented`);
      } else {
        const shopifyProductAdditionalImages = shopifyParent.secondaryRows.filter(row => {
          return row['Image Src'] && !row['Title'] && !row['Variant SKU'];
        });

        // Currently we only add new secondary images if there are no existing ones.
        // It's much harder to check if the images match between shopify and vendor because
        // the URL changes on import and we don't want to modify every listing every time.
        const vendorProductImages = vendor.getAdditionalImages(vendorProduct);
        if (!shopifyProductAdditionalImages.length && vendorProductImages.length) {
          logger.log(`[ADDITIONAL IMAGE UPDATE] ${vendor.name} SKU ${vendorProductLabel} adding ${vendorProductImages.length} more images to product ${shopifyProductLabel}`);
          // Add new images
          for (const image of vendorProductImages) {
            if (cancelled) {
              return;
            }
            shopifyParent.secondaryRows.push({
              ...DEFAULT_SHOPIFY_PRODUCT,
              Handle: shopifyParent.primaryRow.Handle,
              'Image Src': image,
            });
            shopifyParent.edited = true;
          };
        }
      }
    }
  }

  const shopifyProductsCSVExport = convertShopifyProductsToExternal(shopifyProducts, { onlyEdited: true });
  if (!shopifyProductsCSVExport.length) {
    logger.log('[DONE] Nothing to download');
    return 'Nothing to download';
  }
  logger.log('[DONE] Downloading products CSV');
  const csv = Papa.unparse(shopifyProductsCSVExport, {
    header: true,
    newline: '\n',
    // trim additional temp metadata like parsed barcode
    columns: SHOPIFY_PRODUCTS_OPTIONS.expectedHeaders
  });
  downloadCSV(csv, DOWNLOAD_PRODUCTS_UPDATE_FILE_NAME);
}

const addProducts = async () => {
  const shopifyProductsFiles = getFiles('shopify-products');
  if (!shopifyProductsFiles.length) {
    throw new ExpectedError('no shopify products CSV selected');
  }
  const shopifyProductsCSV = await parseFilesAsCSV(shopifyProductsFiles, SHOPIFY_PRODUCTS_OPTIONS);
  if (cancelled) {
    return;
  }
  const shopifyProducts = convertShopifyProductsToInternal(shopifyProductsCSV);

  for (const vendor of vendors) {
    if (cancelled) {
      return;
    }
    if (!vendor.addProducts) {
      logger.log(`[SKIP] add product not applicable to ${vendor.name}`);
      continue;
    }
    const vendorProductFiles = getFiles(vendor.name);
    let vendorProductCSV = await parseFileAsCSV(vendorProductFiles[0], vendor);
    if (cancelled) {
      return;
    }
    if (!vendorProductCSV) {
      logger.log(`[SKIP] no product file selected for ${vendor.name}`);
      continue;
    }

    logger.log(`[INFO] loading ${vendorProductCSV.length} items from ${vendor.name}`);
    for (const vendorProduct of vendorProductCSV) {
      if (cancelled) {
        return;
      }
      const vendorProductSKU = parseSKU(vendor.getSKU(vendorProduct));
      if (!vendorProductSKU) {
        logger.debug(`[NOT FOUND] ${vendor.name} no SKU found for product`, vendorProduct);
        continue;
      }

      const Title = vendor.getTitle(vendorProduct).trim();
      const vendorProductBarcode = vendor.getParsedBarcode(vendorProduct);
      const vendorProductLabel = `${vendorProductSKU} (${Title}/${vendorProductBarcode})`;
      const { shopifyProduct } = getShopifyProductAndParent(
        shopifyProducts, vendor, vendorProduct
      );
        
      if (shopifyProduct) {
        logger.debug(`[FOUND] ${vendor.name} SKU ${vendorProductLabel} in shopify products`);
        continue;
      }

      const vendorParent = vendorProduct[PARENT_SYMBOL];
      const { shopifyParent } = vendorParent ? getShopifyProductAndParent(
        shopifyProducts, vendor, vendorParent
      ) : { shopifyParent: undefined };
      const isNewProduct = !shopifyParent;

      // Generate a handle
      const Handle = isNewProduct
        ? vendor.name + '-' + Title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-)|(-$)/g, '').replace(/-+/g, '-')
        : shopifyParent.primaryRow.Handle;

      let product;
      if (isNewProduct) {
        const features = vendor.getFeatures?.(vendorProduct) || [];
        const featureHTML = features.length ? `<br><ul>${features.map(f => `<li><p>${f}</p></li>`).join('')}</ul>` : '';

        // create product as parent
        product = {
          Title,
          Handle,
          'Body (HTML)': featureHTML + vendor.getDescription(vendorProduct),
          Vendor: vendor.getVendor(vendorProduct),
          'Product Category': 'Sporting Goods',
          Type: vendor.getType?.(vendorProduct) ?? 'Sporting Goods',
          Published: 'TRUE',
          'Image Src': vendor.getMainImageURL(vendorProduct)
        };
        logger.log(`[ADDING] ${vendor.name} SKU ${vendorProductLabel} to shopify`);
      } else {
        logger.log(`[ADDING] ${vendor.name} SKU ${vendorProductLabel} to existing product in shopify`);
      }

      const price = roundPrice(vendor.getPrice(vendorProduct));
      product = {
        ...DEFAULT_SHOPIFY_PRODUCT,
        ...product,
        Handle,
        'Variant SKU': escapeSKU(vendorProductSKU),
        'Variant Inventory Tracker': 'shopify',
        'Variant Inventory Qty': vendor.getQuantity(vendorProduct),
        'Variant Inventory Policy': 'deny',
        'Variant Fulfillment Service': 'manual',
        'Variant Price': price,
        'Variant Compare At Price': vendor.getRRP ? roundPrice(vendor.getRRP(vendorProduct, vendor)) : price,
        'Variant Requires Shipping': 'TRUE',
        'Variant Taxable': vendor.getTaxable?.(vendorProduct)  ? 'TRUE' : 'FALSE',
        'Variant Barcode': escapeBarcode(vendorProductBarcode),
        'Image Src': vendor.getMainImageURL?.(vendorProduct),
        'Gift Card': 'FALSE',
        'Variant Weight Unit': 'kg',
        'Included / United Kingdom': 'TRUE',
        'Status': 'active'
      };
      if (vendor.getWeight) {
        product['Variant Grams'] = Math.min(vendor.getWeight(vendorProduct), 999);
      }
      if (vendor.getTaxCode) {
        product['Variant Tax Code'] = vendor.getTaxCode(vendorProduct);
      }

      const variants = vendor.getVariants?.(vendorProduct);
      if (variants?.length) {
        for (let i = 0; i <= variants.length && i <= 3; i++) {
          if (cancelled) {
            return;
          }
          if (variants[i]) {
            product[`Option${i+1} Name`] = variants[i].name;
            product[`Option${i+1} Value`] = variants[i].value;
          }
        }
      } else {
        product['Option1 Name'] = 'Title';
        product['Option1 Value'] = 'Default Title';
      }
      let additionalImages = [];
      if (vendor.getAdditionalImages) {
        additionalImages = vendor.getAdditionalImages(vendorProduct).map(image => ({
          ...DEFAULT_SHOPIFY_PRODUCT,
          Handle,
          'Image Src': image,
        }))
      }
      
      if (!isNewProduct) {
        shopifyParent.secondaryRows.push(product);
        shopifyParent.secondaryRows.push(...additionalImages);
        shopifyParent.edited = true;
      } else {
        // Always add new in and vendor id tags
        const tags = ['new in', vendor.name];
        if (vendor.getTags) {
          tags.push(...vendor.getTags(vendorProduct));
        }
        product.Tags = tags.join(', ');
        shopifyProducts.push({
          primaryRow: product,
          secondaryRows: additionalImages,
          edited: true
        });
      }
    }
  }

  const shopifyProductsCSVExport = convertShopifyProductsToExternal(shopifyProducts, { onlyEdited: true });
  if (!shopifyProductsCSVExport.length) {
    logger.log('[DONE] Nothing to download');
    return 'Nothing to download';
  }
  logger.log('[DONE] Downloading products CSV');
  const csv = Papa.unparse(shopifyProductsCSVExport, {
    header: true,
    newline: '\n',
    // trim additional temp metadata like parsed barcode
    columns: SHOPIFY_PRODUCTS_OPTIONS.expectedHeaders
  });
  downloadCSV(csv, DONWLOAD_PRODUCTS_FILE_NAME);
}

// products format
const convertShopifyProductsToInternal = (shopifyProductsCSV) => {
  shopifyProductsCSV = shopifyProductsCSV.sort((a, b) => {
    return a.Handle.localeCompare(b.Handle);
  });

  // reformat
  const shopifyProductsNewFormat = [];
  let currentProduct;
  for (const shopifyProduct of shopifyProductsCSV) {
    if (cancelled) {
      return;
    }
    shopifyProduct['Variant SKU'] = shopifyProduct['Variant SKU'].replace(/^'/, '');
    if (currentProduct?.primaryRow.Handle !== shopifyProduct.Handle) {
      currentProduct = {
        primaryRow: shopifyProduct,
        secondaryRows: [],
        edited: false
      };
      shopifyProductsNewFormat.push(currentProduct);
    } else {
      currentProduct.secondaryRows.push(shopifyProduct);
    }
  }
  return shopifyProductsNewFormat;
}

const convertShopifyProductsToExternal = (products, options = {}) => {
  const shopifyProductsCSV = [];
  for (const product of products) {
    if (cancelled) {
      return;
    }
    if (options.onlyEdited && !product.edited) {
      continue;
    }
    shopifyProductsCSV.push(product.primaryRow);
    shopifyProductsCSV.push(...product.secondaryRows);
  }
  return shopifyProductsCSV;
}

function App() {
  const [ alert, setAlert ] = useState(null);
  const INITIAL_STOCK_CAP = 5;
  const [ maxQuantity, setMaxQuantity ] = useState(INITIAL_STOCK_CAP);
  const cancel = () => {
    cancelled = true;
    setAlert(null);
  }
  const onError = err => {
    logger.error(err);
    const message = err instanceof ExpectedError ? err.message : err.stack;
    setAlert({ header: 'Error', message });
  }
  const withLoading = (fn, loadingMessage) => {
    return async (e) => {
      cancelled = false;
      e.preventDefault();
      e.stopPropagation();

      setAlert({hasClose: false, header: loadingMessage || 'Loading...', message: (
        <>
          <div className="lds-roller"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
          <button
            onClick={cancel}
            style={{backgroundColor: 'red', color: 'white', height: '50px', fontSize: '20px', width: '100%', marginTop: 'auto'}}
          >
            Cancel
          </button>
        </>
      )})

      try {
        const info = await fn(e, { maxQuantity });
        if (info) {
          setAlert({ header: 'Info', message: info });
        } else {
          setAlert(null);
        }
      } catch (err) {
        onError(err);
      }
    }
  }
  return (
    <div className="App">
      <header className="App-header">
        {alert ? <Alert header={alert.header} message={alert.message} hasClose={alert.hasClose} onClose={() => setAlert(null)}/>: null }
        <form style={{pointerEvents: alert ? 'none': undefined}} id="myform" className="form" onSubmit={e => {e.preventDefault()}}>
          <h2>Shopify Inventory</h2>
          <label htmlFor="shopify-inventory">{SHOPIFY_INVENTORY_OPTIONS.importLabel} </label>
          <input type="file" multiple accept=".csv,.zip" id="shopify-inventory" name="shopify-inventory" />
          <p/>
          <h2>Shopify Products</h2>
          <label htmlFor="shopify-products">{SHOPIFY_PRODUCTS_OPTIONS.importLabel} </label>
          <input type="file" multiple accept=".csv,.zip" id="shopify-products" name="shopify-products" />
          <p/>
          <h2>Vendor Inventory</h2>
          {vendors.map(vendor => (
            <div key={vendor.name}>
              <label className="vendor-label" htmlFor={vendor.name}>{vendor.importLabel}</label>
              <input type="file" accept=".csv,.zip" id={vendor.name} name={vendor.name} />
              <p/>
            </div>
          ))}
          <h2>Settings</h2>
          <label htmlFor="maxquantity" style={{paddingRight: '5px' }}>
            Maximum stock level
          </label>
          <input
            id="maxquantity"
            type="number"
            value={maxQuantity}
            onChange={e => setMaxQuantity(e.target.value)}
          />
          <p/>
          <button
            onClick={withLoading(updateInventory, 'Generating updated inventory...')}
            style={{backgroundColor: 'green', color: 'white', height: '50px', fontSize: '20px', width: '100%'}}
          >
            Download Inventory CSV (Update Quantity)
          </button>
          <p/>
          <button
            onClick={withLoading(addProducts, 'Generating new products...')}
            style={{backgroundColor: 'green', color: 'white', height: '50px', fontSize: '20px', width: '100%'}}
          >
            Download Products CSV (Add missing products)
          </button>
          <p/>
          <button
            onClick={withLoading(updateProducts, 'Generating updated products...')}
            style={{backgroundColor: 'green', color: 'white', height: '50px', fontSize: '20px', width: '100%'}}
          >
            Download Products CSV (Edit products)
          </button>
          <p/>
          <p/>
        </form>
      </header>
      <div style={{ position: 'absolute', bottom: '10px', left: '10px', color: 'white' }}>
        Version: {new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'long' }).format(+process.env.BUILD_TIME)}
      </div>
    </div>
  );
}

export default App;
