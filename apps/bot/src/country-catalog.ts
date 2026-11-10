import { COUNTRY_CATALOG_URL, parseCountryCatalog, type Country } from '@flag-connect/flag-domain';

export { COUNTRY_CATALOG_URL } from '@flag-connect/flag-domain';

export async function loadCountryCatalog(
  fetchJson: typeof fetch = fetch,
  timeoutMs = 10_000,
): Promise<readonly Country[]> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const data = await Promise.race([
      (async () => {
        const response = await fetchJson(COUNTRY_CATALOG_URL, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Could not load country catalog: HTTP ${response.status}`);
        }
        return parseCountryCatalog(await response.json());
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Country catalog request timed out after ${timeoutMs}ms`));
          controller.abort();
        }, timeoutMs);
      }),
    ]);

    return data.map((entry) => ({
      ...entry,
      flag: entry.flag.map((filename) => `${filename.slice(0, -4)}.webp`),
    }));
  } finally {
    clearTimeout(timer);
  }
}
