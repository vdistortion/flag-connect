import assert from 'node:assert/strict';
import test from 'node:test';
import { GroupMatch } from './group-match.js';

export const countries = Array.from({ length: 12 }, (_, i) => ({
  code: `C${i}`,
  name: { en: `e${i}`, ru: `r${i}` },
  flag: [`f${i}.webp`],
}));

function lobby() {
  return new GroupMatch('party', 'a', 'Alice', countries, () => 0.3);
}

test('lobby capacity bounds photo captions; names bounded; active join does not reset skipped streak', () => {
  const game = lobby();
  for (let i = 0; i < 11; i++) game.join(String(i), 'x'.repeat(200));
  assert.equal(game.players.size, 12);
  assert.match(game.join('overflow', 'Extra'), /полно/);
  assert.ok([...game.players.values()].every((p) => p.name.length <= 24));
  game.start('a');
  game.expire(0);
  game.join('a', 'Alice');
  assert.equal(game.players.get('a')!.consecutiveSkips, 1);
});

test('creator owns a lobby, requires two players and freezes ten unique four-choice questions', () => {
  const game = lobby();
  assert.equal(game.players.size, 1);
  assert.match(game.start('a'), /два/);
  assert.equal(game.join('b', 'Bob'), 'Вы в игре');
  assert.match(game.start('b'), /создатель/);
  assert.equal(game.start('a'), 'Игра началась');
  assert.equal(game.phase, 'playing');
  assert.equal(game.questions.length, 10);
  assert.equal(new Set(game.questions.map((q) => q.countries[q.correctAnswerIndex].code)).size, 10);
  assert.ok(
    game.questions.every((q) => q.countries.length === 4 && new Set(q.countryIndexes).size === 4),
  );
  assert.match(game.join('c', 'Carol'), /следующей/);
});

function playing() {
  const game = lobby();
  game.join('b', 'Bob');
  game.start('a');
  return game;
}

test('one answer per player, no correctness leak, stale rounds and outsiders rejected; all answered advances once', () => {
  const game = playing();
  const correct = game.questions[0].correctAnswerIndex;
  assert.match(game.answer('x', 0, correct), /участник/);
  assert.match(game.answer('a', 0, 9), /устарел/);
  assert.equal(game.answer('a', 0, correct), 'Ответ принят');
  assert.match(game.answer('a', 0, correct), /уже/);
  assert.equal(game.round, 0);
  assert.equal(game.answer('b', 0, (correct + 1) % 4), 'Ответ принят');
  assert.equal(game.round, 1);
  assert.equal(game.expire(0), false);
  assert.match(game.answer('a', 0, correct), /устарел/);
  assert.equal(game.players.get('a')!.correct, 1);
  assert.equal(game.players.get('b')!.wrong, 1);
  assert.equal(game.players.get('b')!.skipped, 0);
});

test('timeouts count skips separately, three consecutive skips deactivate; roster may return but outsiders cannot', () => {
  const game = playing();
  for (let r = 0; r < 3; r++) {
    game.answer('a', r, game.questions[r].correctAnswerIndex);
    assert.equal(game.expire(r), true);
  }
  assert.equal(game.players.get('b')!.active, false);
  assert.equal(game.players.get('b')!.skipped, 3);
  assert.equal(game.players.get('b')!.wrong, 0);
  assert.equal(game.join('b', 'Bob'), 'Вы в игре');
  assert.equal(game.players.get('b')!.active, true);
  assert.equal(game.players.get('b')!.consecutiveSkips, 0);
  assert.match(game.join('c', 'Carol'), /следующей/);
});

test('leave removes lobby members, active leavers are not waited on, stop creator-only and ten rounds finish', () => {
  const game = lobby();
  game.join('c', 'Carol');
  game.leave('c');
  assert.equal(game.players.has('c'), false);
  game.join('b', 'Bob');
  game.start('a');
  game.answer('a', 0, 0);
  game.leave('b');
  assert.equal(game.round, 1);
  assert.equal(game.players.get('b')!.skipped, 1);
  assert.match(game.stop('b'), /создатель/);
  for (let r = 1; r < 10; r++) game.answer('a', r, 0);
  assert.equal(game.phase, 'finished');
  const stopped = playing();
  assert.equal(stopped.stop('a'), 'Игра остановлена');
  assert.equal(stopped.phase, 'finished');
  assert.equal(stopped.expire(0), false);
});
