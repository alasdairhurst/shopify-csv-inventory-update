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

async function parseFileAsCSV(field) {
  const reader = new FileReader();
  // Read the file content synchronously
  reader.readAsText(field.files[0]);
  await new Promise(resolve => {
    reader.onload = resolve;
  });

  const fileContent = reader.result; // Get the file content
  return parseCSVString(fileContent);
}

const importShopify = async (event) => {
  event.preventDefault(); // Prevents the form from submitting and refreshing the page

  const form = event.target; // Get the submitted form element
  const shopify = form.querySelector('#shopify'); // Get file inputs within the submitted form
  const shopifyCSV = await parseFileAsCSV(shopify);
  const reydon = form.querySelector('#reydon')
  const reydonCSV = await parseFileAsCSV(reydon);

  const info = [];
  const warn = [];
  let changed = false;
  const changedItems = [];

  for (const newStockItem of reydonCSV) {
    const currentShopifyItem = shopifyCSV.find(r => r.SKU === newStockItem.Code);
    if (!currentShopifyItem) {
      warn.push(`no item found in shopify with reydon SKU ${newStockItem.Code}`)
      console.error(warn[warn.length-1]);
      continue;
    }
    const currentQuantity = currentShopifyItem['On hand'];
    const newQuantity = newStockItem.Quantity;
    if (currentQuantity === newQuantity) {
      info.push(`Found item in shopify ${JSON.stringify(currentShopifyItem)} stock matches what is in reydon`);
      console.log(info[info.length-1]);
    } else {
      info.push(`Found item in shopify ${JSON.stringify(currentShopifyItem)} stock: ${currentQuantity}, updated to: ${newQuantity}`);
      console.warn(info[info.length-1]);
      currentShopifyItem['On hand'] = Math.min(newQuantity, 99);
      changed = true;
      changedItems.push(currentShopifyItem);
    }
  }
  const csv = Papa.unparse(shopifyCSV, {
    header: true,
    newline: '\n',
  });

  const altCSV = Papa.unparse(changedItems, {
    header: true,
    newline: '\n',
  });


  const messageDiv = document.getElementById('message');
  if (changed) {
    messageDiv.textContent = '';
    console.log(altCSV);
    downloadCSV(altCSV, 'completed_inventory_update_for_shopify.csv');
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
          <input type="submit" />
          <div id="message" />
        </form>
      </header>
    </div>
  );
}

export default App;
