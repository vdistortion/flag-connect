import assert from 'node:assert/strict';
import test from 'node:test';
import { createUniversalTelegramBot } from '@verse-bot/telegram';
import { createGroupGame } from './group-game.js';
import { installGroupCallbacks } from './group-callbacks.js';

test('real Verse API payloads run /game lobby through callback answers without network', async () => {
  const countries = Array.from({ length: 12 }, (_, i) => ({
    code: `C${i}`,
    name: { en: `e${i}`, ru: `r${i}` },
    flag: [`f${i}.webp`],
  }));
  const game = createGroupGame({
    countries,
    flagsUrl: 'https://flags.test/',
    flagsDirectory: '/missing',
  });
  const bot = createUniversalTelegramBot({
    token: '123:offline',
    commands: { game: game.command },
    buttons: [],
  });
  bot.botInfo = {
    id: 123,
    is_bot: true,
    first_name: 'Test',
    username: 'test_bot',
    can_join_groups: true,
    can_read_all_group_messages: false,
    supports_inline_queries: false,
    can_connect_to_business: false,
    has_main_web_app: false,
    has_topics_enabled: false,
    allows_users_to_create_topics: false,
    can_manage_bots: false,
    supports_join_request_queries: false,
  };
  const calls: { method: string; payload: Record<string, unknown> }[] = [];
  bot.api.config.use(async (_prev, method, payload) => {
    calls.push({ method, payload });
    const result =
      method === 'getChat'
        ? { id: 7, type: 'private', first_name: 'Alice' }
        : method === 'sendPhoto'
          ? { message_id: 42 }
          : true;
    return { ok: true, result } as never;
  });
  installGroupCallbacks(bot, game);
  const chat = { id: -100, type: 'supergroup' as const, title: 'Quiz' };
  const from = { id: 7, is_bot: false, first_name: 'Alice' };
  await bot.handleUpdate({
    update_id: 1,
    message: {
      message_id: 1,
      date: 0,
      chat,
      from,
      text: '/game',
      entities: [{ type: 'bot_command', offset: 0, length: 5 }],
    },
  });
  await game.flush();
  const data = (action: string) => {
    const payload = [...calls].reverse().find((c) => c.payload.reply_markup !== undefined)!.payload;
    const rows = (payload.reply_markup as { inline_keyboard: { callback_data: string }[][] })
      .inline_keyboard;
    return rows.flat().find((b) => b.callback_data.split(':')[2] === action)!.callback_data;
  };
  const callback = (id: number, value: string) =>
    bot
      .handleUpdate({
        update_id: 2,
        callback_query: {
          id: `query-${id}`,
          chat_instance: 'instance',
          from: { ...from, id },
          data: value,
          message: { message_id: 42, date: 0, chat },
        },
      })
      .then(() => game.flush());
  try {
    await callback(8, data('join'));
    await callback(7, data('start'));
    const answer = data('answer');
    await callback(7, answer);
    await callback(8, answer);
    const media = [...calls].reverse().find((c) => c.method === 'editMessageMedia')!.payload;
    assert.equal(media.chat_id, -100);
    assert.equal(media.message_id, 42);
    assert.match((media.media as { caption: string }).caption, /Вопрос 2\/10/);
    const acknowledgements = calls.filter((c) => c.method === 'answerCallbackQuery');
    assert.deepEqual(
      calls.filter((c) => c.method === 'sendChatAction').map((c) => c.payload),
      Array.from({ length: 3 }, () => ({ chat_id: -100, action: 'upload_photo' })),
    );
    assert.equal(acknowledgements.length, 4);
    assert.deepEqual(acknowledgements.at(-1)!.payload, {
      callback_query_id: 'query-8',
      text: 'Ответ принят',
      show_alert: false,
    });
  } finally {
    game.dispose();
  }
});

test('raw group callback receives exact private answerCallbackQuery text once; personal callbacks retain Verse route', async () => {
  let personal = 0;
  const bot = createUniversalTelegramBot({
    token: '123:offline',
    commands: {},
    buttons: [],
    onCallback: async () => {
      personal++;
    },
  });
  bot.botInfo = {
    id: 123,
    is_bot: true,
    first_name: 'Test',
    username: 'test_bot',
    can_join_groups: true,
    can_read_all_group_messages: false,
    supports_inline_queries: false,
    can_connect_to_business: false,
    has_main_web_app: false,
    has_topics_enabled: false,
    allows_users_to_create_topics: false,
    can_manage_bots: false,
    supports_join_request_queries: false,
  };
  const calls: { method: string; payload: unknown }[] = [];
  bot.api.config.use(async (_prev, method, payload) => {
    calls.push({ method, payload });
    return { ok: true, result: true } as never;
  });
  let release!: () => void;
  let slow = false;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const callbacks: string[] = [];
  installGroupCallbacks(bot, {
    command: async () => {},
    dispose: () => {},
    flush: async () => {},
    callback: async (ctx, data) => {
      callbacks.push(data);
      assert.equal(ctx.userId, '7');
      assert.equal(ctx.peerId, -100);
      assert.equal(ctx.name, 'Bob');
      await ctx.acknowledge('Ответ принят');
      if (slow) await gate;
    },
  });
  const update = (data: string) => ({
    update_id: 1,
    callback_query: {
      id: 'query-id',
      from: { id: 7, is_bot: false, first_name: 'Bob' },
      chat_instance: 'instance',
      data,
      message: {
        message_id: 42,
        date: 0,
        chat: { id: -100, type: 'supergroup' as const, title: 'Quiz' },
      },
    },
  });
  await bot.handleUpdate(update('g:party:answer:0:1'));
  assert.deepEqual(callbacks, ['g:party:answer:0:1']);
  assert.equal(personal, 0);
  assert.deepEqual(calls, [
    {
      method: 'answerCallbackQuery',
      payload: { callback_query_id: 'query-id', text: 'Ответ принят', show_alert: false },
    },
  ]);
  await bot.handleUpdate(update('answer:personal:1'));
  assert.equal(personal, 1);
  assert.equal(calls.length, 2);
  slow = true;
  let completed = false;
  const pending = bot.handleUpdate(update('g:party:answer:0:1')).then(() => {
    completed = true;
  });
  await new Promise<void>((resolve) => setImmediate(resolve));
  const didComplete = completed;
  release();
  await pending;
  assert.equal(
    didComplete,
    true,
    'raw middleware must return without waiting for callback effects',
  );
});
