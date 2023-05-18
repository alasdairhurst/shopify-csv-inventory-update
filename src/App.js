import Papa from 'papaparse';
import './App.css';

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
  return parseCSVString(headerRow + fileContent, props);
}

const STOCK_CAP = 99;

function getStockUpdates ({vendor, vendorCSV, shopifyCSV, vendorSKUKey, vendorQuantityKey}) {
  if (!vendorCSV) {
    return [];
  }
  const changedItems = [];
  for (const newStockItem of vendorCSV) {
    const currentShopifyItem = shopifyCSV.find(r => r.SKU === newStockItem[vendorSKUKey]);
    if (!currentShopifyItem) {
      console.error(`no item found in shopify with ${vendor} SKU ${newStockItem[vendorSKUKey]}`);
      continue;
    }
    const currentQuantity = currentShopifyItem['On hand'];
    const newQuantity = Math.min(newStockItem[vendorQuantityKey], STOCK_CAP);
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

const importShopify = async (event) => {
  event.preventDefault(); // Prevents the form from submitting and refreshing the page

  const form = event.target; // Get the submitted form element
  const shopify = form.querySelector('#shopify'); // Get file inputs within the submitted form
  const shopifyCSV = await parseFileAsCSV(shopify);
  const reydon = form.querySelector('#reydon')
  const reydonCSV = await parseFileAsCSV(reydon);
  const cartas = form.querySelector('#cartas')
  const cartasCSV = await parseFileAsCSV(cartas, { headers: ['location', 'a', 'b', 'c', 'Code', 'variant', 'available', 'pending', 'Quantity', 'e'] });

  const raydonUpdates = getStockUpdates({
    vendor: 'raydon',
    vendorCSV: reydonCSV,
    shopifyCSV,
    vendorSKUKey: 'Code',
    vendorQuantityKey: 'Quantity',
  });

  const cartasUpdates = getStockUpdates({
    vendor: 'cartas',
    vendorCSV: cartasCSV,
    shopifyCSV,
    vendorSKUKey: 'Code',
    vendorQuantityKey: 'Quantity'
  });

  
  const changedItems = [...raydonUpdates, ...cartasUpdates];
  const messageDiv = document.getElementById('message');
  if (changedItems.length) {
    messageDiv.textContent = '';
    const csv = Papa.unparse(changedItems, {
      header: true,
      newline: '\n',
    });
    downloadCSV(csv, 'completed_inventory_update_for_shopify.csv');
  } else {
    messageDiv.textContent = 'Nothing changed';
    console.log('Nothing changed!')
  }
}

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <form className="form" onSubmit={importShopify}>
          <label htmlFor="shopify">Shopify inventory export CSV:</label>
          <input type="file" id="shopify" name="shopify" />
          <p/>
          <label htmlFor="reydon">Reydon email CSV:</label>
          <input type="file" id="reydon" name="reydon" />
          <p/>
          <label htmlFor="cartas">Cartas CSV:</label>
          <input type="file" id="cartas" name="cartas" />
          <p/>
          <input type="submit" />
          <div id="message" />
        </form>
      </header>
    </div>
  );
}

export default App;
