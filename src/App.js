import { useState } from 'react';
import Papa from 'papaparse';
import './App.css';
import defaultVendorConfig from './vendors.json';

const STOCK_CAP = 99;
const DONWLOAD_FILE_NAME = 'completed_inventory_update_for_shopify.csv';

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
  const changedItems = [];
  for (const newStockItem of vendorCSV) {
    const currentShopifyItem = shopifyCSV.find(r => r.SKU && r.SKU === newStockItem[vendorSKUKey]);
    if (!currentShopifyItem) {
      console.error(`no item found in shopify with ${vendor} SKU ${newStockItem[vendorSKUKey]}`);
      continue;
    }
    const currentQuantity = +currentShopifyItem['On hand'];
    const newQuantity = Math.min(+newStockItem[vendorQuantityKey], STOCK_CAP);
    if (currentQuantity === newQuantity) {
      console.log(`Found item in shopify ${JSON.stringify(currentShopifyItem)} stock matches what is in ${vendor}`);
    } else {
      console.warn(`Found item in shopify ${JSON.stringify(currentShopifyItem)} stock: ${currentQuantity}, updated to: ${newQuantity}`);
      currentShopifyItem['On hand'] = newQuantity;
      changedItems.push(currentShopifyItem);
    }
  }
  return changedItems;
}

const importShopify = async (event, vendorConfig) => {
  event.preventDefault(); // Prevents the form from submitting and refreshing the page
  const form = event.target; // Get the submitted form element
  const shopify = form.querySelector('#shopify'); // Get file inputs within the submitted form
  const shopifyCSV = await parseFileAsCSV(shopify);
  const allChangedItems = [];

  for (const vendor of vendorConfig) {
    const htmlFormFile = form.querySelector(`#${vendor.name}`);
    const vendorCSV = await parseFileAsCSV(htmlFormFile, vendor);
    if (!vendorCSV) {
      continue;
    }
    const vendorUpdates = getStockUpdates({
      vendor: vendor.name,
      vendorCSV: vendorCSV,
      shopifyCSV,
      vendorSKUKey: vendor.vendorSKUKey,
      vendorQuantityKey: vendor.vendorQuantityKey
    });
    allChangedItems.push(...vendorUpdates);
  }
  
  const messageDiv = document.getElementById('message');
  if (allChangedItems.length) {
    messageDiv.textContent = '';
    const csv = Papa.unparse(allChangedItems, {
      header: true,
      newline: '\n',
    });
    downloadCSV(csv, DONWLOAD_FILE_NAME);
  } else {
    messageDiv.textContent = 'Nothing changed';
    console.log('Nothing changed!')
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
