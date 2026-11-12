import assert from 'node:assert/strict';
import test from 'node:test';
import { createChatActions } from './chat-action.js';

function setup() {
  const timers: { fn: () => void; ms: number; cancelled: boolean }[] = [];
  const errors: unknown[] = [];
  const actions: unknown[][] = [];
  const feedback = createChatActions({
    schedule: (fn, ms) => {
      const timer = { fn, ms, cancelled: false };
      timers.push(timer);
      return () => {
        timer.cancelled = true;
      };
    },
    onError: (error) => {
      errors.push(error);
    },
  });
  const api = {
    sendChatAction: async (...args: unknown[]) => {
      actions.push(args);
    },
  };
  return { feedback, api, actions, errors, timers };
}

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

test('refreshes every four seconds only while work is pending and clears the final timer', async () => {
  const s = setup();
  const work = deferred();
  const pending = s.feedback.run(s.api, 12, 'upload_photo', () => work.promise);
  assert.deepEqual(s.actions, [[12, 'upload_photo']]);
  assert.equal(s.timers[0].ms, 4_000);
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  s.timers[0].fn();
  assert.equal(s.actions.length, 2);
  work.resolve();
  await pending;
  assert.equal(s.timers.at(-1)!.cancelled, true);
  s.timers.at(-1)!.fn();
  assert.equal(s.actions.length, 2);
});

test('action failures are logged but do not prevent the reply or leak timers', async () => {
  for (const synchronous of [false, true]) {
    const s = setup();
    const error = new Error('action failed');
    s.api.sendChatAction = () => {
      if (synchronous) throw error;
      return Promise.reject(error);
    };
    assert.equal(await s.feedback.run(s.api, 12, 'typing', async () => 'reply'), 'reply');
    assert.deepEqual(s.errors, [error]);
    assert.equal(s.timers.at(-1)!.cancelled, true);
  }
});

test('operation rejection propagates and clears refreshes', async () => {
  const s = setup();
  await assert.rejects(
    s.feedback.run(s.api, 12, 'typing', async () => {
      throw new Error('render failed');
    }),
    /render failed/,
  );
  assert.equal(s.timers.at(-1)!.cancelled, true);
});

test('dispose stops refreshes during stuck work without waiting for stuck action requests', async () => {
  const s = setup();
  const work = deferred();
  const request = deferred();
  s.api.sendChatAction = async (...args) => {
    s.actions.push(args);
    await request.promise;
  };
  const pending = s.feedback.run(s.api, 12, 'typing', () => work.promise);
  s.timers[0].fn();
  assert.equal(s.actions.length, 1, 'do not stack stuck requests');
  s.feedback.dispose();
  assert.equal(s.timers.at(-1)!.cancelled, true);
  s.timers.at(-1)!.fn();
  assert.equal(s.actions.length, 1);
  work.resolve();
  await pending;
  request.resolve();
  await s.feedback.run(s.api, 12, 'typing', async () => {});
  assert.equal(s.actions.length, 1);
});

test('missing optional Telegram capability still runs the operation without a timer', async () => {
  const s = setup();
  assert.equal(await s.feedback.run({}, 12, 'typing', async () => 'reply'), 'reply');
  assert.deepEqual(s.timers, []);
});
