import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import * as assets from './assets.mjs';
import { COUNTRY_CATALOG_URL } from '@flag-connect/flag-domain';

const svg = (width, height) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="red"/></svg>`,
  );
const catalog = Array.from({ length: 10 }, (_, i) => ({
  code: `A${String.fromCharCode(65 + i)}`,
  name: { en: `Country ${i}`, ru: `Страна ${i}` },
  flag: i === 0 ? ['large.svg', 'small.svg'] : ['square.svg'],
}));
async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), 'flag-assets-'));
  const bannerPath = join(root, 'banner.svg');
  await writeFile(bannerPath, svg(1440, 512));
  const requests = [];
  const fetchSource = async (url) => {
    requests.push(String(url));
    if (String(url) === COUNTRY_CATALOG_URL) return new Response(JSON.stringify(catalog));
    const name = new URL(url).pathname.split('/').at(-1);
    return new Response(
      { 'large.svg': svg(900, 600), 'small.svg': svg(120, 80), 'square.svg': svg(80, 80) }[name],
      { headers: { 'content-type': 'image/svg+xml' } },
    );
  };
  try {
    await run({ outputDirectory: join(root, 'output'), bannerPath, fetchSource, requests });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('build converts every unique variant without stretching or enlarging and checks deterministic outputs', async () => {
  assert.equal(typeof assets.buildAssets, 'function', 'buildAssets must implement conversion');
  await fixture(async (options) => {
    const manifest = await assets.buildAssets(options);
    assert.equal(manifest.catalog.url, COUNTRY_CATALOG_URL);
    assert.ok(
      manifest.assets
        .filter((a) => a.path.startsWith('bot/'))
        .every((a) => a.source.startsWith(new URL('flags/', COUNTRY_CATALOG_URL).href)),
      'SVG sources must use the catalog release flags directory',
    );
    assert.equal(manifest.countryCount, 10);
    assert.deepEqual(
      manifest.assets.map((a) => a.path),
      ['bot/large.webp', 'bot/small.webp', 'bot/square.webp', 'brand/readme-banner.png'],
    );
    for (const [file, width, height] of [
      ['bot/large.webp', 440, 293],
      ['bot/small.webp', 120, 80],
      ['bot/square.webp', 80, 80],
      ['brand/readme-banner.png', 1440, 512],
    ]) {
      const image = sharp(join(options.outputDirectory, file));
      const metadata = await image.metadata();
      assert.equal(metadata.width, width);
      assert.equal(metadata.height, height);
      await image.raw().toBuffer();
    }
    assert.equal(options.requests.filter((url) => url.endsWith('square.svg')).length, 1);
    const before = await readFile(join(options.outputDirectory, 'manifest.json'), 'utf8');
    await assets.checkAssets(options);
    await assets.buildAssets(options);
    assert.equal(await readFile(join(options.outputDirectory, 'manifest.json'), 'utf8'), before);
  });
});

test('requests have bounded concurrency and deadlines including stalled response bodies', async () => {
  await fixture(async (options) => {
    let active = 0,
      maximum = 0;
    const fetchSource = async (...args) => {
      active++;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      const result = await options.fetchSource(...args);
      active--;
      return result;
    };
    await assets.buildAssets({ ...options, fetchSource, concurrency: 2 });
    assert.equal(maximum, 2, 'conversion should use the configured bounded worker pool');
    const hanging = async () => new Response(new ReadableStream({ start() {} }));
    await assert.rejects(
      assets.buildAssets({ ...options, fetchSource: hanging, timeoutMs: 20 }),
      /timed out/,
    );
    await assert.rejects(assets.buildAssets({ ...options, concurrency: 0 }), /concurrency/);
  });
});

test('missing, corrupt, non-SVG sources and invalid catalogs fail without publishing a partial tree', async () => {
  await fixture(async (options) => {
    await assets.buildAssets(options);
    const previous = await readFile(join(options.outputDirectory, 'manifest.json'), 'utf8');
    for (const response of [
      () => new Response('missing', { status: 404 }),
      () => new Response('<svg broken'),
      () => new Response('not an image'),
      () => new Response(svg(80, 80).toString().replace(/svg/g, 'html')),
    ]) {
      const fetchSource = (url) =>
        String(url) === COUNTRY_CATALOG_URL ? options.fetchSource(url) : response();
      await assert.rejects(
        assets.buildAssets({ ...options, fetchSource }),
        /HTTP 404|SVG|unsupported image|corrupt header/i,
      );
      assert.equal(
        await readFile(join(options.outputDirectory, 'manifest.json'), 'utf8'),
        previous,
      );
    }
    await assert.rejects(
      assets.buildAssets({ ...options, fetchSource: async () => new Response('[]') }),
      /at least 10/,
    );
    await writeFile(options.bannerPath, 'broken banner');
    await assert.rejects(assets.buildAssets(options));
    assert.equal(await readFile(join(options.outputDirectory, 'manifest.json'), 'utf8'), previous);
  });
});

test('concurrent malformed SVG sources repeatedly reject without corrupting native parser state', async () => {
  await fixture(async (options) => {
    const malformed =
      '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><broken></svg>';
    for (let i = 0; i < 40; i++) {
      await assert.rejects(
        assets.buildAssets({
          ...options,
          fetchSource: (url) =>
            String(url) === COUNTRY_CATALOG_URL
              ? options.fetchSource(url)
              : Promise.resolve(new Response(malformed)),
        }),
        /SVG|corrupt|XML/i,
      );
    }
    assert.deepEqual(await readdir(join(options.outputDirectory, '..')), ['banner.svg']);
  });
});

test('publication rename failure restores every previously published byte', async () => {
  await fixture(async (options) => {
    await assets.buildAssets(options);
    const snapshot = async (directory, prefix = '') => {
      const result = {};
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (entry.isDirectory())
          Object.assign(
            result,
            await snapshot(join(directory, entry.name), `${prefix}${entry.name}/`),
          );
        else result[`${prefix}${entry.name}`] = await readFile(join(directory, entry.name));
      }
      return result;
    };
    const before = await snapshot(options.outputDirectory);
    let injected = false;
    await assert.rejects(
      assets.buildAssets({
        ...options,
        rename: async (from, to) => {
          if (from.includes('.stage-') && to === options.outputDirectory && !injected) {
            injected = true;
            throw new Error('injected publication rename failure');
          }
          return rename(from, to);
        },
      }),
      /injected publication rename failure/,
    );
    assert.equal(injected, true);
    assert.deepEqual(await snapshot(options.outputDirectory), before);
    assert.deepEqual((await readdir(join(options.outputDirectory, '..'))).sort(), [
      'banner.svg',
      'output',
    ]);
  });
});

test('failed publication and rollback retain a recoverable backup', async () => {
  await fixture(async (options) => {
    await assets.buildAssets(options);
    const previous = await readFile(join(options.outputDirectory, 'manifest.json'));
    let backupPath;
    await assert.rejects(
      assets.buildAssets({
        ...options,
        rename: async (from, to) => {
          if (to === options.outputDirectory) throw new Error('injected rename failure');
          backupPath = from === options.outputDirectory ? to : backupPath;
          return rename(from, to);
        },
      }),
      (error) => error instanceof AggregateError && error.message.includes(backupPath),
    );
    assert.deepEqual(await readFile(join(backupPath, 'manifest.json')), previous);
    assert.equal(
      (await readdir(join(options.outputDirectory, '..'))).some((name) => name.includes('.stage-')),
      false,
    );
  });
});

test('check detects corrupt, missing, extra and tampered outputs without repairing them', async () => {
  await fixture(async (options) => {
    for (const mutate of [
      () => writeFile(join(options.outputDirectory, 'bot/large.webp'), 'corrupt'),
      () => rm(join(options.outputDirectory, 'bot/small.webp')),
      () => writeFile(join(options.outputDirectory, 'bot/extra.webp'), 'stale'),
      () => writeFile(join(options.outputDirectory, 'manifest.json'), '{}'),
    ]) {
      await assets.buildAssets(options);
      await mutate();
      await assert.rejects(assets.checkAssets(options), /Asset/);
    }
  });
});

// The public entry point must fail closed, not silently accept missing inputs.
test('asset CLI rejects an unknown command with an actionable error', () => {
  const result = spawnSync(process.execPath, ['apps/bot/scripts/assets.mjs', 'unknown'], {
    cwd: new URL('../../../', import.meta.url),
    encoding: 'utf8',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Usage:.*build.*check/);
});
