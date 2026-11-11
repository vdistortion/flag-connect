import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const compose = await readFile(new URL('./compose.yaml', import.meta.url), 'utf8');
// This command is deliberately an inline YAML list of single-quoted arguments.
const syncService = compose.match(/^  flags-sync:\n([\s\S]*?)(?=^  \S|^\S|$(?![\s\S]))/m)?.[1];
assert.ok(syncService, 'flags-sync service must exist');
const command = syncService.match(/command:\s*\[([\s\S]*?)\]/)?.[1];
assert.ok(command, 'flags-sync must declare its rclone command');
const args = [...command.matchAll(/'([^']*)'/g)].map((match) => match[1]);

test('asset updates preserve files used by the running release', () => {
  assert.equal(args[0], 'copy');
  assert.ok(!args.some((arg) => arg.startsWith('--delete')));
});

test('the configured transfer preserves old flags and excludes generated images', async () => {
  const root = await mkdtemp(join(tmpdir(), 'flag-connect-sync-'));
  try {
    const source = join(root, 'source');
    const destination = join(root, 'destination');
    await mkdir(join(source, 'generated'), { recursive: true });
    await mkdir(destination);
    await writeFile(join(source, 'new.webp'), 'new flag fixture');
    await writeFile(join(source, 'generated', 'composite.webp'), 'generated fixture');
    await writeFile(join(destination, 'old.webp'), 'previous release fixture');
    const transfer = spawnSync(
      process.env.RCLONE_BIN || 'rclone',
      ['--config', '/dev/null', args[0], source, destination, ...args.slice(3)],
      { encoding: 'utf8' },
    );
    assert.ifError(transfer.error);
    assert.equal(transfer.status, 0, transfer.stderr);
    assert.equal(await readFile(join(destination, 'new.webp'), 'utf8'), 'new flag fixture');
    assert.equal(await readFile(join(destination, 'old.webp'), 'utf8'), 'previous release fixture');
    await assert.rejects(readFile(join(destination, 'generated', 'composite.webp')), {
      code: 'ENOENT',
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
