import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('entrypoint registers game command and raw routing without removing personal quiz commands', async () => {
  const source = await readFile(new URL('../src/index.ts', import.meta.url), 'utf8');
  assert.match(source, /game: groupGame.command/);
  assert.match(source, /installGroupCallbacks\(bot, groupGame\)/);
  for (const command of ['start', 'flags', 'country', 'game', 'help']) {
    assert.match(source, new RegExp(`command: '${command}'`));
  }
  assert.match(source, /groupGame.dispose\(\)/);
});
