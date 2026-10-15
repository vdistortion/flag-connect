import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { createNumberedFlagImage } from './country-flag-composite.js';

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
    const singleMetadata = await sharp(join(generated, single)).metadata();
    assert.equal(singleMetadata.width, 448);
    assert.equal(singleMetadata.height, 349);
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
