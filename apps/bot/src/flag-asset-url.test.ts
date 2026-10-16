import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { versionedFlagUrl } from './flag-asset-url.js';

test('versions a bot flag URL by file contents', async () => {
  const root = await mkdtemp(join(tmpdir(), 'flag-connect-asset-url-'));
  const botFlags = join(root, 'bot');
  await mkdir(botFlags);

  try {
    const assetPath = join(botFlags, 'nl.webp');
    await writeFile(assetPath, 'first flag bytes');
    const firstUrl = await versionedFlagUrl(
      'https://example.test/images/bot/',
      botFlags,
      'nl.webp',
    );
    assert.match(firstUrl, /^https:\/\/example\.test\/images\/bot\/nl\.webp\?v=[a-f0-9]{16}$/);
    assert.equal(
      await versionedFlagUrl('https://example.test/images/bot/', botFlags, 'nl.webp'),
      firstUrl,
    );

    await writeFile(assetPath, 'updated flag bytes');
    const updatedUrl = await versionedFlagUrl(
      'https://example.test/images/bot/',
      botFlags,
      'nl.webp',
    );
    assert.notEqual(updatedUrl, firstUrl);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('uses a development fallback when local bot assets are not mounted', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousAssetVersion = process.env.BOT_FLAG_ASSET_VERSION;
  delete process.env.NODE_ENV;
  delete process.env.BOT_FLAG_ASSET_VERSION;
  try {
    assert.equal(
      await versionedFlagUrl('https://example.test/images/bot/', '/missing/flags', 'nl.webp'),
      'https://example.test/images/bot/nl.webp?v=dev',
    );
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousAssetVersion === undefined) delete process.env.BOT_FLAG_ASSET_VERSION;
    else process.env.BOT_FLAG_ASSET_VERSION = previousAssetVersion;
  }
});
