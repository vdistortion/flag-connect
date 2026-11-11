import assert from 'node:assert/strict';
import test from 'node:test';
import type { UniversalContext } from '@verse-bot/core';
import { createGroupGame, type GameApi, type Markup } from './group-game.js';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
function setup() {
  let now = 0;
  let markup: Markup = { inline_keyboard: [] };
  const acks: string[] = [];
  const errors: unknown[] = [];
  const captions: string[] = [];
  const timers: { fn: () => void; ms: number; cancelled: boolean }[] = [];
  const record = async (caption: string, next: Markup) => {
    captions.push(caption);
    markup = next;
  };
  const api: GameApi = {
    sendPhoto: async (_chat, _photo, options) => {
      await record(options.caption, options.reply_markup);
      return { message_id: 42 };
    },
    editMessageMedia: async (_chat, _message, media, options) =>
      record(media.caption, options.reply_markup),
    editMessageCaption: async (_chat, _message, options) =>
      record(options.caption, options.reply_markup),
  };
  const game = createGroupGame({
    countries: Array.from({ length: 12 }, (_, i) => ({
      code: `C${i}`,
      name: { en: `e${i}`, ru: `r${i}` },
      flag: [`f${i}.webp`],
    })),
    flagsUrl: 'https://flags.test/',
    flagsDirectory: '/missing',
    now: () => now,
    onError: (e) => errors.push(e),
    schedule: (fn, ms) => {
      const timer = { fn, ms, cancelled: false };
      timers.push(timer);
      return () => {
        timer.cancelled = true;
      };
    },
  });
  const ctx = {
    userId: 'a',
    peerId: -100,
    chatType: 'supergroup',
    platformApi: api,
    getUserProfile: async () => ({ firstName: 'Alice' }),
    reply: async () => {},
  } as unknown as UniversalContext;
  // Both API generations are supported while demonstrating the original failure.
  const flush = async () => {
    if ('flush' in game) await (game.flush as () => Promise<void>)();
  };
  const button = (action: string) =>
    markup.inline_keyboard.flat().find((b) => b.callback_data.split(':')[2] === action)!
      .callback_data;
  const callback = (
    id: string,
    data: string,
    acknowledge = async (text: string) => {
      acks.push(text);
    },
  ) => game.callback({ userId: id, peerId: -100, name: id, acknowledge }, data);
  const ready = async () => {
    await game.command(ctx);
    await flush();
    await callback('b', button('join'));
    await flush();
    await callback('a', button('start'));
    await flush();
  };
  return {
    game,
    api,
    ctx,
    acks,
    errors,
    captions,
    timers,
    button,
    callback,
    flush,
    ready,
    setNow: (value: number) => {
      now = value;
    },
  };
}

test('lobby expiry rejects callbacks during a stalled render and serializes cleanup before a replacement', async () => {
  const s = setup();
  const gate = deferred();
  const entered = deferred();
  try {
    await s.game.command(s.ctx);
    await s.flush();
    const oldJoin = s.button('join');
    const oldStart = s.button('start');
    const timer = s.timers.at(-1)!;
    const edit = s.api.editMessageCaption;
    s.api.editMessageCaption = async (...args) => {
      entered.resolve();
      await gate.promise;
      return edit(...args);
    };
    await s.callback('b', oldJoin);
    await entered.promise;
    s.setNow(300_000);
    timer.fn();
    await s.callback('a', oldStart);
    await s.game.command(s.ctx); // Polling must return while the old edit is stalled.
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(s.acks.at(-1), 'Игра устарела');
    assert.equal(timer.cancelled, true);
    assert.equal(s.captions.length, 1);
    gate.resolve();
    await s.flush();
    assert.match(s.captions.at(-2)!, /Лобби истекло/);
    assert.match(s.captions.at(-1)!, /Групповая игра • Лобби/);
    const freshJoin = s.button('join');
    assert.notEqual(freshJoin, oldJoin);
    timer.fn();
    await s.callback('b', oldJoin);
    await s.flush();
    assert.equal(s.acks.at(-1), 'Игра устарела');
    await s.callback('b', freshJoin);
    await s.flush();
    assert.equal(s.acks.at(-1), 'Вы в игре');
    assert.deepEqual(s.errors, []);
  } finally {
    gate.resolve();
    s.game.dispose();
  }
});

test('starting just before lobby expiry cancels it and a stale timer cannot stop the match', async () => {
  const s = setup();
  try {
    await s.game.command(s.ctx);
    await s.flush();
    const timer = s.timers.at(-1)!;
    await s.callback('b', s.button('join'));
    await s.flush();
    s.setNow(299_999);
    await s.callback('a', s.button('start'));
    assert.equal(timer.cancelled, true);
    s.setNow(300_000);
    timer.fn();
    await s.flush();
    assert.equal(s.acks.at(-1), 'Игра началась');
    assert.match(s.captions.at(-1)!, /Вопрос 1\/10/);
    await s.callback('a', s.button('answer'));
    await s.flush();
    assert.equal(s.acks.at(-1), 'Ответ принят');
  } finally {
    s.game.dispose();
  }
});

test('stop and dispose cancel lobby expiry and stale timers cannot touch a fresh session', async () => {
  for (const action of ['stop', 'dispose']) {
    const s = setup();
    try {
      await s.game.command(s.ctx);
      await s.flush();
      const timer = s.timers.at(-1)!;
      if (action === 'stop') {
        await s.callback('a', s.button('stop'));
        await s.flush();
        s.setNow(1); // The replacement's deadline must be later than the old lobby's.
        await s.game.command(s.ctx);
        await s.flush();
      } else s.game.dispose();
      assert.equal(timer.cancelled, true, action);
      const count = s.captions.length;
      s.setNow(300_000);
      timer.fn();
      await s.flush();
      assert.equal(s.captions.length, count, action);
      if (action === 'stop') {
        await s.callback('b', s.button('join'));
        await s.flush();
        assert.equal(s.acks.at(-1), 'Вы в игре');
      }
    } finally {
      s.game.dispose();
    }
  }
});

test('failed expiry publication still releases the chat and rejects the old controls', async () => {
  const s = setup();
  try {
    await s.game.command(s.ctx);
    await s.flush();
    const oldJoin = s.button('join');
    s.api.editMessageCaption = async () => {
      throw new Error('offline');
    };
    s.setNow(300_000);
    s.timers.at(-1)!.fn();
    await s.flush();
    assert.match(String(s.errors.at(-1)), /offline/);
    await s.game.command(s.ctx);
    await s.flush();
    assert.notEqual(s.button('join'), oldJoin);
    await s.callback('b', oldJoin);
    await s.flush();
    assert.equal(s.acks.at(-1), 'Игра устарела');
  } finally {
    s.game.dispose();
  }
});

test('command polling completion does not wait for profile lookup or publication', async () => {
  const s = setup();
  const gate = deferred();
  try {
    s.ctx.getUserProfile = async () => {
      await gate.promise;
      return { firstName: 'Alice' };
    };
    let completed = false;
    const pending = s.game.command(s.ctx).then(() => {
      completed = true;
    });
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(completed, true);
    gate.resolve();
    await pending;
    await s.flush();
  } finally {
    gate.resolve();
    s.game.dispose();
  }
});

test('slow acknowledgement cannot block another receipt or question publication; rejection is logged', async () => {
  const s = setup();
  const gate = deferred();
  try {
    await s.ready();
    const answer = s.button('answer');
    const published = deferred();
    const media = s.api.editMessageMedia;
    const caption = s.api.editMessageCaption;
    s.api.editMessageMedia = async (...args) => {
      await media(...args);
      if (args[2].caption.startsWith('Вопрос 2/10')) published.resolve();
    };
    s.api.editMessageCaption = async (...args) => {
      await caption(...args);
      if (args[2].caption.startsWith('Вопрос 2/10')) published.resolve();
    };
    await s.callback('a', answer, async () => {
      await gate.promise;
      throw new Error('ack failed');
    });
    await s.callback('b', answer);
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(s.acks.at(-1), 'Ответ принят');
    // Observe actual publication, not a guessed number of filesystem/event-loop turns.
    await published.promise;
    assert.match(s.captions.at(-1)!, /Вопрос 2\/10/);
    gate.resolve();
    await s.flush();
    assert.match(String(s.errors.at(-1)), /ack failed/);
  } finally {
    gate.resolve();
    s.game.dispose();
  }
});

test('idle expiry is independent of a stalled render and dispose prevents timer resurrection', async () => {
  const s = setup();
  const gate = deferred();
  try {
    await s.ready();
    const answer = s.button('answer');
    const entered = deferred();
    const edit = s.api.editMessageCaption;
    s.api.editMessageCaption = async (...args) => {
      entered.resolve();
      await gate.promise;
      return edit(...args);
    };
    await s.callback('a', answer);
    await entered.promise;
    const timer = s.timers.at(-1)!;
    s.setNow(30_000);
    timer.fn();
    await s.callback('b', answer);
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(s.acks.at(-1), 'Вопрос устарел');
    s.game.dispose();
    gate.resolve();
    await s.flush();
    timer.fn();
    assert.ok(s.timers.every((t) => t.cancelled));
  } finally {
    gate.resolve();
    s.game.dispose();
  }
});

test('malformed callback fields never consume an answer or mutate lobby', async () => {
  const s = setup();
  try {
    await s.game.command(s.ctx);
    await s.flush();
    await s.callback('b', `${s.button('join')}:extra`);
    await s.flush();
    await s.callback('a', s.button('start'));
    await s.flush();
    assert.match(s.acks.at(-1)!, /два игрока/);
    await s.callback('b', s.button('join'));
    await s.flush();
    await s.callback('a', s.button('start'));
    await s.flush();
    const prefix = s.button('answer').split(':').slice(0, 3).join(':');
    for (const suffix of [
      '::',
      ':0:',
      '::0',
      ':0:0:extra',
      ':00:0',
      ':0:00',
      ':0:1e0',
      ':0:+0',
      ':0:0x0',
      ':0: 0',
      ':0:4',
      ':10:0',
    ]) {
      await s.callback('a', prefix + suffix);
      await s.flush();
      assert.notEqual(s.acks.at(-1), 'Ответ принят', suffix);
    }
    await s.callback('a', s.button('answer'));
    await s.flush();
    assert.equal(s.acks.at(-1), 'Ответ принят');
  } finally {
    s.game.dispose();
  }
});

test('publication delay cannot accept unseen question and grants a full 30 seconds', async () => {
  const s = setup();
  try {
    await s.ready();
    const answer = s.button('answer');
    await s.callback('a', answer);
    await s.flush();
    const entered = deferred(),
      gate = deferred();
    const media = s.api.editMessageMedia;
    s.api.editMessageMedia = async (...args) => {
      entered.resolve();
      await gate.promise;
      return media(...args);
    };
    await s.callback('b', answer);
    await entered.promise;
    const next = answer.replace(':answer:0:', ':answer:1:');
    await s.callback('a', next);
    s.setNow(40_000);
    gate.resolve();
    await s.flush();
    assert.notEqual(s.acks.at(-1), 'Ответ принят');
    s.setNow(69_000);
    await s.callback('a', next);
    await s.flush();
    assert.equal(s.acks.at(-1), 'Ответ принят');
    await s.callback('b', next);
    await s.flush();
    assert.equal(s.acks.at(-1), 'Ответ принят');
    assert.match(s.captions.at(-1)!, /Вопрос 3\/10/);
  } finally {
    s.game.dispose();
  }
});

test('two receipts at 29s both count when the first render completes at 31s', async () => {
  const s = setup();
  try {
    await s.ready();
    const answer = s.button('answer');
    const entered = deferred(),
      gate = deferred();
    const edit = s.api.editMessageCaption;
    s.api.editMessageCaption = async (...args) => {
      entered.resolve();
      await gate.promise;
      return edit(...args);
    };
    s.setNow(29_000);
    const first = s.callback('a', answer);
    await entered.promise;
    const second = s.callback('b', answer);
    s.setNow(31_000);
    gate.resolve();
    await Promise.all([first, second]);
    await s.flush();
    assert.deepEqual(s.acks.slice(-2), ['Ответ принят', 'Ответ принят']);
    assert.match(s.captions.at(-1)!, /Вопрос 2\/10/);
  } finally {
    s.game.dispose();
  }
});
