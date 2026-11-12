import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { UniversalContext } from '@verse-bot/core';
import { createGroupGame, type GameApi, type Markup } from './group-game.js';

const countries = Array.from({ length: 12 }, (_, i) => ({
  code: `C${i}`,
  name: { en: `e${i}`, ru: `r${i}` },
  flag: [`f${i}.webp`],
}));
function setup() {
  const calls: { method: string; args: unknown[] }[] = [];
  const timers: { fn: () => void; cancelled: boolean; ms: number }[] = [];
  const replies: string[] = [],
    acks: string[] = [],
    errors: unknown[] = [];
  let markup: Markup = { inline_keyboard: [] };
  const api: GameApi = {
    sendPhoto: async (...args) => {
      calls.push({ method: 'sendPhoto', args });
      markup = args[2].reply_markup;
      return { message_id: 42 };
    },
    editMessageMedia: async (...args) => {
      calls.push({ method: 'editMessageMedia', args });
      markup = args[3].reply_markup;
    },
    editMessageCaption: async (...args) => {
      calls.push({ method: 'editMessageCaption', args });
      markup = args[2].reply_markup;
    },
  };
  let now = 1000;
  const rawGame = createGroupGame({
    countries,
    flagsUrl: 'https://flags.test/',
    flagsDirectory: '/missing',
    now: () => now,
    onError: (e) => errors.push(e),
    schedule: (fn, ms) => {
      const t = { fn, ms, cancelled: false };
      timers.push(t);
      return () => {
        t.cancelled = true;
      };
    },
  });
  // Most legacy assertions intentionally wait for effects; polling itself does not.
  const game = {
    ...rawGame,
    command: async (...args: Parameters<typeof rawGame.command>) => {
      await rawGame.command(...args);
      await rawGame.flush();
    },
    callback: async (...args: Parameters<typeof rawGame.callback>) => {
      await rawGame.callback(...args);
      await rawGame.flush();
    },
  };
  const ctx = {
    userId: 'a',
    peerId: -100,
    chatType: 'supergroup',
    platformApi: api,
    getUserProfile: async () => ({ firstName: 'Alice' }),
    reply: async (s: string) => {
      replies.push(s);
    },
  } as unknown as UniversalContext;
  const button = (action: string) =>
    markup.inline_keyboard.flat().find((b) => b.callback_data.split(':')[2] === action)!
      .callback_data;
  const callback = (id: string, data: string, peerId = -100) =>
    game.callback(
      {
        userId: id,
        peerId,
        name: id,
        acknowledge: async (text) => {
          acks.push(text);
        },
      },
      data,
    );
  return {
    game,
    ctx,
    api,
    calls,
    timers,
    replies,
    acks,
    errors,
    button,
    callback,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

test('disposing during a slow lobby upload clears feedback despite a stuck action request', async () => {
  const s = setup();
  const actions: unknown[][] = [];
  let release!: (value: { message_id: number }) => void;
  let uploading!: () => void;
  const started = new Promise<void>((resolve) => {
    uploading = resolve;
  });
  s.api.sendPhoto = () => {
    uploading();
    return new Promise((resolve) => {
      release = resolve;
    });
  };
  Object.assign(s.api, {
    sendChatAction: (...args: unknown[]) => {
      actions.push(args);
      return new Promise(() => {});
    },
  });
  // Keep setup's effect-waiting wrapper pending until the upload is released.
  const command = s.game.command(s.ctx);
  await started;
  assert.deepEqual(actions, [[-100, 'upload_photo']]);
  const refresh = s.timers.find((timer) => timer.ms === 4_000 && !timer.cancelled)!;
  assert.ok(refresh);
  s.game.dispose();
  assert.ok(s.timers.every((timer) => timer.cancelled));
  refresh.fn();
  assert.equal(actions.length, 1);
  release({ message_id: 42 });
  await command;
});

test('only lobby creation and new question media indicate upload, never caption updates', async () => {
  const s = setup();
  const actions: unknown[][] = [];
  Object.assign(s.api, {
    sendChatAction: async (...args: unknown[]) => {
      actions.push(args);
    },
  });
  await s.game.command(s.ctx);
  assert.deepEqual(actions, [[-100, 'upload_photo']]);
  await s.callback('b', s.button('join'));
  await s.game.command(s.ctx);
  assert.equal(actions.length, 1);
  await s.callback('a', s.button('start'));
  assert.equal(actions.length, 2);
  await s.callback('a', s.button('answer'));
  assert.equal(actions.length, 2);
  await s.callback('b', s.button('answer'));
  assert.equal(actions.length, 3);
  s.game.dispose();
  assert.ok(s.timers.every((timer) => timer.cancelled));
});

test('production-shaped asset paths read and version the local banner without a flag fallback', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'group-brand-'));
  const banner = Buffer.from('local banner bytes for URL checksum');
  let photo = '';
  await mkdir(join(directory, 'brand'));
  await writeFile(join(directory, 'brand/readme-banner.png'), banner);
  const game = createGroupGame({
    countries,
    flagsUrl: 'https://miniapp.test/images/flags/bot/',
    flagsDirectory: directory,
    onError: (error) => {
      throw error;
    },
  });
  try {
    const s = setup();
    await game.command({
      ...s.ctx,
      platformApi: {
        ...s.api,
        sendPhoto: async (_chat: number, url: string) => {
          photo = url;
          return { message_id: 42 };
        },
      },
    } as unknown as UniversalContext);
    await game.flush();
    assert.equal(
      photo,
      `https://miniapp.test/images/flags/brand/readme-banner.png?v=${createHash('sha256').update(banner).digest('hex').slice(0, 16)}`,
    );
    s.game.dispose();
  } finally {
    game.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});

test('abandoned lobby expires after 5 minutes, clears controls and releases the chat', async () => {
  const s = setup();
  await s.game.command(s.ctx);
  const oldJoin = s.button('join');
  const timer = s.timers.at(-1);
  assert.ok(timer, 'lobby must have an expiry timer');
  assert.equal(timer.ms, 300_000);
  s.advance(300_000);
  timer.fn();
  await s.game.flush();
  assert.match(JSON.stringify(s.calls.at(-1)!.args), /Лобби истекло/);
  assert.deepEqual(
    (s.calls.at(-1)!.args[2] as { reply_markup: Markup }).reply_markup.inline_keyboard,
    [],
  );
  assert.match(String(s.calls[0].args[1]), /\/brand\/readme-banner.png\?v=/);
  assert.equal(s.calls.at(-1)!.method, 'editMessageCaption');
  assert.ok(s.timers.every((t) => t.cancelled));
  await s.game.command(s.ctx);
  assert.equal(s.calls.filter((c) => c.method === 'sendPhoto').length, 2);
  assert.notEqual(s.button('join'), oldJoin);
  await s.callback('b', oldJoin);
  assert.equal(s.acks.at(-1), 'Игра устарела');
  s.game.dispose();
});

test('lobby lifetime is absolute and a start at its deadline loses even before the timer runs', async () => {
  const s = setup();
  await s.game.command(s.ctx);
  const timer = s.timers.at(-1)!;
  const start = s.button('start');
  s.advance(299_999);
  await s.callback('b', s.button('join'));
  await s.game.command(s.ctx);
  assert.equal(s.timers.at(-1), timer, 'activity must not reset the lobby lifetime');
  assert.equal(timer.cancelled, false);
  s.advance(1);
  await s.callback('a', start);
  assert.equal(s.acks.at(-1), 'Игра устарела');
  assert.match(JSON.stringify(s.calls.at(-1)!.args), /Лобби истекло/);
  timer.fn();
  await s.game.command(s.ctx);
  assert.equal(s.calls.filter((c) => c.method === 'sendPhoto').length, 2);
  s.game.dispose();
});

test('/game replaces an overdue lobby even when its timer has not fired', async () => {
  const s = setup();
  await s.game.command(s.ctx);
  const oldJoin = s.button('join');
  const timer = s.timers.at(-1)!;
  s.advance(300_000);
  await s.game.command(s.ctx);
  assert.equal(s.calls.filter((c) => c.method === 'sendPhoto').length, 2);
  assert.notEqual(s.button('join'), oldJoin);
  const freshJoin = s.button('join');
  timer.fn();
  await s.game.flush();
  await s.callback('b', freshJoin);
  assert.equal(s.acks.at(-1), 'Вы в игре');
  s.game.dispose();
});

test('an early lobby timer never expires before the absolute deadline', async () => {
  const s = setup();
  await s.game.command(s.ctx);
  const join = s.button('join');
  s.advance(299_999);
  s.timers.at(-1)!.fn();
  await s.game.flush();
  await s.callback('b', join);
  assert.equal(s.acks.at(-1), 'Вы в игре');
  const remainder = s.timers.at(-1)!;
  assert.equal(remainder.ms, 1);
  s.advance(1);
  remainder.fn();
  await s.game.flush();
  assert.match(JSON.stringify(s.calls.at(-1)!.args), /Лобби истекло/);
  s.game.dispose();
});

test('scheduled timeout advances without incoming updates; countdown and failed renders keep timer alive', async () => {
  const s = setup();
  await s.game.command(s.ctx);
  await s.callback('b', s.button('join'));
  await s.callback('a', s.button('start'));
  const tick = s.timers.at(-1)!;
  assert.equal(tick.ms, 5000);
  s.advance(5000);
  tick.fn();
  await s.game.command(s.ctx);
  assert.match(JSON.stringify(s.calls.at(-1)!.args), /Осталось: 25/);
  const timeout = s.timers.at(-1)!;
  const media = s.api.editMessageMedia;
  s.api.editMessageMedia = async () => {
    throw new Error('network down');
  };
  s.advance(25000);
  timeout.fn();
  await s.game.command(s.ctx);
  assert.ok(s.errors.length > 0);
  assert.ok(s.timers.some((t) => !t.cancelled));
  s.api.editMessageMedia = media;
  await s.game.command(s.ctx);
  assert.match(JSON.stringify(s.calls.at(-1)!.args), /Вопрос 2\/10/);
  s.game.dispose();
});

test('failed final render remains recoverable through /game without reopening answers', async () => {
  const s = setup();
  await s.game.command(s.ctx);
  await s.callback('b', s.button('join'));
  await s.callback('a', s.button('start'));
  const caption = s.api.editMessageCaption,
    media = s.api.editMessageMedia;
  s.api.editMessageCaption = async () => {
    throw new Error('offline');
  };
  s.api.editMessageMedia = async () => {
    throw new Error('offline');
  };
  await s.callback('a', s.button('stop'));
  s.api.editMessageCaption = caption;
  s.api.editMessageMedia = media;
  await s.game.command(s.ctx);
  assert.match(JSON.stringify(s.calls.at(-1)!.args), /Игра завершена/);
  await s.game.command(s.ctx);
  assert.equal(s.calls.filter((c) => c.method === 'sendPhoto').length, 2);
  s.game.dispose();
});

test('dispose drops queued writes while an earlier render is pending', async () => {
  const s = setup();
  await s.game.command(s.ctx);
  const edit = s.api.editMessageCaption;
  let release!: () => void, entered!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const start = new Promise<void>((r) => {
    entered = r;
  });
  s.api.editMessageCaption = async (...args) => {
    entered();
    await gate;
    await edit(...args);
  };
  const first = s.callback('b', s.button('join'));
  await start;
  const queued = s.game.command(s.ctx);
  const count = s.calls.length;
  s.game.dispose();
  release();
  await Promise.all([first, queued]);
  assert.equal(s.calls.length, count + 1);
});

test('all ten questions finish in same message with per-player wrong/skip results; next /game creates fresh party', async () => {
  const s = setup();
  await s.game.command(s.ctx);
  await s.callback('b', s.button('join'));
  await s.callback('a', s.button('start'));
  for (let r = 0; r < 10; r++) {
    const answer = s.button('answer');
    await Promise.all([s.callback('a', answer), s.callback('b', answer)]);
  }
  const final = JSON.stringify(s.calls.at(-1)!.args);
  assert.match(final, /Игра завершена/);
  assert.match(final, /Правильно \/ Ошибки \/ Пропуски/);
  assert.match(final, /inline_keyboard/);
  assert.equal(s.calls.at(-1)!.method, 'editMessageMedia');
  assert.equal((s.calls.at(-1)!.args[2] as { media: string }).media, s.calls[0].args[1]);
  const questionMedia = s.calls.filter((c) => c.method === 'editMessageMedia').slice(0, -1);
  assert.equal(questionMedia.length, 10);
  assert.ok(
    questionMedia.every((c) =>
      /^https:\/\/flags.test\/f\d+.webp\?v=/.test((c.args[2] as { media: string }).media),
    ),
  );
  assert.ok(s.timers.every((t) => t.cancelled));
  assert.equal(s.calls.filter((c) => c.method === 'sendPhoto').length, 1);
  await s.game.command(s.ctx);
  assert.equal(s.calls.filter((c) => c.method === 'sendPhoto').length, 2);
  s.game.dispose();
});

test('render queue never overlaps media updates and all-answered wins over already queued old timeout', async () => {
  const s = setup();
  await s.game.command(s.ctx);
  await s.callback('b', s.button('join'));
  await s.callback('a', s.button('start'));
  const oldTimeout = s.timers.at(-1)!;
  const answer = s.button('answer');
  const edit = s.api.editMessageCaption;
  let release!: () => void, entered!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const start = new Promise<void>((r) => {
    entered = r;
  });
  let pending = false;
  s.api.editMessageCaption = async (...args) => {
    pending = true;
    entered();
    await gate;
    await edit(...args);
    pending = false;
  };
  const media = s.api.editMessageMedia;
  s.api.editMessageMedia = async (...args) => {
    assert.equal(pending, false);
    await media(...args);
  };
  const first = s.callback('a', answer);
  await start;
  const second = s.callback('b', answer);
  oldTimeout.fn();
  release();
  await Promise.all([first, second]);
  await s.game.command(s.ctx);
  assert.match(JSON.stringify(s.calls.at(-1)!.args), /Вопрос 2\/10/);
  s.game.dispose();
});

test('deadline wins over late answers and stale timeout cannot advance twice; cross-chat callbacks rejected', async () => {
  const s = setup();
  await s.game.command(s.ctx);
  await s.callback('b', s.button('join'));
  await s.callback('a', s.button('start'));
  const answer = s.button('answer');
  const timeout = s.timers.at(-1)!;
  s.advance(30_000);
  await s.callback('a', answer);
  assert.match(s.acks.at(-1)!, /устарел/);
  timeout.fn();
  await s.game.command(s.ctx);
  assert.match(JSON.stringify(s.calls.at(-1)!.args), /Вопрос 2\/10/);
  await s.callback('a', s.button('answer'), -999);
  assert.match(s.acks.at(-1)!, /устарела/);
  s.game.dispose();
});

test('deleted message intentionally falls back to a new photo; transient edit failure is retried, renders serialized', async () => {
  const s = setup();
  await s.game.command(s.ctx);
  const edit = s.api.editMessageCaption;
  let attempts = 0;
  s.api.editMessageCaption = async (...args) => {
    if (++attempts === 1) throw new Error('network temporarily down');
    return edit(...args);
  };
  await s.callback('b', s.button('join'));
  assert.equal(attempts, 2);
  assert.equal(s.calls.filter((c) => c.method === 'sendPhoto').length, 1);
  s.api.editMessageCaption = async () => {
    throw new Error('Bad Request: message to edit not found');
  };
  await s.game.command(s.ctx);
  assert.equal(s.calls.filter((c) => c.method === 'sendPhoto').length, 2);
  s.game.dispose();
});

test('callback acknowledgement failure cannot strand round timers or stop cleanup', async () => {
  const s = setup();
  await s.game.command(s.ctx);
  await s.callback('b', s.button('join'));
  await s.game.callback(
    {
      userId: 'a',
      peerId: -100,
      name: 'a',
      acknowledge: async () => {
        throw new Error('query expired');
      },
    },
    s.button('start'),
  );
  assert.ok(s.timers.some((t) => !t.cancelled));
  await s.callback('a', s.button('stop'));
  assert.ok(s.timers.every((t) => t.cancelled));
  await s.game.command(s.ctx);
  assert.equal(s.calls.filter((c) => c.method === 'sendPhoto').length, 2);
  assert.ok(s.errors.length > 0);
  s.game.dispose();
});

test('group-only /game creates one photo lobby; real match joins, starts and edits media with private acknowledgements', async () => {
  const s = setup();
  await s.game.command({ ...s.ctx, chatType: 'private' });
  assert.match(s.replies[0], /групп/);
  assert.equal(s.calls.length, 0);
  await s.game.command(s.ctx);
  assert.equal(s.calls[0].method, 'sendPhoto');
  assert.equal(s.calls[0].args[0], -100);
  assert.match(String(s.calls[0].args[1]), /^https:\/\/flags.test\/brand\/readme-banner.png\?v=/);
  await s.game.command(s.ctx);
  assert.equal(s.calls.filter((c) => c.method === 'sendPhoto').length, 1);
  await s.callback('b', s.button('join'));
  assert.equal(s.calls.at(-1)!.method, 'editMessageCaption');
  assert.match(JSON.stringify(s.calls.at(-1)!.args), /Alice.*b/);
  await s.callback('a', s.button('start'));
  const edit = s.calls.at(-1)!;
  assert.ok(['editMessageMedia', 'editMessageCaption'].includes(edit.method));
  assert.deepEqual(edit.args.slice(0, 2), [-100, 42]);
  if (edit.method === 'editMessageMedia')
    assert.equal((edit.args[2] as { type: string }).type, 'photo');
  const answer = s.button('answer');
  assert.ok(Buffer.byteLength(answer) <= 64);
  await s.callback('a', answer);
  assert.equal(s.acks.at(-1), 'Ответ принят');
  await s.callback('b', answer);
  assert.equal(s.acks.at(-1), 'Ответ принят');
  assert.match(JSON.stringify(s.calls.at(-1)!.args), /Вопрос 2\/10/);
  await s.callback('a', answer);
  assert.match(s.acks.at(-1)!, /устарел/);
  assert.ok(s.timers.some((t) => t.cancelled));
  s.game.dispose();
  assert.ok(s.timers.every((t) => t.cancelled));
});
