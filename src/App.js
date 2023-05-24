import { useState } from 'react';
import Papa from 'papaparse';
import './App.css';
import defaultVendorConfig from './vendors.json';

const STOCK_CAP = 99;
const DONWLOAD_INVENTORY_FILE_NAME = 'completed_inventory_update_for_shopify.csv';
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

  const fileContent = reader.result; // Get the file content
  let headerRow = '';
  if (props?.headers) {
    headerRow = props.headers.join(',') + '\n';
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
  }

  return csv;
}

function getStockUpdates ({vendor, vendorCSV, shopifyCSV, vendorSKUKey, vendorQuantityKey}) {
  if (!vendorCSV || !shopifyCSV) {
    return [];
  }
  const vendorUpdates = [];
  const newProducts = [];
  for (const newStockItem of vendorCSV) {
    const currentShopifyItem = shopifyCSV.find(r => r.SKU && r.SKU === newStockItem[vendorSKUKey]);
    const newQuantity = Math.min(+newStockItem[vendorQuantityKey], STOCK_CAP);
    if (!currentShopifyItem) {
      console.error(`no item found in shopify with ${vendor} SKU ${newStockItem[vendorSKUKey]}`);
      if (vendor === 'muaythai') {
        const prevProduct = newProducts[newProducts.length - 1];
        const Handle = newStockItem.Name.toLowerCase().replace(/\s/g, '-');
        let newProductInfo = {};
        if (Handle !== prevProduct?.Handle) {
          newProductInfo = {
            Title: newStockItem.Name,
            'Body (HTML)': newStockItem.Description,
            Vendor: newStockItem.Manufacturer,
            'Product Category': 'Sporting Goods',
            Type: 'Sporting Goods',
            Published: 'TRUE',
          };
        }
        newProducts.push({
          ...DEFAULT_SHOPIFY_PRODUCT,
          Handle,
          ...newProductInfo,
          'Option1 Value': newStockItem['Option value'],
          'Variant SKU': newStockItem.SKU,
          'Variant Grams': +newStockItem.Weight * 1000,
          'Variant Inventory Tracker': 'shopify',
          'Variant Inventory Qty': newQuantity,
          'Variant Inventory Policy': 'deny',
          'Variant Fulfillment Service': 'manual',
          'Variant Price': newStockItem.Price,
          'Variant Compare At Price': newStockItem.Price,
          'Variant Requires Shipping': 'TRUE',
          'Variant Taxable': 'TRUE',
          'Variant Barcode': newStockItem.SKU,
          'Gift Card': 'FALSE',
          'Variant Weight Unit': 'g',
          'Included / United Kingdom': 'TRUE',
          'Status': 'active'
        });
      }
      continue;
    }
    const currentQuantity = +currentShopifyItem['On hand'];
    if (currentQuantity === newQuantity) {
      console.log(`Found item in shopify ${JSON.stringify(currentShopifyItem)} stock matches what is in ${vendor}`);
    } else {
      console.warn(`Found item in shopify ${JSON.stringify(currentShopifyItem)} stock: ${currentQuantity}, updated to: ${newQuantity}`);
      currentShopifyItem['On hand'] = newQuantity;
      vendorUpdates.push(currentShopifyItem);
    }
  }
  return { vendorUpdates, newProducts };
}

const importShopify = async (event, vendorConfig) => {
  event.preventDefault(); // Prevents the form from submitting and refreshing the page
  const form = event.target; // Get the submitted form element
  const shopify = form.querySelector('#shopify'); // Get file inputs within the submitted form
  const shopifyCSV = await parseFileAsCSV(shopify);
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
      vendorCSV: vendorCSV,
      shopifyCSV,
      vendorSKUKey: vendor.vendorSKUKey,
      vendorQuantityKey: vendor.vendorQuantityKey
    });
    allChangedItems.push(...vendorUpdates);
    allNewProducts.push(...newProducts);
  }
  
  const messageDiv = document.getElementById('message');
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
  if (allNewProducts.length) {
    const csv = Papa.unparse(allNewProducts, {
      header: true,
      newline: '\n',
    });
    downloadCSV(csv, DONWLOAD_PRODUCTS_FILE_NAME);
  }
}

function App() {

  const [ vendorConfig, setVendorConfig ] = useState(defaultVendorConfig);
  const [ vendorConfigText, setVendorConfigText ] = useState(JSON.stringify(vendorConfig, null, 2));
  const [ showConfigEditor, setShowConfigEditor ] = useState(false);

  return (
    <div className="App">
      <header className="App-header">
        <form className="form" onSubmit={e => {
          importShopify(e, vendorConfig);
        }}>
          <h2>Shopify Inventory</h2>
          <label htmlFor="shopify">Shopify inventory CSV:</label>
          <input type="file" id="shopify" name="shopify" />
          <p/>
          <h2>Vendor Inventory</h2>
          {vendorConfig.map(vendor => (
            <div key={vendor.name}>
              <label htmlFor={vendor.name}>{vendor.importLabel}</label>
              <input type="file" id={vendor.name} name={vendor.name} />
              <p/>
            </div>
          ))}
          <input type="submit" value="Download updated CSV" style={{backgroundColor: 'green', color: 'white', height: '50px', fontSize: '25px'}}/>
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
