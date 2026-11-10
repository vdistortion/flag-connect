import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { createNumberedFlagImage } from './country-flag-composite.js';

test('a cache hit preserves the v3 filename and image without resizing', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'flag-connect-composite-hit-'));
  const sources = join(root, 'sources');
  const generated = join(root, 'generated');
  await mkdir(sources);

  try {
    const sourcePath = join(sources, 'nl.webp');
    await sharp({ create: { width: 80, height: 40, channels: 3, background: '#d52b1e' } })
      .webp({ lossless: true })
      .toFile(sourcePath);
    const flag = { code: 'NL', filename: 'nl.webp', number: 1 };
    const source = await sharp(sourcePath).rotate().toBuffer();
    const sourceHash = createHash('sha256').update(source).digest('hex');
    const expectedName = `${createHash('sha256')
      .update('numbered-country-flags-v3\n')
      .update(`NL:1:nl.webp:${sourceHash}`)
      .digest('hex')}.webp`;

    const first = await createNumberedFlagImage([flag], sources, generated);
    const original = await readFile(join(generated, first));
    const resize = t.mock.method(sharp.prototype, 'resize');
    const cached = await createNumberedFlagImage([flag], sources, generated);

    assert.equal(cached, expectedName);
    assert.deepEqual(await readFile(join(generated, cached)), original);
    assert.equal(resize.mock.callCount(), 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('changing the source image invalidates the cache', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'flag-connect-composite-invalidation-'));
  const sources = join(root, 'sources');
  const generated = join(root, 'generated');
  await mkdir(sources);
  try {
    const sourcePath = join(sources, 'flag.webp');
    const makeSource = async (background: string) =>
      sharp({ create: { width: 40, height: 20, channels: 3, background } })
        .webp({ lossless: true })
        .toFile(sourcePath);
    const flags = [{ code: 'NL', filename: 'flag.webp', number: 1 }];
    await makeSource('#d52b1e');
    const first = await createNumberedFlagImage(flags, sources, generated);
    await makeSource('#0038a8');
    const resize = t.mock.method(sharp.prototype, 'resize');
    const second = await createNumberedFlagImage(flags, sources, generated);
    assert.notEqual(second, first);
    assert.equal(resize.mock.callCount(), 1);
    assert.notDeepEqual(
      await readFile(join(generated, first)),
      await readFile(join(generated, second)),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('parallel misses publish a valid shared image without leftover temporary files', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'flag-connect-composite-parallel-'));
  const sources = join(root, 'sources');
  const generated = join(root, 'generated');
  await mkdir(sources);
  try {
    await sharp({ create: { width: 40, height: 20, channels: 3, background: '#0038a8' } })
      .webp({ lossless: true })
      .toFile(join(sources, 'np.webp'));
    const flags = [{ code: 'NP', filename: 'np.webp', number: 2 }];
    const names = await Promise.all(
      Array.from({ length: 8 }, () => createNumberedFlagImage(flags, sources, generated)),
    );
    assert.equal(new Set(names).size, 1);
    assert.deepEqual(await readdir(generated), [names[0]]);
    const metadata = await sharp(join(generated, names[0])).metadata();
    assert.equal(metadata.format, 'webp');
    assert.equal(metadata.width, 896);
    assert.equal(metadata.height, 349);
    const resize = t.mock.method(sharp.prototype, 'resize');
    assert.equal(await createNumberedFlagImage(flags, sources, generated), names[0]);
    assert.equal(resize.mock.callCount(), 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('cleanup removes expired cached images before regenerating them', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'flag-connect-composite-cleanup-'));
  const sources = join(root, 'sources');
  const generated = join(root, 'generated');
  await mkdir(sources);
  try {
    await sharp({ create: { width: 40, height: 20, channels: 3, background: '#d52b1e' } })
      .webp({ lossless: true })
      .toFile(join(sources, 'nl.webp'));
    const flags = [{ code: 'NL', filename: 'nl.webp', number: 1 }];
    const name = await createNumberedFlagImage(flags, sources, generated);
    const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    await utimes(join(generated, name), old, old);
    await writeFile(join(generated, 'expired.webp'), 'expired');
    await utimes(join(generated, 'expired.webp'), old, old);
    t.mock.method(Date, 'now', () => new Date().getTime() + 7 * 60 * 60 * 1000);
    const resize = t.mock.method(sharp.prototype, 'resize');
    assert.equal(await createNumberedFlagImage(flags, sources, generated), name);
    assert.equal(resize.mock.callCount(), 1);
    assert.deepEqual(await readdir(generated), [name]);
    assert.equal((await sharp(join(generated, name)).metadata()).format, 'webp');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('creates cached one- and two-panel quiz images with fixed canvases', async () => {
  const root = await mkdtemp(join(tmpdir(), 'flag-connect-composite-'));
  const sources = join(root, 'bot-flags');
  const generated = join(root, 'generated');
  await mkdir(sources);

  try {
    await sharp({
      create: { width: 440, height: 220, channels: 3, background: '#d52b1e' },
    })
      .webp({ lossless: true })
      .toFile(join(sources, 'nl.webp'));
    await sharp({
      create: { width: 220, height: 440, channels: 3, background: '#0038a8' },
    })
      .webp({ lossless: true })
      .toFile(join(sources, 'np.webp'));

    const pair = await createNumberedFlagImage(
      [
        { code: 'NL', filename: 'nl.webp', number: 1 },
        { code: 'NP', filename: 'np.webp', number: 2 },
      ],
      sources,
      generated,
    );
    const pairMetadata = await sharp(join(generated, pair)).metadata();
    assert.equal(pairMetadata.format, 'webp');
    assert.equal(pairMetadata.width, 896);
    assert.equal(pairMetadata.height, 349);

    const cachedPair = await createNumberedFlagImage(
      [
        { code: 'NL', filename: 'nl.webp', number: 1 },
        { code: 'NP', filename: 'np.webp', number: 2 },
      ],
      sources,
      generated,
    );
    assert.equal(cachedPair, pair);

    const single = await createNumberedFlagImage(
      [{ code: 'NP', filename: 'np.webp', number: 3 }],
      sources,
      generated,
    );
    const singleImage = sharp(join(generated, single));
    const singleMetadata = await singleImage.metadata();
    assert.equal(singleMetadata.width, 896);
    assert.equal(singleMetadata.height, 349);
    const { data, info } = await singleImage.raw().toBuffer({ resolveWithObject: true });
    const emptyPanelPixel = (100 * info.width + 700) * info.channels;
    assert.deepEqual([...data.subarray(emptyPanelPixel, emptyPanelPixel + 3)], [184, 190, 198]);
    assert.equal((await readdir(generated)).length, 2);

    await assert.rejects(
      createNumberedFlagImage(
        [
          { code: 'NL', filename: 'nl.webp', number: 1 },
          { code: 'NP', filename: 'np.webp', number: 2 },
          { code: 'NL', filename: 'nl.webp', number: 3 },
        ],
        sources,
        generated,
      ),
      RangeError,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
