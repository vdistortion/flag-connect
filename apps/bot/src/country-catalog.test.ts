import assert from 'node:assert/strict';
import test from 'node:test';
import { COUNTRY_CATALOG_URL, loadCountryCatalog } from './country-catalog.js';

test('converts CDN SVG filenames to local WebP filenames', async () => {
  const countries = await loadCountryCatalog(async (url) => {
    assert.equal(url, COUNTRY_CATALOG_URL);
    return new Response(
      JSON.stringify([
        { code: 'BR', name: { en: 'Brazil', ru: 'Бразилия' }, flag: ['br.svg'] },
        {
          code: 'PY',
          name: { en: 'Paraguay', ru: 'Парагвай' },
          flag: ['py.svg', 'py-reverse.svg'],
        },
      ]),
      { status: 200 },
    );
  });

  assert.deepEqual(
    countries.map(({ flag }) => flag),
    [['br.webp'], ['py.webp', 'py-reverse.webp']],
  );
});

test('rejects failed CDN responses', async () => {
  await assert.rejects(
    loadCountryCatalog(async () => new Response(null, { status: 503 })),
    /HTTP 503/,
  );
});
