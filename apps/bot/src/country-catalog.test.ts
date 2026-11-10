import assert from 'node:assert/strict';
import test from 'node:test';
import { COUNTRY_CATALOG_URL, loadCountryCatalog } from './country-catalog.js';

const catalog = [
  { code: 'BR', name: { en: 'Brazil', ru: 'Бразилия' }, flag: ['br.svg'] },
  { code: 'PY', name: { en: 'Paraguay', ru: 'Парагвай' }, flag: ['py.svg', 'py-reverse.svg'] },
  ...Array.from({ length: 8 }, (_, index) => ({
    code: `A${String.fromCharCode(65 + index)}`,
    name: { en: `Country ${index}`, ru: `Страна ${index}` },
    flag: [`flag-${index}.svg`],
  })),
];

test('converts CDN SVG filenames to local WebP filenames', async () => {
  const countries = await loadCountryCatalog(async (url) => {
    assert.equal(url, COUNTRY_CATALOG_URL);
    return new Response(JSON.stringify(catalog), { status: 200 });
  });

  assert.deepEqual(
    countries.slice(0, 2).map(({ flag }) => flag),
    [['br.webp'], ['py.webp', 'py-reverse.webp']],
  );
});

test('rejects malformed CDN country data before converting filenames', async () => {
  const invalid = [{ ...catalog[0], flag: ['../br.svg'] }, ...catalog.slice(1)];
  await assert.rejects(
    loadCountryCatalog(async () => Response.json(invalid)),
    /flag/i,
  );
});

test('rejects a too-small catalog and invalid JSON', async () => {
  await assert.rejects(
    loadCountryCatalog(async () => Response.json(catalog.slice(0, 9))),
    /10/,
  );
  await assert.rejects(
    loadCountryCatalog(async () => new Response('{')),
    SyntaxError,
  );
});

test('rejects failed CDN responses', async () => {
  await assert.rejects(
    loadCountryCatalog(async () => new Response(null, { status: 503 })),
    /HTTP 503/,
  );
});

test('times out and aborts a stalled CDN request', async () => {
  let signal: AbortSignal | null | undefined;
  const fetchJson: typeof fetch = async (_url, init) => {
    signal = init?.signal;
    return new Promise<Response>(() => {});
  };
  await assert.rejects(loadCountryCatalog(fetchJson, 20), /timed out/i);
  assert.equal(signal?.aborted, true);
});

test('times out while waiting for the response body', async () => {
  let signal: AbortSignal | null | undefined;
  const fetchJson: typeof fetch = async (_url, init) => {
    signal = init?.signal;
    return new Response(new ReadableStream({ start() {} }));
  };
  await assert.rejects(loadCountryCatalog(fetchJson, 20), /timed out/i);
  assert.equal(signal?.aborted, true);
});
