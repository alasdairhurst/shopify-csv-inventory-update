import Papa from 'papaparse';
import he from 'he';
import { diceCoefficient } from 'string-comparison';
import './App.css';
import vendors from './vendors';

const STOCK_CAP = 50;
const DOWNLOAD_INVENTORY_FILE_NAME = 'completed_inventory_update_for_shopify.csv';
const DOWNLOAD_PRODUCTS_UPDATE_FILE_NAME = 'completed_products_update_for_shopify.csv';
const DONWLOAD_PRODUCTS_FILE_NAME = 'new_products_for_shopify.csv';
const DEFAULT_SHOPIFY_PRODUCT = {
  'Handle': '', 'Title': '', 'Body (HTML)': '', 'Vendor': '', 'Product Category': '', 'Type': '', 'Tags': '', 'Published': '', 'Option1 Name': '', 'Option1 Value': '', 'Option2 Name': '', 'Option2 Value': '', 'Option3 Name': '', 'Option3 Value': '', 'Variant SKU': '', 'Variant Grams': '', 'Variant Inventory Tracker': '', 'Variant Inventory Qty': '', 'Variant Inventory Policy': '', 'Variant Fulfillment Service': '', 'Variant Price': '', 'Variant Compare At Price': '', 'Variant Requires Shipping': '', 'Variant Taxable': '', 'Variant Barcode': '', 'Image Src': '', 'Image Position': '', 'Image Alt Text': '', 'Gift Card': '', 'SEO Title': '', 'SEO Description': '', 'Google Shopping / Google Product Category': '', 'Google Shopping / Gender': '', 'Google Shopping / Age Group': '', 'Google Shopping / MPN': '', 'Google Shopping / AdWords Grouping': '', 'Google Shopping / AdWords Labels': '', 'Google Shopping / Condition': '', 'Google Shopping / Custom Product': '', 'Google Shopping / Custom Label 0': '', 'Google Shopping / Custom Label 1': '', 'Google Shopping / Custom Label 2': '', 'Google Shopping / Custom Label 3': '', 'Google Shopping / Custom Label 4': '', 'Variant Image': '', 'Variant Weight Unit': '', 'Variant Tax Code': '', 'Cost per item': '', 'Included / United Kingdom': '', 'Status': ''
}

let logger = {
  log: () => {},
  warn: () => {},
  error: () => {}
};

const DEBUG = true;
if (DEBUG) {
  logger = console;
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
      complete: function(results) {
        resolve(results.data);
      },
      error: function(error) {
        reject(error);
      }
    });
  });
}

async function parseFileAsCSV(field, props) {
  const file = field.files[0];
  if (!file) return;

  const reader = new FileReader();
  // Read the file content synchronously
  reader.readAsText(file);
  await new Promise(resolve => {
    reader.onload = resolve;
  });

  let fileContent = reader.result; // Get the file content
  let headerRow = '';
  if (props?.headers) {
    headerRow = props.headers.join(',') + '\n';
  }
  if (props?.name === 'blitz') {
    fileContent = he.decode(fileContent);
  }
  const csv = await parseCSVString(headerRow + fileContent);
  if (props?.variantFormat === 'multiline-mtb') {
    const newCSV = [];
    let parentItem;
    for (const i of csv) {
      // variant parent
      if (!i.SKU && !i['Option SKU']) {
        parentItem = i;
        continue;
      }
      // singular
      if (i.SKU) {
        newCSV.push(i);
        continue
      }
      // variant
      newCSV.push({
        ...parentItem,
        SKU: i['Option SKU'],
        Quantity: i['Option quantity'],
        'Option value': i['Option value']
      });
    }
    return newCSV;
  } else if (props?.variantFormat === 'blitz') {
    const newCSV = [];
    let parentItem;
    for (const i of csv) {
      // variant parent
      if (i.Type === 'Parent') {
        parentItem = i;
        continue;
      }
      // singular
      if (i.Type === 'Standard') {
        newCSV.push(i);
        continue;
      }
      const newItem = {...parentItem};
      for (const key in i) {
        if (i[key] !== '' && !['Title'].includes(key)) {
          newItem[key] = i[key];
        }
      }
      // variant
      newCSV.push(newItem);
    }
    return newCSV;
  }

  return csv;
}

function getStockUpdates ({vendor, vendorCSV, shopifyCSV, shopifyProductsCSV, vendorSKUKey, vendorQuantityKey, addMissing, updateInventory, orderBy}) {
  const vendorUpdates = [];
  const newProducts = [];
  if (!vendorCSV) {
    return { vendorUpdates, newProducts };
  }
  if (orderBy) {
    vendorCSV = vendorCSV.sort((a, b) => {
      return a[orderBy].localeCompare(b[orderBy]);
    });
  }
  vendorCSV.forEach((newStockItem, i) => {
    const prevStockItem = vendorCSV[i-1];
    const SKU = newStockItem[vendorSKUKey].replace('\n', '');
    if (!SKU) {
      return;
    }
    const currentShopifyInventoryItem = shopifyCSV?.find(r => r.SKU && r.SKU === SKU);
    const rawNewQuantity = isNaN(+newStockItem[vendorQuantityKey]) ? (newStockItem[vendorQuantityKey] === 'True' ? 25 : 0) : +newStockItem[vendorQuantityKey];
    const newQuantity = Math.min(rawNewQuantity, STOCK_CAP);
    if (!currentShopifyInventoryItem) {
      logger.error(`no item found in shopify with ${vendor} SKU ${SKU}`);
      if (addMissing) {
        logger.warn(`creating new item for SKU ${SKU} from ${vendor} product listing`, newStockItem)
      }
      const prevProduct = newProducts[newProducts.length - 1];
      if (vendor === 'muaythai' && addMissing) {
        const Handle = newStockItem.Name.toLowerCase().replace(/\s/g, '-');
        const isNewProduct = Handle !== prevProduct?.Handle;
        let newProductInfo = {};
        // if no prev product or 
        if (isNewProduct) {
          newProductInfo = {
            Title: newStockItem.Name,
            'Body (HTML)': newStockItem.Description,
            Vendor: newStockItem.Manufacturer,
            'Product Category': 'Sporting Goods',
            Type: 'Sporting Goods',
            Published: 'TRUE',
            'Image Src': newStockItem['Main image'],
            'Option1 Name': 'Title',
            'Option1 Value': 'Default Title'
          };
          if (prevProduct?.Title) {
            prevProduct['Option1 Name'] = 'Title';
            prevProduct['Option1 Value'] = 'Default Title';
          }
        }
        newProducts.push({
          ...DEFAULT_SHOPIFY_PRODUCT,
          Handle,
          ...newProductInfo,
          'Option1 Name': 'Variant',
          'Option1 Value': newStockItem['Option value'],
          'Variant SKU': newStockItem.SKU,
          'Variant Grams': Math.min(+newStockItem.Weight, 999),
          'Variant Inventory Tracker': 'shopify',
          'Variant Inventory Qty': newQuantity,
          'Variant Inventory Policy': 'deny',
          'Variant Fulfillment Service': 'manual',
          'Variant Price': Math.ceil(+newStockItem.Price * 1.2) - 0.01,
          'Variant Compare At Price': Math.ceil(+newStockItem.Price * 1.2) - 0.01,
          'Variant Requires Shipping': 'TRUE',
          'Variant Taxable': 'TRUE',
          'Variant Barcode': newStockItem.SKU,
          'Gift Card': 'FALSE',
          'Variant Weight Unit': 'kg',
          'Included / United Kingdom': 'TRUE',
          'Status': 'active'
        });
      } else if (vendor === 'reydon-products' && addMissing) {
        const Handle = currentShopifyInventoryItem?.Handle || newStockItem['Product_Name'].toLowerCase().replace(/\s/g, '-');
        let newProductInfo = {};
        const VAT = +newStockItem.VAT / 100;
        const isNewProduct = Handle !== prevProduct?.Handle;
        if (isNewProduct) {
          newProductInfo = {
            Title: newStockItem['Product_Name'],
            'Body (HTML)': newStockItem.Description,
            Vendor: newStockItem.Brand,
            'Product Category': 'Sporting Goods',
            Type: 'Sporting Goods',
            Published: 'TRUE',
            'Image Src': newStockItem['Image_FTP'],
            'Option1 Name': 'Title',
            'Option1 Value': 'Default Title'
          };
          if (prevProduct?.Title) {
            prevProduct['Option1 Name'] = 'Title';
            prevProduct['Option1 Value'] = 'Default Title';
            prevProduct['Option2 Name'] = undefined;
            prevProduct['Option2 Value'] = undefined;
          }
        }

        newProducts.push({
          ...DEFAULT_SHOPIFY_PRODUCT,
          Handle,
          ...newProductInfo,
          'Option1 Name': newStockItem.Size ? 'Size' : newStockItem.Colour ? 'Colour': 'Title',
          'Option1 Value': newStockItem.Size || newStockItem.Colour || 'Default Title',
          'Option2 Name': newStockItem.Size && newStockItem.Colour ? 'Colour': undefined,
          'Option2 Value': newStockItem.Size ? newStockItem.Colour : undefined,
          'Variant SKU': SKU,
          'Variant Grams': Math.min(+newStockItem.Weight_KG, 999),
          'Variant Inventory Tracker': 'shopify',
          'Variant Inventory Qty': newQuantity,
          'Variant Inventory Policy': 'deny',
          'Variant Fulfillment Service': 'manual',
          'Variant Price': Math.ceil(+newStockItem.Your_Price * 1.4 * (1+VAT) + 3) - 0.01,
          'Variant Compare At Price': newStockItem.SRP,
          'Variant Requires Shipping': 'TRUE',
          'Variant Taxable': VAT > 0 ? 'TRUE' : 'FALSE',
          'Variant Barcode': newStockItem.Barcode,
          'Gift Card': 'FALSE',
          'Variant Weight Unit': 'kg',
          'Included / United Kingdom': 'TRUE',
          'Status': 'active'
        });
      } else if (vendor === 'blitz' && addMissing) {
        let newProductInfo = {};
        const VAT = newStockItem.Taxable === 'True' ? 0.2 : 0;
        const curHandle = newStockItem.LinkComponent || newStockItem.Link.replace('https://www.blitzsport.com/', '');
        const prevHandle = prevStockItem?.LinkComponent || prevStockItem?.Link?.replace('https://www.blitzsport.com/', '');
        const isNewProduct = newStockItem.Type === 'Standard' || (curHandle !== prevHandle);
        if (isNewProduct) {
          const features = [];
          for (let i = 1; i <=5; i++) {
            if (newStockItem[`Feature${i}`] !== '') {
              features.push(newStockItem[`Feature${i}`]);
            }
          }
          const featureHTML = features.length ? `<br><ul>${features.map(f => `<li><p>${f}</p></li>`).join('')}</ul>` : '';
          newProductInfo = {
            Title: newStockItem.Title,
            'Body (HTML)': newStockItem.Description + featureHTML,
            Vendor: newStockItem.Brand,
            'Product Category': 'Sporting Goods',
            Type: newStockItem.Category,
            Published: 'TRUE',
            'Image Src': newStockItem.ImageUrl,
            'Option1 Name': 'Title',
            'Option1 Value': 'Default Title'
          };
          logger.log(newProductInfo);
          // add images for previous product
          if (prevStockItem) {
            for (let i = 1; i <=5; i++) {
              if (!!prevStockItem[`AltImage${i}`]) {
                newProducts.push({
                  Handle: prevHandle,
                  'Image Src': prevStockItem[`AltImage${i}`]
                });
              }
            }
          }
        } else if (newStockItem.ParentSku !== prevStockItem.ParentSku) {
          // something is wrong here since it should be the same
          logger.error('ERROR: missing parent', newStockItem)
          return;
        }
        newProducts.push({
          ...DEFAULT_SHOPIFY_PRODUCT,
          Handle: curHandle,
          ...newProductInfo,
          'Option1 Name': newStockItem.Size ? 'Size' : newStockItem.Colour ? 'Colour': 'Title',
          'Option1 Value': newStockItem.Size || newStockItem.Colour || 'Default Title',
          'Option2 Name': newStockItem.Size && newStockItem.Colour ? 'Colour': undefined,
          'Option2 Value': newStockItem.Size ? newStockItem.Colour : undefined,
          'Variant SKU': SKU,
          'Variant Grams': Math.min(+newStockItem.Weight, 999),
          'Variant Inventory Tracker': 'shopify',
          'Variant Inventory Qty': newQuantity,
          'Variant Inventory Policy': 'deny',
          'Variant Fulfillment Service': 'manual',
          'Variant Price': Math.ceil(+newStockItem.TradePrice * 1.3 * (1+VAT) + 3) - 0.01,
          'Variant Compare At Price': newStockItem.RetailPrice,
          'Variant Requires Shipping': 'TRUE',
          'Variant Taxable': newStockItem.Taxable,
          'Variant Barcode': newStockItem.Ean,
          'Gift Card': 'FALSE',
          'Variant Weight Unit': 'g',
          'Included / United Kingdom': 'TRUE',
          'Status': 'active'
        });
      }
    } else {
      // update inventory
      const currentQuantity = +currentShopifyInventoryItem['On hand'];
      if (currentQuantity === newQuantity) {
        logger.log(`Found item in shopify ${JSON.stringify(currentShopifyInventoryItem)} stock matches what is in ${vendor}`);
      } else {
        if (updateInventory) {
          logger.warn(`Found item in shopify ${JSON.stringify(currentShopifyInventoryItem)} stock: ${currentQuantity}, updated to: ${newQuantity}`);
          currentShopifyInventoryItem['On hand'] = newQuantity;
          vendorUpdates.push(currentShopifyInventoryItem);
        } else {
          logger.warn(`Found item in shopify ${JSON.stringify(currentShopifyInventoryItem)} stock: ${currentQuantity}, should be: ${newQuantity}`);
        }
      }
    }
    // update product only for reydon products for now
    if (vendor !== 'reydon-products') {
      return;
    }
    const currentShopifyProduct = shopifyProductsCSV?.find(r => r['Variant SKU'] && r['Variant SKU'] === SKU);
    if (!currentShopifyProduct) {
      return;
    }
    const VAT = +newStockItem.VAT / 100;
    const newPrice = Math.ceil(+newStockItem.Your_Price * 1.4 * (1+VAT) + 3) - 0.01;
    if (currentShopifyProduct['Variant Price'].toString() !== newPrice.toString()) {
      logger.warn(`Updating ${vendor} ${SKU} price from`, currentShopifyProduct['Variant Price'], 'to',newPrice);
      currentShopifyProduct['Variant Price'] = newPrice;
    }
  });
  return { vendorUpdates, newProducts };
}

const getFiles = (inputID) => {
  const form = document.getElementById('myform');
  const input = form?.querySelector(`#${inputID}`);
  return input?.files || [];
}

// Updates existing items in inventory
// The full inventory is not downloaded, only updated rows
const updateInventory = async () => {
  const shopifyInventoryFiles = getFiles('shopify-inventory');
  if (!shopifyInventoryFiles.length) {
    logger.error('[ERROR] no shopify inventory CSV selected');
    return;
  }
  const shopifyInventoryCSV = await parseFileAsCSV({ files: shopifyInventoryFiles });
  const shopifyInventoryUpdates = [];
  for (const vendor of vendors) {
    if (!vendor.updateInventory) {
      logger.log(`[SKIP] inventory update not applicable to ${vendor.name}`);
      continue;
    }
    const vendorInventory = getFiles(vendor.name);
    let vendorInventoryCSV = await parseFileAsCSV({ files: vendorInventory }, vendor);
    if (!vendorInventoryCSV) {
      logger.log(`[SKIP] no inventory file selected for ${vendor.name}`);
      continue;
    }
    // TODO: move orderBy into parse
    if (vendor.orderBy) {
      vendorInventoryCSV = vendorInventoryCSV.sort((a, b) => {
        return a[vendor.orderBy].localeCompare(b[vendor.orderBy]);
      });
    }
    for (const vendorItem of vendorInventoryCSV) {
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
      const vendorItemQuantity = Math.min(vendor.getQuantity(vendorItem), STOCK_CAP);
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


const matchShopifyItems = (shopifyItemSKU, shopifyItemTitle, shopifyItemBarcode, vendor, vendorProduct) => {
  const vendorProductSKU = vendor.getSKU(vendorProduct);
  if (shopifyItemSKU !== vendorProductSKU) {
    return;
  }

  const shopifyItemLabel = `${shopifyItemSKU} (${shopifyItemTitle}/${shopifyItemBarcode})`;
  const vendorProductTitle = vendor.getTitle(vendorProduct);
  const vendorProductBarcode = vendor.getBarcode?.(vendorProduct) || 'does not apply';
  const vendorProductLabel = `${vendorProductSKU} (${vendorProductTitle}/${vendorProductBarcode})`;
  if (shopifyItemBarcode === vendorProductBarcode) {
    return shopifyItemLabel;
  } else {
    // barcode is different for same SKU - log an ERROR but this can be wrong so try title too
    logger.warn(`[WARN] ${vendor.name} ${vendorProductLabel} matches SKU but does not match shopify product barcode ${shopifyItemLabel}. ${vendor.useTitleForMatching ? 'Checking title instead...' : ''}`);
    if (vendor.useBarcodeForExclusiveMatching) {
      return;
    }
  }
  // Some vendors have shitty titles
  if (vendor.useTitleForMatching) {
    // compare titles to have some safety net
    const similarity = diceCoefficient.similarity(vendorProductTitle, shopifyItemTitle);
    if (similarity <= 0.4) {
      logger.error(`[ERROR] ${vendor.name} SKU ${vendorProductLabel} matches SKU but does not match shopify product title ${shopifyItemLabel}. (${similarity} similar)`);
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
    vendorProduct
  );
};

const matchProduct = (shopifyParent, shopifyProduct, vendor, vendorProduct) => {
  return matchShopifyItems(
    shopifyProduct['Variant SKU'],
    shopifyParent.primaryRow.Title,
    shopifyProduct['Variant Barcode'],
    vendor,
    vendorProduct
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
    logger.error('[ERROR] no shopify products CSV selected');
    return;
  }
  const shopifyProductsCSV = await parseFileAsCSV({ files: shopifyProductsFiles });
  const shopifyProducts = convertShopifyProductsToInternal(shopifyProductsCSV);

  for (const vendor of vendors) {
    if (!vendor.updateProducts) {
      logger.log(`[SKIP] product update not applicable to ${vendor.name}`);
      continue;
    }
    const vendorProductFiles = getFiles(vendor.name);
    let vendorProductCSV = await parseFileAsCSV({ files: vendorProductFiles }, vendor);
    if (!vendorProductCSV) {
      logger.log(`[SKIP] no product file selected for ${vendor.name}`);
      continue;
    }
    // TODO: move orderBy into parse
    if (vendor.orderBy) {
      vendorProductCSV = vendorProductCSV.sort((a, b) => {
        return a[vendor.orderBy].localeCompare(b[vendor.orderBy]);
      });
    }

    for (const vendorProduct of vendorProductCSV) {
      const vendorProductSKU = vendor.getSKU(vendorProduct);
      if (!vendorProductSKU) {
        logger.log(`[NOT FOUND] ${vendor.name} no SKU found for product`, vendorProduct);
        continue;
      }

      const vendorProductTitle = vendor.getTitle(vendorProduct);
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
        logger.error(`[ERROR] cannot update price for vendor ${vendor.name} getPrice not implemented`);
      } else {
        const vendorProductPrice = vendor.getPrice(vendorProduct).toString();
        const shopifyProductPrice = shopifyProduct['Variant Price'].toString();

        if (shopifyProductPrice === vendorProductPrice) {
          logger.log(`[PRICE MATCH] ${vendor.name} SKU ${vendorProductLabel} price ${vendorProductPrice} matches shopify product ${shopifyProductLabel}: ${shopifyProductPrice}`);
        } else {
          logger.warn(`[PRICE UPDATE] ${vendor.name} SKU ${vendorProductLabel} price ${vendorProductPrice} differs in shopify product ${shopifyProductLabel}: ${shopifyProductPrice}`);
          shopifyProduct['Variant Price'] = vendorProductPrice;
          shopifyParent.edited = true;
        }
      }

      // Update barcode
      if (!vendor.getBarcode) {
        logger.error(`[ERROR] cannot update barcode for vendor ${vendor.name} getBarcode not implemented`);
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


// products format

const convertShopifyProductsToInternal = (shopifyProductsCSV) => {
  shopifyProductsCSV = shopifyProductsCSV.sort((a, b) => {
    return a.Handle.localeCompare(b.Handle);
  });

  // reformat
  const shopifyProductsNewFormat = [];
  let currentProduct;
  let barcodeEscaped;
  for (const shopifyProduct of shopifyProductsCSV) {
    shopifyProduct['Variant Barcode'] = shopifyProduct['Variant Barcode'].replace(/^'/, '');
    shopifyProduct['Variant SKU'] = shopifyProduct['Variant SKU'].replace(/^'/, '');
    if (currentProduct?.primaryRow.Handle !== shopifyProduct.Handle) {
      currentProduct = {
        primaryRow: shopifyProduct,
        secondaryRows: [],
        edited: false,
        barcodeEscaped
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

const importShopify = async (event, type) => {
  event.preventDefault(); // Prevents the form from submitting and refreshing the page
  const form = document.getElementById('myform'); // Get the submitted form element
  const shopifyInventory = form.querySelector('#shopify-inventory'); // Get file inputs within the submitted form
  const shopifyCSV = await parseFileAsCSV(shopifyInventory);
  const shopifyProducts = form.querySelector('#shopify-products'); // Get file inputs within the submitted form
  const shopifyProductsCSV = await parseFileAsCSV(shopifyProducts);
  const allChangedItems = [];
  const allNewProducts = [];

  for (const vendor of vendors) {
    const htmlFormFile = form.querySelector(`#${vendor.name}`);
    const vendorCSV = await parseFileAsCSV(htmlFormFile, vendor);
    if (!vendorCSV) {
      continue;
    }
    const { vendorUpdates, newProducts } = getStockUpdates({
      vendor: vendor.name,
      vendorCSV,
      shopifyCSV,
      shopifyProductsCSV,
      ...vendor
    });
    allChangedItems.push(...vendorUpdates);
    allNewProducts.push(...newProducts);
  }
  
  const messageDiv = document.getElementById('message');
  if (type === 'inventory') {
    if (allChangedItems.length) {
      messageDiv.textContent = '';
      const csv = Papa.unparse(allChangedItems, {
        header: true,
        newline: '\n',
      });
      downloadCSV(csv, DOWNLOAD_INVENTORY_FILE_NAME);
    } else {
      messageDiv.textContent = 'Nothing changed';
      logger.log('Nothing changed!')
    }
    logger.log(allNewProducts.length, 'new items ready to add to store');
  } else if (type === 'newproducts') {
    if (allNewProducts.length) {
      const csv = Papa.unparse(allNewProducts, {
        header: true,
        newline: '\n',
      });
      downloadCSV(csv, DONWLOAD_PRODUCTS_FILE_NAME);
    } else {
      messageDiv.textContent = 'Nothing new';
    }
  } else if (type === 'editproducts') {
    const csv = Papa.unparse(shopifyProductsCSV, {
      header: true,
      newline: '\n'
    });
    downloadCSV(csv, DOWNLOAD_PRODUCTS_UPDATE_FILE_NAME);
  } else {
    messageDiv.textContent = 'error code 1 contact support';
  }
}

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <form id="myform" className="form" onSubmit={e => {e.preventDefault()}}>
          <h2>Shopify Inventory</h2>
          <label htmlFor="shopify-inventory">Shopify inventory CSV:</label>
          <input type="file" id="shopify-inventory" name="shopify-inventory" />
          <p/>
          <h2>Shopify Products</h2>
          <label htmlFor="shopify-products">Shopify products CSV:</label>
          <input type="file" id="shopify-products" name="shopify-products" />
          <p/>
          <h2>Vendor Inventory</h2>
          {vendors.map(vendor => (
            <div key={vendor.name}>
              <label htmlFor={vendor.name}>{vendor.importLabel}</label>
              <input type="file" id={vendor.name} name={vendor.name} />
              <p/>
            </div>
          ))}
          <button
            onClick={updateInventory}
            style={{backgroundColor: 'green', color: 'white', height: '50px', fontSize: '25px'}}
          >
            Download Inventory CSV (quantity)
          </button>
          <p/>
          <input onClick={(e) => importShopify(e, "newproducts")} type="submit" name="newProducts" value="Download Products CSV (new)" style={{backgroundColor: 'green', color: 'white', height: '50px', fontSize: '25px'}}/>
          <p/>
          <button
            onClick={updateProducts}
            style={{backgroundColor: 'green', color: 'white', height: '50px', fontSize: '25px'}}
          >
            Download Products CSV (edited price)
          </button>
          <div id="message" />
          <p/>
          <p/>
        </form>
      </header>
    </div>
  );
}

export default App;
