import { useMemo, useState } from 'react';
import Papa from 'papaparse';

const MAX_ROWS = 500;

const SAMPLE_CSV = `Handle,Title,Variant SKU,Variant Price,Variant Compare At Price,Variant Inventory Qty
blitz-helmet-red,Blitz Helmet Red,BH-RED-001,29.99,34.99,5
blitz-helmet-blue,Blitz Helmet Blue,BH-BLU-001,29.99,34.99,3
reydon-gloves-l,Reydon Gloves Large,RG-L-001,14.99,19.99,10
reydon-gloves-xl,Reydon Gloves XLarge,RG-XL-001,14.99,19.99,7
unicorn-dart-set,Unicorn Dart Set,UD-001,39.99,49.99,2`;

type Tab = 'table' | 'text';

interface Props {
  csv?: string;
}

export default function CSVPreview({ csv = SAMPLE_CSV }: Props) {
  const [tab, setTab] = useState<Tab>('table');

  const { headers, rows, total } = useMemo(() => {
    const result = Papa.parse<string[]>(csv, { header: false, skipEmptyLines: true });
    const [headerRow, ...dataRows] = result.data as string[][];
    return {
      headers: headerRow ?? [],
      rows: dataRows.slice(0, MAX_ROWS),
      total: dataRows.length,
    };
  }, [csv]);

  return (
    <div className="mt-4">
      <div className="flex gap-2 mb-3">
        {(['table', 'text'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 text-sm rounded-md border transition-colors ${tab === t ? 'border-cyan-400 text-cyan-400' : 'border-[#3a3f4b] text-gray-400 hover:text-white'}`}
          >
            {t === 'table' ? 'Table' : 'Text'}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-500 self-center">
          {total > MAX_ROWS ? `Showing ${MAX_ROWS} of ${total} rows` : `${total} rows`}
        </span>
      </div>

      {tab === 'table' ? (
        <div className="overflow-x-auto rounded-lg border border-[#3a3f4b] max-h-96">
          {total > MAX_ROWS && (
            <div className="text-xs text-gray-500 px-3 py-1.5 border-b border-[#3a3f4b] bg-[#1e2127]">
              Showing first {MAX_ROWS} of {total} rows
            </div>
          )}
          <table className="w-full text-xs text-left">
            <thead className="bg-[#1e2127] sticky top-0">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 text-gray-400 font-medium whitespace-nowrap border-b border-[#3a3f4b]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? 'bg-[#282c34]' : 'bg-[#1e2127]'}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-1.5 text-gray-300 whitespace-nowrap border-b border-[#3a3f4b]/50 max-w-xs truncate">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <textarea
          readOnly
          value={csv}
          className="w-full h-64 bg-[#1e2127] border border-[#3a3f4b] rounded-lg px-3 py-2 text-xs text-gray-300 font-mono resize-none focus:outline-none"
        />
      )}
    </div>
  );
}
