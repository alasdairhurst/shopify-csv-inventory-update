import Papa from 'papaparse';
import { ZipReader, BlobReader, BlobWriter } from '@zip.js/zip.js';
import he from 'he';
import './App.css';

const DONWLOAD_PRODUCTS_FILE_NAME = 'new_products_for_shopify.csv';
const DEFAULT_SHOPIFY_PRODUCT = {
  'Handle': '',
  'Title': '',
  'Body (HTML)': '',
  'Vendor': '',
  'Product Category': '',
  'Type': '',
  'Tags': '',
  'Published': '',
  'Option1 Name': '',
  'Option1 Value': '',
  'Option2 Name': '',
  'Option2 Value': '',
  'Option3 Name': '',
  'Option3 Value': '',
  'Variant SKU': '',
  'Variant Grams': '',
  'Variant Inventory Tracker': '',
  'Variant Inventory Policy': '',
  'Variant Fulfillment Service': '',
  'Variant Price': '',
  'Variant Compare At Price': '',
  'Variant Requires Shipping': '',
  'Variant Taxable': '',
  'Variant Barcode': '',
  'Image Src': '',
  'Image Position': '',
  'Image Alt Text': '',
  'Gift Card': '',
  'SEO Title': '',
  'SEO Description': '',
  'Google Shopping / Google Product Category': '',
  'Google Shopping / Gender': '',
  'Google Shopping / Age Group': '',
  'Google Shopping / MPN': '',
  'Google Shopping / Condition': '',
  'Google Shopping / Custom Product': '',
  'Google Shopping / Custom Label 0': '',
  'Google Shopping / Custom Label 1': '',
  'Google Shopping / Custom Label 2': '',
  'Google Shopping / Custom Label 3': '',
  'Google Shopping / Custom Label 4': '',
  'Google: Custom Product (product.metafields.mm-google-shopping.custom_product)': '',
  'Product rating count (product.metafields.reviews.rating_count)': '',
  'Color (product.metafields.shopify.color-pattern)': '',
  'Fabric (product.metafields.shopify.fabric)': '',
  'Neckline (product.metafields.shopify.neckline)': '',
  'Sleeve length type (product.metafields.shopify.sleeve-length-type)': '',
  'Target gender (product.metafields.shopify.target-gender)': '',
  'Top length type (product.metafields.shopify.top-length-type)': '',
  'Complementary products (product.metafields.shopify--discovery--product_recommendation.complementary_products)': '',
  'Related products (product.metafields.shopify--discovery--product_recommendation.related_products)': '',
  'Related products settings (product.metafields.shopify--discovery--product_recommendation.related_products_display)': '',
  'Search product boosts (product.metafields.shopify--discovery--product_search_boost.queries)': '',
  'Variant Image': '',
  'Variant Weight Unit': '',
  'Variant Tax Code': '',
  'Cost per item': '',
  'Status': ''
};

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
  importLabel: 'Shopify products CSV',
  name: 'shopify-products',
  expectedHeaders: Object.keys(DEFAULT_SHOPIFY_PRODUCT)
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

const getFiles = (inputID) => {
  const form = document.getElementById('myform');
  const input = form?.querySelector(`#${inputID}`);
  return input?.files || [];
}

const getVariantDetails = (item, index) => {
    return  {
        name: item[`Option${index} Name`],
        value: item[`Option${index} Value`],
        linkedTo: item[`Option${index} Linked To`]
    };
}

const swapVariants = async () => {
  const shopifyProductsFiles = getFiles('shopify-products');
  if (!shopifyProductsFiles.length) {
    throw new ExpectedError('no shopify products CSV selected');
  }
  const shopifyProductsCSV = await parseFilesAsCSV(shopifyProductsFiles, SHOPIFY_PRODUCTS_OPTIONS);

  const variants = {
    1: {},
    2: {},
    3: {}
  };

  const combos = {};
  const parentVariants = {};

  for (const item of shopifyProductsCSV) {
    const itemVariants = {};
    const combo = [];
    for (let i = 1; i <= 3; i++) {
        const data = itemVariants[i] = getVariantDetails(item, i);
        if (!data.name || data.name === 'Title') {
            continue;
        }
        if (data.name === 'Quantity') {
          console.log(item.Handle)
        }
        combo.push(data.name);
        const variant = variants[i];
        if (!variant[data.name]) {
            variant[data.name] = 0;
        }
        variant[data.name]++;
    }
    if (combo.length) {
      const tags = item.Tags.split(', ');
      const vendor = tags.find(tag => ['blitz', 'cartas', 'mtb', 'reydon', 'unicorn'].includes(tag));
      if (vendor) {
        combo.unshift(vendor);
      }
      combos[combo.join(',')] = combos[combo.join(',')] || 0;
      combos[combo.join(',')] ++;
      parentVariants[item.Handle] = itemVariants;
    }
  }
  
  console.log(variants);
  console.log(combos);
  console.log(parentVariants);

  const filtered = shopifyProductsCSV.filter(item => {
    const parentVariant = parentVariants[item.Handle];
    if (!parentVariant) return false;

    // If 1 and 2 are size and colour then swap them
    if (parentVariant[1].name === 'Size' && parentVariant[2].name === 'Colour') {
      const variant1 = getVariantDetails(item, 1);
      const variant2 = getVariantDetails(item, 2);

      item['Option1 Name'] = variant2.name;
      item['Option1 Value'] = variant2.value;
      item['Option1 Linked To'] = variant2.linkedTo;

      item['Option2 Name'] = variant1.name;
      item['Option2 Value'] = variant1.value;
      item['Option2 Linked To'] = variant1.linkedTo;
      return true;
    }
  });

  if (filtered.length === 0) {
    return;
  }


  // Download full CSV in order to preserve all other rows for each product
  logger.log('[DONE] Downloading products CSV');
  const csv = Papa.unparse(filtered, {
    header: true,
    newline: '\n',
    // trim additional temp metadata like parsed barcode
    columns: SHOPIFY_PRODUCTS_OPTIONS.expectedHeaders
  });
  downloadCSV(csv, DONWLOAD_PRODUCTS_FILE_NAME);
}


function App() {
  return (
    <div className="App">
      <header className="App-header">
        <form id="myform" className="form" onSubmit={e => {e.preventDefault()}}>
          <h2>Shopify Products</h2>
          <label htmlFor="shopify-products">{SHOPIFY_PRODUCTS_OPTIONS.importLabel} </label>
          <input type="file" multiple accept=".csv,.zip" id="shopify-products" name="shopify-products" />
          <p/>
          <button
            onClick={swapVariants}
            style={{backgroundColor: 'green', color: 'white', height: '50px', fontSize: '20px', width: '100%'}}
          >
            Swap Variants
          </button>
        </form>
      </header>
    </div>
  );
}

export default App;
