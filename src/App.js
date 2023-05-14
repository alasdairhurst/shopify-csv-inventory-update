import logo from './logo.svg';
import './App.css';
import Papa from 'papaparse';

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

const importNembol = async (event) => {
  event.preventDefault(); // Prevents the form from submitting and refreshing the page

  const form = event.target; // Get the submitted form element
  const nembol = form.querySelector('#nembol'); // Get file inputs within the submitted form
  const nembolCSV = await parseFileAsCSV(nembol);
  const reydon = form.querySelector('#reydon')
  const reydonCSV = await parseFileAsCSV(reydon);

  const info = [];
  const warn = [];
  let changed = false;

  for (const newStockItem of reydonCSV) {
    const currentNembolItem = nembolCSV.find(r => r.sku === newStockItem.Code);
    if (!currentNembolItem) {
      warn.push(`no item found in nembol with reydon SKU ${newStockItem.Code}`)
      console.error(warn[warn.length-1]);
      continue;
    }
    const currentQuantity = currentNembolItem.quantity;
    const newQuantity = newStockItem.Quantity;
    if (currentQuantity === newQuantity) {
      info.push(`Found item in nembol ${JSON.stringify(currentNembolItem)} stock matches what is in reydon`);
      console.log(info[info.length-1]);
    } else {
      info.push(`Found item in nembol ${JSON.stringify(currentNembolItem)} stock: ${currentQuantity}, updated to: ${newQuantity}`);
      console.warn(info[info.length-1]);
      currentNembolItem.quantity = newQuantity;
      changed = true;
    }
  }
  console.log(nembolCSV);
  const csv = Papa.unparse(nembolCSV, { header: true });
  const messageDiv = document.getElementById('message');
  if (changed) {
    messageDiv.textContent = '';
    downloadCSV(csv, 'updated_export.csv');
  } else {
    messageDiv.textContent = 'Nothing changed';
    console.log('Nothing changed!')
  }
}

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <form className="form" onSubmit={importNembol}>
          <label htmlFor="nembol">Nembol export CSV:</label>
          <input type="file" id="nembol" name="nembol" />
          <p/>
          <label htmlFor="nembol">Reydon email CSV:</label>
          <input type="file" id="reydon" name="stock" />
          <p/>
          <input type="submit" />
          <div id="message" />
        </form>
      </header>
    </div>
  );
}

export default App;
