import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { COUNTRY_CATALOG_URL, parseCountryCatalog } from '@flag-connect/flag-domain';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
// Malformed SVG parsing in the native stack can corrupt memory when concurrent.
// Share the gate across builds/checks; fetching remains bounded and concurrent.
let svgConversion = Promise.resolve();
async function convertSvg(bytes, width, format) {
  const previous = svgConversion;
  let release;
  svgConversion = new Promise((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    const input = sharp(bytes);
    const metadata = await input.metadata();
    if (metadata.format !== 'svg' || !metadata.width || !metadata.height) {
      throw new Error('expected a readable SVG with dimensions');
    }
    const output = await input
      .resize({ width, withoutEnlargement: true })
      [format](format === 'webp' ? { lossless: true, effort: 6 } : { compressionLevel: 9 })
      .toBuffer();
    return { metadata, output };
  } finally {
    release();
  }
}

const defaults = {
  rename,
  outputDirectory: join(root, 'dist/bot-assets'),
  bannerPath: join(root, 'assets/brand/readme-banner.svg'),
  fetchSource: fetch,
  concurrency: 4,
  timeoutMs: 30_000,
};

async function request(url, options) {
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      (async () => {
        const response = await options.fetchSource(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
        return Buffer.from(await response.arrayBuffer());
      })(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${url}: request timed out after ${options.timeoutMs}ms`));
          controller.abort();
        }, options.timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function configure(configuration) {
  const options = { ...defaults, ...configuration };
  if (
    !Number.isInteger(options.concurrency) ||
    options.concurrency < 1 ||
    options.concurrency > 16
  ) {
    throw new Error('concurrency must be an integer between 1 and 16');
  }
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1)
    throw new Error('timeoutMs must be positive');
  return options;
}

async function generate(directory, options) {
  const catalogBytes = await request(COUNTRY_CATALOG_URL, options);
  const countries = parseCountryCatalog(JSON.parse(catalogBytes.toString('utf8')));
  const filenames = [...new Set(countries.flatMap((country) => country.flag))].sort();
  await mkdir(join(directory, 'bot'), { recursive: true });
  await mkdir(join(directory, 'brand'), { recursive: true });
  const records = [];
  async function convert(bytes, path, source, width, format) {
    const { metadata, output } = await convertSvg(bytes, width, format);
    const decoded = sharp(output);
    const info = await decoded.metadata();
    await decoded.raw().toBuffer();
    if (!info.width || !info.height || info.width > width)
      throw new Error(`Invalid dimensions: ${path}`);
    await writeFile(join(directory, path), output);
    records.push({
      path,
      source,
      sourceSha256: sha256(bytes),
      sourceWidth: metadata.width,
      sourceHeight: metadata.height,
      width: info.width,
      height: info.height,
      sha256: sha256(output),
    });
  }
  let next = 0;
  let failure;
  await Promise.all(
    Array.from({ length: Math.min(options.concurrency, filenames.length) }, async () => {
      while (!failure && next < filenames.length) {
        const filename = filenames[next++];
        const url = new URL(`flags/${filename}`, COUNTRY_CATALOG_URL).href;
        try {
          await convert(
            await request(url, options),
            `bot/${filename.slice(0, -4)}.webp`,
            url,
            440,
            'webp',
          );
        } catch (error) {
          failure ??= new Error(`${url}: ${error.message}`, { cause: error });
        }
      }
    }),
  );
  if (failure) throw failure;
  await convert(
    await readFile(options.bannerPath),
    'brand/readme-banner.png',
    'assets/brand/readme-banner.svg',
    1440,
    'png',
  );
  const manifest = {
    schemaVersion: 1,
    catalog: { url: COUNTRY_CATALOG_URL, sha256: sha256(catalogBytes) },
    countryCount: countries.length,
    encoder: { sharp: sharp.versions.sharp, vips: sharp.versions.vips },
    assets: records.sort((a, b) => a.path.localeCompare(b.path, 'en')),
  };
  await writeFile(join(directory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export async function buildAssets(configuration = {}) {
  const options = configure(configuration);
  const destination = resolve(options.outputDirectory);
  await mkdir(dirname(destination), { recursive: true });
  const stage = await mkdtemp(`${destination}.stage-`);
  try {
    const manifest = await generate(stage, options);
    const backup = await mkdtemp(`${destination}.backup-`);
    const previous = join(backup, 'previous');
    let backedUp = false;
    let preserveBackup = false;
    try {
      try {
        await options.rename(destination, previous);
        backedUp = true;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      try {
        await options.rename(stage, destination);
      } catch (error) {
        if (backedUp) {
          try {
            await options.rename(previous, destination);
          } catch (rollbackError) {
            preserveBackup = true;
            throw new AggregateError(
              [error, rollbackError],
              `Publication and rollback failed; previous assets retained at ${previous}`,
            );
          }
        }
        throw error;
      }
    } finally {
      if (!preserveBackup) await rm(backup, { recursive: true, force: true });
    }
    return manifest;
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

async function files(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${prefix}${entry.name}`;
    if (entry.isDirectory()) result.push(...(await files(join(directory, entry.name), `${path}/`)));
    else {
      assert.ok(entry.isFile(), `Unexpected asset type: ${path}`);
      result.push(path);
    }
  }
  return result.sort();
}

// Independently reconvert the pinned sources: verify completeness, provenance,
// dimensions, decoding and exact checksums rather than trusting the manifest.
export async function checkAssets(configuration = {}) {
  const options = configure(configuration);
  const stage = await mkdtemp(`${resolve(options.outputDirectory)}.check-`);
  try {
    const manifest = await generate(stage, options);
    assert.deepEqual(
      await files(options.outputDirectory),
      await files(stage),
      'Asset tree is incomplete or contains stale files',
    );
    for (const path of await files(stage)) {
      assert.deepEqual(
        await readFile(join(options.outputDirectory, path)),
        await readFile(join(stage, path)),
        `Asset mismatch: ${path}`,
      );
    }
    return manifest;
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

export async function main(command) {
  if (!['build', 'check'].includes(command)) throw new Error('Usage: assets.mjs build|check');
  const manifest = await (command === 'build' ? buildAssets() : checkAssets());
  console.log(
    `Bot assets ${command}: ${manifest.countryCount} countries, ${manifest.assets.length - 1} flags, 1 banner; ${defaults.outputDirectory}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv[2]).catch((error) => {
    console.error(`Bot assets: ${error.message}`);
    process.exitCode = 1;
  });
}
