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
  'Handle': '', 'Title': '', 'Body (HTML)': '', 'Vendor': '', 'Product Category': '', 'Type': '', 'Tags': '', 'Published': '', 'Option1 Name': '', 'Option1 Value': '', 'Option2 Name': '', 'Option2 Value': '', 'Option3 Name': '', 'Option3 Value': '', 'Variant SKU': '', 'Variant Grams': '', 'Variant Inventory Tracker': '', 'Variant Inventory Qty': '', 'Variant Inventory Policy': '', 'Variant Fulfillment Service': '', 'Variant Price': '', 'Variant Compare At Price': '', 'Variant Requires Shipping': '', 'Variant Taxable': '', 'Variant Barcode': '', 'Image Src': '', 'Image Position': '', 'Image Alt Text': '', 'Gift Card': '', 'SEO Title': '', 'SEO Description': '', 'Google Shopping / Google Product Category': '', 'Google Shopping / Gender': '', 'Google Shopping / Age Group': '', 'Google Shopping / MPN': '', 'Google Shopping / AdWords Grouping': '', 'Google Shopping / AdWords Labels': '', 'Google Shopping / Condition': '', 'Google Shopping / Custom Product': '', 'Google Shopping / Custom Label 0': '', 'Google Shopping / Custom Label 1': '', 'Google Shopping / Custom Label 2': '', 'Google Shopping / Custom Label 3': '', 'Google Shopping / Custom Label 4': '', 'Variant Image': '', 'Variant Weight Unit': '', 'Variant Tax Code': '', 'Cost per item': '', 'Included / United Kingdom': '', 'Status': ''
}
const PARENT_SYMBOL = Symbol.for('parent');

let logger = {
  log: () => {},
  warn: () => {},
  error: () => {}
};

class ExpectedError extends Error {};

const DEBUG = true;
if (DEBUG) {
  logger = console;
}


let cancelled = false;

function roundPrice(price) {
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

const SHOPIFY_MULTIPLE_OPTIONS = {
  orderBy: item => item.Handle
}

async function parseFilesAsCSV(files, vendor, multipleOptions) {
  const allFiles = await Promise.all(Array.from(files).map(f => parseFileAsCSV(f, vendor)));
  let csv = [].concat(...allFiles);
  if (multipleOptions?.orderBy) {
    csv = csv.sort((a, b) => {
      return multipleOptions.orderBy(a).localeCompare(multipleOptions.orderBy(b));
    });
  }
  return csv;
}

async function readZip(file){
  const entries = await (
    new ZipReader(new BlobReader(file))
  ).getEntries();
  
  // Only read the first csv entry
  const csvFile = entries.find(entry => entry.filename.endsWith('.csv'));
  if (!csvFile) {
    throw new Error('Cannot find .csv in zip file', file.name)
  }
  const blob = await csvFile.getData(new BlobWriter());
  return new File(new Array(blob), csvFile.filename);
}

async function parseFileAsCSV(file, vendor) {
  if (!file) return;

  if (file.name.endsWith('.zip')) {
    file = await readZip(file);
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

  if (vendor?.expectedHeaders) {
    let match = false;
    if (!Array.isArray(vendor.expectedHeaders[0])) {
      vendor.expectedHeaders = [vendor.expectedHeaders ];
    }
    // check if at least one of the sets of expected headers matches the ones we got
    match = vendor.expectedHeaders.some(expected => {
      if (expected.length !== headers.length) {
        return false;
      }
      return expected.every((header, i) => {
        return header === expected[i];
      });
    });

    if (!match) {
      let expected;
      if (Array.isArray(vendor.expectedHeaders[0])) {
        expected = vendor.expectedHeaders.map(JSON.stringify).join('\nor\n');
      } else {
        expected = JSON.stringify(vendor.expectedHeaders);
      }
      throw new ExpectedError(`${vendor.importLabel} headers don't look right.\n\n  Expected:\n ${expected}\n\n  Got:\n ${JSON.stringify(headers)}`);
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
      const id = vendor.getVariantCorrelationId(item);
      if (parents[id]) {
        item[PARENT_SYMBOL] = parents[id];
      } else if (id) {
        parents[id] = item;
      }
    }
  }

  return csv;
}

const getFiles = (inputID) => {
  const form = document.getElementById('myform');
  const input = form?.querySelector(`#${inputID}`);
  return input?.files || [];
}

// Updates existing items in inventory
// The full inventory is not downloaded, only updated rows
const updateInventory = async (e, { maxQuantity }) => {
  const shopifyInventoryFiles = getFiles('shopify-inventory');
  if (!shopifyInventoryFiles.length) {

   throw new ExpectedError('no shopify inventory CSV selected');
    return;
  }
  const shopifyInventoryCSV = await parseFilesAsCSV(shopifyInventoryFiles, undefined, SHOPIFY_MULTIPLE_OPTIONS);
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
    if (!vendorInventoryCSV) {
      logger.log(`[SKIP] no inventory file selected for ${vendor.name}`);
      continue;
    }

    for (const vendorItem of vendorInventoryCSV) {
      if (cancelled) {
        return;
      }
      const vendorItemSKU = vendor.getSKU(vendorItem);
      if (!vendorItemSKU) {
        continue;
      }

      const shopifyItem = shopifyInventoryCSV.find(r => {
        return !!matchInventory(r, vendor, vendorItem)
      });

      if (!shopifyItem) {
        logger.log(`[NOT FOUND] ${vendor.name} SKU ${vendorItemSKU} in shopify inventory`);
        continue;
      }
      logger.log(`[FOUND] ${vendor.name} SKU ${vendorItemSKU} in shopify inventory`);
      let updated = false

      // Update quantity

      // Cap the new quantity
      const vendorItemQuantity = Math.min(vendor.getQuantity(vendorItem), maxQuantity);
      const shopifyItemQuantity = +shopifyItem['On hand'];
      if (shopifyItemQuantity === vendorItemQuantity) {
        logger.log(`[QUANTITY MATCH] ${vendor.name} SKU ${vendorItemSKU} quantity ${vendorItemQuantity} matches shopify inventory: ${shopifyItemQuantity}`);
      } else {
        logger.warn(`[QUANTITY UPDATE] ${vendor.name} SKU ${vendorItemSKU} quantity ${vendorItemQuantity} differs in shopify inventory: ${shopifyItemQuantity}`);
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
    logger.warn('[DONE] Nothing to download');
    return;
  }
  logger.warn('[DONE] Downloading CSV');
  const csv = Papa.unparse(shopifyInventoryUpdates, {
    header: true,
    newline: '\n',
  });
  downloadCSV(csv, DOWNLOAD_INVENTORY_FILE_NAME);
}

const matchShopifyItems = (shopifyItemSKU, shopifyItemTitle, shopifyItemBarcode, vendor, vendorProduct, matchBarcode) => {
  const vendorProductSKU = vendor.getSKU(vendorProduct);
  if (shopifyItemSKU !== vendorProductSKU) {
    return;
  }
  if (vendor.deny?.includes(vendorProductSKU)) {
    return;
  }

  const shopifyItemLabel = `${shopifyItemSKU} (${shopifyItemTitle}/${shopifyItemBarcode})`;
  const vendorProductTitle = vendor.getTitle?.(vendorProduct) || '';
  const vendorProductBarcode = vendor.getBarcode?.(vendorProduct) || 'does not apply';
  const vendorProductLabel = `${vendorProductSKU} (${vendorProductTitle}/${vendorProductBarcode})`;
  if (matchBarcode) {
    if (shopifyItemBarcode === vendorProductBarcode) {
      return shopifyItemLabel;
    } else {
      // barcode is different for same SKU - log an ERROR but this can be wrong so try title too
      logger.warn(`[WARN] ${vendor.name} ${vendorProductLabel} matches SKU but does not match shopify product barcode ${shopifyItemLabel}. ${vendor.useTitleForMatching ? 'Checking title instead...' : ''}`);
      if (vendor.useBarcodeForExclusiveMatching) {
        return;
      }
    }
  }
  
  // Some vendors have shitty titles
  if (vendor.useTitleForMatching) {
    // compare titles to have some safety net
    const similarity = diceCoefficient.similarity(vendorProductTitle, shopifyItemTitle);
    if (similarity <= 0.4) {
      logger.warn(`[WARN] ${vendor.name} SKU ${vendorProductLabel} matches SKU but does not match shopify product title ${shopifyItemLabel}. (${similarity} similar)`);
      return;
    }
  }

  // If the barcode is wrong but the title is close enough then let it match
  return shopifyItemLabel;
};

const matchInventory = (shopifyInventory, vendor, vendorProduct) => {
  return matchShopifyItems(
    shopifyInventory.SKU.replace(/^'/, ''),
    shopifyInventory.Title,
    '',
    vendor,
    vendorProduct,
    false
  );
};

const matchProduct = (shopifyParent, shopifyProduct, vendor, vendorProduct) => {
  return matchShopifyItems(
    shopifyProduct['Variant SKU'],
    shopifyParent.primaryRow.Title,
    shopifyProduct['Variant Barcode'],
    vendor,
    vendorProduct,
    true
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
  logger.info('Update products');
  const shopifyProductsFiles = getFiles('shopify-products');
  if (!shopifyProductsFiles.length) {
    throw new ExpectedError('no shopify products CSV selected');
  }
  const shopifyProductsCSV = await parseFilesAsCSV(shopifyProductsFiles, undefined, SHOPIFY_MULTIPLE_OPTIONS);
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
    if (!vendorProductCSV) {
      logger.log(`[SKIP] no product file selected for ${vendor.name}`);
      continue;
    }

    for (const vendorProduct of vendorProductCSV) {
      if (cancelled) {
        return;
      }
      const vendorProductSKU = vendor.getSKU(vendorProduct);
      if (!vendorProductSKU) {
        logger.log(`[NOT FOUND] ${vendor.name} no SKU found for product`, vendorProduct);
        continue;
      }

      const vendorProductTitle = vendor.getTitle?.(vendorProduct) || '';
      const vendorProductBarcode = vendor.getBarcode?.(vendorProduct) || 'does not apply';
      const vendorProductLabel = `${vendorProductSKU} (${vendorProductTitle}/${vendorProductBarcode})`;
      const { shopifyProduct, shopifyParent, shopifyProductLabel } = getShopifyProductAndParent(
        shopifyProducts, vendor, vendorProduct
      );
        
      if (!shopifyProduct) {
        logger.log(`[NOT FOUND] ${vendor.name} SKU ${vendorProductLabel} in shopify products`);
        continue;
      }
      
      // Update price
      if (!vendor.getPrice) {
        logger.warn(`[WARN] cannot update price for vendor ${vendor.name} getPrice not implemented`);
      } else {
        const vendorProductPrice = roundPrice(vendor.getPrice(vendorProduct)).toString();
        const shopifyProductPrice = shopifyProduct['Variant Price'].toString();

        if (shopifyProductPrice === vendorProductPrice) {
          logger.log(`[PRICE MATCH] ${vendor.name} SKU ${vendorProductLabel} price ${vendorProductPrice} matches shopify product ${shopifyProductLabel}: ${shopifyProductPrice}`);
        } else {
          logger.warn(shopifyProduct, shopifyParent)
          logger.warn(`[PRICE UPDATE] ${vendor.name} SKU ${vendorProductLabel} price ${vendorProductPrice} differs in shopify product ${shopifyProductLabel}: ${shopifyProductPrice}`);
          shopifyProduct['Variant Price'] = vendorProductPrice;
          shopifyParent.edited = true;
        }
      }

      // Update barcode
      if (!vendor.getBarcode) {
        logger.warn(`[WARN] cannot update barcode for vendor ${vendor.name} getBarcode not implemented`);
      } else {
        const shopifyProductBarcode = shopifyProduct['Variant Barcode'];
        if (shopifyProductBarcode === vendorProductBarcode) {
          logger.log(`[BARCODE MATCH] ${vendor.name} SKU ${vendorProductLabel} barcode matches shopify product ${shopifyProductLabel}`);
        } else {
          logger.warn(`[BARCODE UPDATE] ${vendor.name} SKU ${vendorProductLabel} barcode differs in shopify product ${shopifyProductLabel}`);
          shopifyProduct['Variant Barcode'] = vendorProductBarcode;
          shopifyParent.edited = true;
        }
      }

      // update main image
      if (!vendor.getVariantImageURL) {
        logger.warn(`[WARN] cannot update variant images for vendor ${vendor.name} getVariantImageURL not implemented`);
      } else {
        const vendorVariantImage = vendor.getVariantImageURL(vendorProduct);
        if (!shopifyProduct['Image Src'] && vendorVariantImage) {
          logger.warn(`[VARIANT IMAGE UPDATE] ${vendor.name} SKU ${vendorProductLabel} adding variant image to product ${shopifyProductLabel}`);
          shopifyProduct['Image Src'] = vendorVariantImage;
          shopifyParent.edited = true;
        }
      }

      // Update images. Do this for every sub item??
      if (!vendor.getAdditionalImages) {
        logger.warn(`[WARN] cannot update additional images for vendor ${vendor.name} getAdditionalImages not implemented`);
      } else {
        const shopifyProductAdditionalImages = shopifyParent.secondaryRows.filter(row => {
          return row['Image Src'] && !row['Title'] && !row['Variant SKU'];
        });

        // Currently we only add new secondary images if there are no existing ones.
        // It's much harder to check if the images match between shopify and vendor because
        // the URL changes on import and we don't want to modify every listing every time.
        const vendorProductImages = vendor.getAdditionalImages(vendorProduct);
        if (!shopifyProductAdditionalImages.length && vendorProductImages.length) {
          logger.warn(`[ADDITIONAL IMAGE UPDATE] ${vendor.name} SKU ${vendorProductLabel} adding ${vendorProductImages.length} more images to product ${shopifyProductLabel}`);
          // Add new images
          for (const image of vendorProductImages) {
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
    logger.warn('[DONE] Nothing to download');
    return;
  }
  logger.warn('[DONE] Downloading CSV');
  const csv = Papa.unparse(shopifyProductsCSVExport, {
    header: true,
    newline: '\n',
  });
  downloadCSV(csv, DOWNLOAD_PRODUCTS_UPDATE_FILE_NAME);
}

const addProducts = async () => {
  const shopifyProductsFiles = getFiles('shopify-products');
  if (!shopifyProductsFiles.length) {
    throw new ExpectedError('no shopify products CSV selected');
  }
  const shopifyProductsCSV = await parseFilesAsCSV(shopifyProductsFiles, undefined, SHOPIFY_MULTIPLE_OPTIONS);
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
    if (!vendorProductCSV) {
      logger.log(`[SKIP] no product file selected for ${vendor.name}`);
      continue;
    }

    for (const vendorProduct of vendorProductCSV) {
      if (cancelled) {
        return;
      }
      const vendorProductSKU = vendor.getSKU(vendorProduct);
      if (!vendorProductSKU) {
        logger.log(`[NOT FOUND] ${vendor.name} no SKU found for product`, vendorProduct);
        continue;
      }

      const Title = vendor.getTitle(vendorProduct).trim();
      const vendorProductBarcode = vendor.getBarcode?.(vendorProduct) || 'does not apply';
      const vendorProductLabel = `${vendorProductSKU} (${Title}/${vendorProductBarcode})`;
      const { shopifyProduct } = getShopifyProductAndParent(
        shopifyProducts, vendor, vendorProduct
      );
        
      if (shopifyProduct) {
        logger.log(`[FOUND] ${vendor.name} SKU ${vendorProductLabel} in shopify products`, shopifyProduct);
        continue;
      }
    
      const vendorParent = vendorProduct[PARENT_SYMBOL];
      const { shopifyParent } = vendorParent ? getShopifyProductAndParent(
        shopifyProducts, vendor, vendorParent
      ) : { shopifyParent: undefined };
      const isNewProduct = !shopifyParent;

      // Generate a handle
      const Handle = isNewProduct
        ? Title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
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
        logger.warn(`[ADDING] ${vendor.name} new product SKU ${vendorProductLabel} to shopify`, vendorProduct);
      } else {
        logger.warn(`[ADDING] ${vendor.name} SKU ${vendorProductLabel} to existing product in shopify`, vendorProduct);
      }

      const price = roundPrice(vendor.getPrice(vendorProduct));
      product = {
        ...DEFAULT_SHOPIFY_PRODUCT,
        ...product,
        Handle,
        'Variant SKU': vendorProductSKU,
        'Variant Inventory Tracker': 'shopify',
        'Variant Inventory Qty': vendor.getQuantity(vendorProduct),
        'Variant Inventory Policy': 'deny',
        'Variant Fulfillment Service': 'manual',
        'Variant Price': price,
        'Variant Compare At Price': vendor.getRRP ? roundPrice(vendor.getRRP(vendorProduct)) : price,
        'Variant Requires Shipping': 'TRUE',
        'Variant Taxable': vendor.getTaxable?.(vendorProduct)  ? 'TRUE' : 'FALSE',
        'Variant Barcode': vendorProductBarcode,
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
      if (vendor.getTags) {
        product['Tags'] = vendor.getTags(vendorProduct);
      }
      const variants = vendor.getVariants?.(vendorProduct);
      if (variants?.length) {
        for (let i = 0; i <= variants.length && i <= 3; i++) {
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
    logger.warn('[DONE] Nothing to download');
    return;
  }
  logger.warn('[DONE] Downloading CSV');
  const csv = Papa.unparse(shopifyProductsCSVExport, {
    header: true,
    newline: '\n',
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
    shopifyProduct['Variant Barcode'] = shopifyProduct['Variant Barcode'].replace(/^'/, '');
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
    if (options.onlyEdited && !product.edited) {
      continue;
    }
    shopifyProductsCSV.push(product.primaryRow);
    shopifyProductsCSV.push(...product.secondaryRows);
  }
  return shopifyProductsCSV;
}

function App() {
  const [ loading, setLoading ] = useState(false);
  const [ alert, setAlert ] = useState(null);
  const INITIAL_STOCK_CAP = 5;
  const [ maxQuantity, setMaxQuantity ] = useState(INITIAL_STOCK_CAP);
  const cancel = () => {
    cancelled = true;
    setLoading(false);
  }
  const onError = err => {
    logger.error(err);
    const message = err instanceof ExpectedError ? err.message : err.stack;
    setAlert({ header: 'Error', message });
  }
  const withLoading = (fn) => {
    return async (e) => {
      cancelled = false;
      e.preventDefault();
      e.stopPropagation();
      setLoading(true);
      await fn(e, { maxQuantity }).catch(onError);
      setLoading(false);
    }
  }
  return (
    <div className="App">
      <header className="App-header">
        {alert ? <Alert header={alert.header} message={alert.message} onClose={() => setAlert(null)}/>: null }
        <form style={{pointerEvents: alert ? 'none': undefined}} id="myform" className="form" onSubmit={e => {e.preventDefault()}}>
          <h2>Shopify Inventory</h2>
          <label htmlFor="shopify-inventory">Shopify inventory CSV:</label>
          <input type="file" multiple accept=".csv,.zip" id="shopify-inventory" name="shopify-inventory" />
          <p/>
          <h2>Shopify Products</h2>
          <label htmlFor="shopify-products">Shopify products CSV:</label>
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
          {loading ? (
            <>
              <div className="lds-roller"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
              <button
                onClick={cancel}
                >
                Cancel
              </button>
            </>
          ) : (
            <>
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
                onClick={withLoading(updateInventory)}
                style={{backgroundColor: 'green', color: 'white', height: '50px', fontSize: '20px', width: '100%'}}
              >
                Download Inventory CSV (Update Quantity)
              </button>
              <p/>
              <button
                onClick={withLoading(addProducts)}
                style={{backgroundColor: 'green', color: 'white', height: '50px', fontSize: '20px', width: '100%'}}
              >
                Download Products CSV (Add missing products)
              </button>
              <p/>
              <button
                onClick={withLoading(updateProducts)}
                style={{backgroundColor: 'green', color: 'white', height: '50px', fontSize: '20px', width: '100%'}}
              >
                Download Products CSV (Edit products)
              </button>
              <p/>
              <p/>
            </>
          )}
        </form>
      </header>
      <div style={{ position: 'absolute', bottom: '10px', left: '10px', color: 'white' }}>
        Version: {new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'long' }).format(+process.env.BUILD_TIME)}
      </div>
    </div>
  );
}

export default App;
