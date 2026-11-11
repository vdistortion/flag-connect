import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import type { UniversalContext } from '@verse-bot/core';
import { createQuizHandlers } from './quiz-handlers.js';

const countries = Array.from({ length: 12 }, (_, i) => ({
  code: `C${i}`,
  name: { en: `e${i}`, ru: `r${i}` },
  flag: [`f${i}.png`],
}));

function setup() {
  const rich: string[] = [];
  const replies: string[] = [];
  const ctx = {
    userId: '1',
    peerId: 1,
    chatType: 'private',
    reply: async (message: string) => {
      replies.push(message);
    },
    platformApi: {
      sendRichMessage: async (_id: number, message: { html: string }) => {
        rich.push(message.html);
      },
    },
  } as unknown as UniversalContext;
  const handlers = createQuizHandlers({
    countries,
    flagsUrl: 'https://example.test/',
    generatedFlagsUrl: 'https://example.test/',
    flagsDirectory: '/missing',
    generatedFlagsDirectory: '/missing',
  });
  return { handlers, ctx, rich, replies };
}

function choices(html: string) {
  return [...html.matchAll(/data="(answer:([^:]+):(\d+))"/g)].map((match) => ({
    data: match[1],
    round: match[2],
    index: Number(match[3]),
  }));
}

test('a country not in the offered choices cannot consume a round', async () => {
  const { handlers, ctx, rich, replies } = setup();
  await handlers.askQuestion(ctx, 'flag');
  const offered = choices(rich[0]);
  assert.equal(offered.length, 4);
  const invalid = countries.findIndex(
    (_, index) => !offered.some((choice) => choice.index === index),
  );
  await handlers.handleCallback(ctx, `answer:${offered[0].round}:${invalid}`);
  assert.equal(rich.length, 1);
  assert.match(replies[0], /устарел/);
  await handlers.handleCallback(ctx, offered[0].data);
  assert.equal(rich.length, 2);
});

test('failed result delivery leaves the question retryable', async () => {
  const { handlers, ctx, rich } = setup();
  await handlers.askQuestion(ctx, 'flag');
  const answer = choices(rich[0])[0].data;
  const api = ctx.platformApi as { sendRichMessage: (...args: any[]) => Promise<unknown> };
  const send = api.sendRichMessage;
  api.sendRichMessage = async () => {
    throw new Error('delivery failed');
  };
  await assert.rejects(handlers.handleCallback(ctx, answer), /delivery failed/);
  api.sendRichMessage = send;
  await handlers.handleCallback(ctx, answer);
  assert.equal(rich.length, 2);
});

test('a question remains answerable if the delivery response is lost', async () => {
  const { handlers, ctx, rich, replies } = setup();
  const api = ctx.platformApi as { sendRichMessage: (...args: any[]) => Promise<unknown> };
  const send = api.sendRichMessage;
  api.sendRichMessage = async (...args) => {
    await send(...args);
    throw new Error('delivery failed');
  };
  await assert.rejects(handlers.askQuestion(ctx, 'flag'), /delivery failed/);
  api.sendRichMessage = send;
  await handlers.handleCallback(ctx, choices(rich[0])[0].data);
  assert.deepEqual(replies, []);
  assert.equal(rich.length, 2);
});

test('reveal is rejected when the round has answer choices', async () => {
  const { handlers, ctx, rich, replies } = setup();
  await handlers.askQuestion(ctx, 'flag');
  const offered = choices(rich[0]);
  await handlers.handleCallback(ctx, `reveal:${offered[0].round}`);
  assert.equal(rich.length, 1);
  assert.match(replies[0], /устарел/);
  await handlers.handleCallback(ctx, offered[0].data);
  assert.equal(rich.length, 2);
});

test('competing answers cannot send two results while delivery is pending', async () => {
  const { handlers, ctx, rich, replies } = setup();
  await handlers.askQuestion(ctx, 'flag');
  const offered = choices(rich[0]);
  const api = ctx.platformApi as { sendRichMessage: (...args: any[]) => Promise<unknown> };
  const send = api.sendRichMessage;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  api.sendRichMessage = async (...args) => {
    await gate;
    return send(...args);
  };
  const first = handlers.handleCallback(ctx, offered[0].data);
  await handlers.handleCallback(ctx, offered[1].data);
  assert.equal(rich.length, 1);
  assert.match(replies[0], /завершён/);
  release();
  await first;
  await handlers.handleCallback(ctx, offered[0].data);
  assert.equal(rich.length, 2);
  assert.match(replies[1], /завершён/);
});

test('another user cannot answer or use follow-up buttons', async () => {
  const { handlers, ctx, rich, replies } = setup();
  await handlers.askQuestion(ctx, 'flag');
  const choice = choices(rich[0])[0];
  const other = { ...ctx, userId: '2' } as UniversalContext;
  await handlers.handleCallback(other, choice.data);
  await handlers.handleCallback(other, `more:${choice.round}`);
  await handlers.handleCallback(other, `settings:${choice.round}`);
  await handlers.handleCallback(other, `count:${choice.round}:1`);
  assert.equal(rich.length, 1);
  assert.equal(replies.length, 4);
  assert.ok(replies.every((reply) => /другому|участнику/.test(reply)));
  await handlers.handleCallback(ctx, choice.data);
  assert.equal(rich.length, 2);
});

test('round controls cannot be used by the same owner in a different chat', async () => {
  const { handlers, ctx, rich, replies } = setup();
  await handlers.askQuestion(ctx, 'flag');
  const choice = choices(rich[0])[0];
  const otherChat = { ...ctx, peerId: -100 } as UniversalContext;
  for (const callback of [
    choice.data,
    `more:${choice.round}`,
    `settings:${choice.round}`,
    `count:${choice.round}:1`,
  ]) {
    await handlers.handleCallback(otherChat, callback);
  }
  assert.equal(rich.length, 1);
  assert.equal(replies.length, 4);
  assert.ok(replies.every((reply) => /другом чате/.test(reply)));
  await handlers.handleCallback(ctx, choice.data);
  assert.equal(rich.length, 2);
  await handlers.handleCallback(ctx, `count:${choice.round}:1`);
  const reveal = rich.at(-1)!.match(/data="(reveal:[^"]+)"/)![1];
  await handlers.handleCallback(otherChat, reveal);
  assert.equal(rich.length, 3);
  assert.match(replies.at(-1)!, /другом чате/);
  await handlers.handleCallback(ctx, reveal);
  assert.equal(rich.length, 4);
});

test('a callback received before question delivery resolves waits for the question', async () => {
  const { handlers, ctx, rich, replies } = setup();
  const api = ctx.platformApi as { sendRichMessage: (...args: any[]) => Promise<unknown> };
  const send = api.sendRichMessage;
  let release!: () => void;
  let delivered!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const ready = new Promise<void>((resolve) => {
    delivered = resolve;
  });
  api.sendRichMessage = async (...args) => {
    await send(...args);
    delivered();
    await gate;
  };
  const question = handlers.askQuestion(ctx, 'flag');
  await ready;
  api.sendRichMessage = send;
  const answer = handlers.handleCallback(ctx, choices(rich[0])[0].data);
  release();
  await Promise.all([question, answer]);
  assert.deepEqual(replies, []);
  assert.equal(rich.length, 2);
});

test('country-mode reveal is retryable after a failed send and cannot be repeated', async () => {
  const { handlers, ctx, rich, replies } = setup();
  await handlers.askQuestion(ctx, 'flag');
  const round = choices(rich[0])[0].round;
  await handlers.handleCallback(ctx, `count:${round}:1`);
  await handlers.askQuestion(ctx, 'country');
  const reveal = rich.at(-1)!.match(/data="(reveal:[^"]+)"/)![1];
  const api = ctx.platformApi as { sendRichMessage: (...args: any[]) => Promise<unknown> };
  const send = api.sendRichMessage;
  api.sendRichMessage = async () => {
    throw new Error('failed reveal');
  };
  await assert.rejects(handlers.handleCallback(ctx, reveal), /failed reveal/);
  api.sendRichMessage = send;
  await handlers.handleCallback(ctx, reveal);
  assert.match(rich.at(-1)!, /Правильный флаг страны/);
  const length = rich.length;
  await handlers.handleCallback(ctx, reveal);
  assert.equal(rich.length, length);
  assert.match(replies.at(-1)!, /завершён/);
});

test('answer callbacks cannot consume reveal-only questions', async () => {
  const { handlers, ctx, rich, replies } = setup();
  await handlers.askQuestion(ctx, 'flag');
  const round = choices(rich[0])[0].round;
  await handlers.handleCallback(ctx, `count:${round}:1`);
  const question = rich.at(-1)!;
  const id = question.match(/data="reveal:([^"]+)"/)![1];
  const index = Number(question.match(/\/f(\d+)\.png/)![1]);
  await handlers.handleCallback(ctx, `answer:${id}:${index}`);
  assert.match(replies.at(-1)!, /устарел/);
  await handlers.handleCallback(ctx, `reveal:${id}`);
  assert.match(rich.at(-1)!, /Ответ:/);
});

test('flag questions report correct and wrong choices with follow-up controls', async () => {
  const { handlers, ctx, rich } = setup();
  await handlers.askQuestion(ctx, 'flag');
  const offered = choices(rich[0]);
  const correct = Number(rich[0].match(/\/f(\d+)\.png/)![1]);
  await handlers.handleCallback(ctx, offered.find((choice) => choice.index === correct)!.data);
  assert.match(rich.at(-1)!, /Правильно/);
  assert.match(rich.at(-1)!, /settings:/);
  assert.match(rich.at(-1)!, /more:/);
  await handlers.handleCallback(ctx, `more:${offered[0].round}`);
  const question = rich.at(-1)!;
  const second = choices(question);
  const secondCorrect = Number(question.match(/\/f(\d+)\.png/)![1]);
  await handlers.handleCallback(ctx, second.find((choice) => choice.index !== secondCorrect)!.data);
  assert.match(rich.at(-1)!, /Неправильно/);
});

test('settings offer counts and start a new round with the selected count', async () => {
  const { handlers, ctx, rich, replies } = setup();
  await handlers.askQuestion(ctx, 'flag');
  const round = choices(rich[0])[0].round;
  await handlers.handleCallback(ctx, `settings:${round}`);
  assert.match(replies.at(-1)!, /Сколько/);
  await handlers.handleCallback(ctx, `count:${round}:2`);
  assert.equal(choices(rich.at(-1)!).length, 2);
  await handlers.askQuestion(ctx, 'flag');
  assert.equal(choices(rich.at(-1)!).length, 2);
});

test('competing follow-up actions create only one successor and invalidate old controls', async () => {
  for (const action of ['more', 'count']) {
    const { handlers, ctx, rich, replies } = setup();
    await handlers.askQuestion(ctx, 'flag');
    const choice = choices(rich[0])[0];
    await handlers.handleCallback(ctx, choice.data);
    const callback = action === 'more' ? `more:${choice.round}` : `count:${choice.round}:2`;
    await Promise.all([
      handlers.handleCallback(ctx, callback),
      handlers.handleCallback(ctx, callback),
      handlers.handleCallback(ctx, `count:${choice.round}:3`),
    ]);
    assert.equal(rich.length, 3);
    const before = replies.length;
    await handlers.handleCallback(ctx, `settings:${choice.round}`);
    await handlers.handleCallback(ctx, `more:${choice.round}`);
    await handlers.handleCallback(ctx, `count:${choice.round}:1`);
    assert.equal(rich.length, 3);
    assert.ok(replies.slice(before).every((reply) => /устарел/.test(reply)));
    await handlers.askQuestion(ctx, 'flag');
    assert.equal(choices(rich.at(-1)!).length, action === 'more' ? 4 : 2);
  }
});

test('a failed successor delivery cannot reopen old buttons and the delivered question works', async () => {
  const { handlers, ctx, rich, replies } = setup();
  await handlers.askQuestion(ctx, 'flag');
  const original = choices(rich[0])[0];
  const api = ctx.platformApi as {
    sendRichMessage: (id: number, message: { html: string }) => Promise<unknown>;
  };
  const send = api.sendRichMessage;
  api.sendRichMessage = async (id, message) => {
    await send(id, message);
    throw new Error('response lost');
  };
  await assert.rejects(handlers.handleCallback(ctx, `more:${original.round}`), /response lost/);
  api.sendRichMessage = send;
  const successor = choices(rich.at(-1)!)[0];
  await handlers.handleCallback(ctx, `more:${original.round}`);
  assert.equal(rich.length, 2);
  assert.match(replies.at(-1)!, /устарел/);
  await handlers.handleCallback(ctx, successor.data);
  assert.equal(rich.length, 3);
});

test('a successor preparation failure leaves the source controls retryable', async () => {
  const { handlers, ctx, rich } = setup();
  await handlers.askQuestion(ctx, 'flag');
  const original = choices(rich[0])[0];
  const group = {
    ...ctx,
    chatType: 'group',
    getUserProfile: async () => {
      throw new Error('profile unavailable');
    },
  } as UniversalContext;
  await assert.rejects(
    handlers.handleCallback(group, `more:${original.round}`),
    /profile unavailable/,
  );
  await handlers.handleCallback(ctx, `more:${original.round}`);
  assert.equal(rich.length, 2);
});

test('settings show every choice count once', async () => {
  const { handlers, ctx, rich } = setup();
  const keyboards: Array<Array<{ label: string; command: string }>>[] = [];
  ctx.reply = async (_message, options) => {
    keyboards.push(options!.inlineKeyboard as Array<Array<{ label: string; command: string }>>);
  };
  await handlers.askQuestion(ctx, 'flag');
  await handlers.handleCallback(ctx, `settings:${choices(rich[0])[0].round}`);
  const counts = keyboards[0].flat().map((button) => button.command.split(':').at(-1));
  assert.deepEqual(
    counts.sort((a, b) => Number(a) - Number(b)),
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
  );
});

test('country mode sends real composite images and grades answers', async () => {
  const root = await mkdtemp(join(tmpdir(), 'quiz-country-'));
  try {
    await mkdir(join(root, 'bot'));
    await Promise.all(
      countries.map((country) =>
        sharp({ create: { width: 20, height: 10, channels: 3, background: '#ff0000' } })
          .png()
          .toFile(join(root, 'bot', country.flag[0])),
      ),
    );
    const { ctx, rich } = setup();
    const handlers = createQuizHandlers({
      countries,
      flagsUrl: 'https://example.test/',
      generatedFlagsUrl: 'https://example.test/generated/',
      flagsDirectory: root,
      generatedFlagsDirectory: join(root, 'generated'),
    });
    await handlers.askQuestion(ctx, 'country');
    const question = rich[0];
    assert.equal((question.match(/<img /g) ?? []).length, 2);
    assert.match(question, /Найди флаг страны/);
    const correctName = question.match(/Найди флаг страны: <\/b>(r\d+)/)![1];
    const offered = choices(question);
    await handlers.handleCallback(
      ctx,
      offered.find((choice) => countries[choice.index].name.ru !== correctName)!.data,
    );
    assert.match(rich.at(-1)!, /неверный флаг/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
