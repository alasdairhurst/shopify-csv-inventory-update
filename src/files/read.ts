import { readZip } from './zip.ts';

export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export async function readCSVFileList(files: File[]): Promise<string[]> {
  const csvs: string[] = [];
  for (let file of files) {
    if (file.name.endsWith('.zip')) {
      file = await readZip(file);
    }
    if (!file.name.endsWith('.csv')) {
      throw new Error(`Unknown file type: ${file.name}`);
    }
    csvs.push(await readFileAsText(file));
  }
  return csvs;
}

export async function fetchCSVFromURL(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }
  return response.text();
}
