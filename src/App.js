import { useState } from 'react';
import Papa from 'papaparse';
import he from 'he';
import './App.css';
import defaultVendorConfig from './vendors.json';

const STOCK_CAP = 50;
const DONWLOAD_INVENTORY_FILE_NAME = 'completed_inventory_update_for_shopify.csv';
const DOWNLOAD_PRODUCTS_UPDATE_FILE_NAME = 'completed_products_update_for_shopify.csv';
const DONWLOAD_PRODUCTS_FILE_NAME = 'new_products_for_shopify.csv';
const DEFAULT_SHOPIFY_PRODUCT = {
  'Handle': '', 'Title': '', 'Body (HTML)': '', 'Vendor': '', 'Product Category': '', 'Type': '', 'Tags': '', 'Published': '', 'Option1 Name': '', 'Option1 Value': '', 'Option2 Name': '', 'Option2 Value': '', 'Option3 Name': '', 'Option3 Value': '', 'Variant SKU': '', 'Variant Grams': '', 'Variant Inventory Tracker': '', 'Variant Inventory Qty': '', 'Variant Inventory Policy': '', 'Variant Fulfillment Service': '', 'Variant Price': '', 'Variant Compare At Price': '', 'Variant Requires Shipping': '', 'Variant Taxable': '', 'Variant Barcode': '', 'Image Src': '', 'Image Position': '', 'Image Alt Text': '', 'Gift Card': '', 'SEO Title': '', 'SEO Description': '', 'Google Shopping / Google Product Category': '', 'Google Shopping / Gender': '', 'Google Shopping / Age Group': '', 'Google Shopping / MPN': '', 'Google Shopping / AdWords Grouping': '', 'Google Shopping / AdWords Labels': '', 'Google Shopping / Condition': '', 'Google Shopping / Custom Product': '', 'Google Shopping / Custom Label 0': '', 'Google Shopping / Custom Label 1': '', 'Google Shopping / Custom Label 2': '', 'Google Shopping / Custom Label 3': '', 'Google Shopping / Custom Label 4': '', 'Variant Image': '', 'Variant Weight Unit': '', 'Variant Tax Code': '', 'Cost per item': '', 'Included / United Kingdom': '', 'Status': ''
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
        continue
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
    console.log(newCSV);
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
      console.error(`no item found in shopify with ${vendor} SKU ${SKU}`);
      if (addMissing) {
        console.warn(`creating new item for SKU ${SKU} from ${vendor} product listing`, newStockItem)
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
          console.log(newProductInfo);
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
          console.error('ERROR: missing parent', newStockItem)
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
        console.log(`Found item in shopify ${JSON.stringify(currentShopifyInventoryItem)} stock matches what is in ${vendor}`);
      } else {
        if (updateInventory) {
          console.warn(`Found item in shopify ${JSON.stringify(currentShopifyInventoryItem)} stock: ${currentQuantity}, updated to: ${newQuantity}`);
          currentShopifyInventoryItem['On hand'] = newQuantity;
          vendorUpdates.push(currentShopifyInventoryItem);
        } else {
          console.warn(`Found item in shopify ${JSON.stringify(currentShopifyInventoryItem)} stock: ${currentQuantity}, should be: ${newQuantity}`);
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
      console.warn(`Updating ${vendor} ${SKU} price from`, currentShopifyProduct['Variant Price'], 'to',newPrice);
      currentShopifyProduct['Variant Price'] = newPrice;
    }
  });
  return { vendorUpdates, newProducts };
}

const importShopify = async (event, vendorConfig, type) => {
  event.preventDefault(); // Prevents the form from submitting and refreshing the page
  const form = document.getElementById('myform'); // Get the submitted form element
  const shopify = form.querySelector('#shopify'); // Get file inputs within the submitted form
  const shopifyCSV = await parseFileAsCSV(shopify);
  const shopifyProducts = form.querySelector('#shopify-products'); // Get file inputs within the submitted form
  const shopifyProductsCSV = await parseFileAsCSV(shopifyProducts);
  const allChangedItems = [];
  const allNewProducts = [];

  for (const vendor of vendorConfig) {
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
      downloadCSV(csv, DONWLOAD_INVENTORY_FILE_NAME);
    } else {
      messageDiv.textContent = 'Nothing changed';
      console.log('Nothing changed!')
    }
    console.log(allNewProducts.length, 'new items ready to add to store');
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

  const [ vendorConfig, setVendorConfig ] = useState(defaultVendorConfig);
  const [ vendorConfigText, setVendorConfigText ] = useState(JSON.stringify(vendorConfig, null, 2));
  const [ showConfigEditor, setShowConfigEditor ] = useState(false);

  return (
    <div className="App">
      <header className="App-header">
        <form id="myform" className="form" onSubmit={() => {}}>
          <h2>Shopify Inventory</h2>
          <label htmlFor="shopify">Shopify inventory CSV:</label>
          <input type="file" id="shopify" name="shopify" />
          <p/>
          <h2>Shopify Products</h2>
          <label htmlFor="shopify-products">Shopify products CSV:</label>
          <input type="file" id="shopify-products" name="shopify-products" />
          <p/>
          <h2>Vendor Inventory</h2>
          {vendorConfig.map(vendor => (
            <div key={vendor.name}>
              <label htmlFor={vendor.name}>{vendor.importLabel}</label>
              <input type="file" id={vendor.name} name={vendor.name} />
              <p/>
            </div>
          ))}
          <input onClick={(e) => importShopify(e, vendorConfig, "inventory")} type="submit" value="Download Inventory CSV (quantity)" style={{backgroundColor: 'green', color: 'white', height: '50px', fontSize: '25px'}}/>
          <p/>
          <input onClick={(e) => importShopify(e, vendorConfig, "newproducts")} type="submit" name="newProducts" value="Download Products CSV (new)" style={{backgroundColor: 'green', color: 'white', height: '50px', fontSize: '25px'}}/>
          <p/>
          <input onClick={(e) => importShopify(e, vendorConfig, "editproducts")} type="submit" value="Download Products CSV (edited price)" style={{backgroundColor: 'green', color: 'white', height: '50px', fontSize: '25px'}}/>
          <div id="message" />
          <p/>
          <p/>
        </form>
        <button style={{color: 'grey', backgroundColor: 'yellow'}} onClick={() => setShowConfigEditor(!showConfigEditor)}>
          Edit vendor config
        </button>
        {showConfigEditor && (
          <textarea
            value={vendorConfigText}
            cols={75}
            rows={vendorConfigText.split('\n').length + 1}
            onChange={e => {
              e.preventDefault();
              const text = e.target.value;
              setVendorConfigText(text);
              try {
                let newConfig = JSON.parse(text);
                setVendorConfig(newConfig);
              } catch (e) {
                // ignore
              }
            }}
          />
        )}
      </header>
    </div>
  );
}

export default App;
