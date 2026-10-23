import type { Country } from '@flag-connect/flag-domain';

export const COUNTRY_CATALOG_URL =
  'https://cdn.jsdelivr.net/gh/vdistortion/country-flags@0.1.0/countries.json';

export async function loadCountryCatalog(
  fetchJson: typeof fetch = fetch,
): Promise<readonly Country[]> {
  const response = await fetchJson(COUNTRY_CATALOG_URL);
  if (!response.ok) {
    throw new Error(`Could not load country catalog: HTTP ${response.status}`);
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Country catalog must be a non-empty array');
  }

  return data.map((entry: Country) => ({
    ...entry,
    flag: entry.flag.map((filename) => {
      if (!filename.endsWith('.svg')) {
        throw new Error(`Unexpected flag filename in country catalog: ${filename}`);
      }
      return `${filename.slice(0, -4)}.webp`;
    }),
  }));
}
