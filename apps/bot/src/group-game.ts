import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { GroupMatch } from './group-match.js';
import { versionedFlagUrl } from './flag-asset-url.js';
import type { UniversalContext } from '@verse-bot/core';
import type { Country } from '@flag-connect/flag-domain';

export interface GameApi {
  sendPhoto(
    chatId: number,
    photo: string,
    options: { caption: string; reply_markup: Markup },
  ): Promise<{ message_id: number }>;
  editMessageMedia(
    chatId: number,
    messageId: number,
    media: { type: 'photo'; media: string; caption: string },
    options: { reply_markup: Markup },
  ): Promise<unknown>;
  editMessageCaption(
    chatId: number,
    messageId: number,
    options: { caption: string; reply_markup: Markup },
  ): Promise<unknown>;
}
export interface Markup {
  inline_keyboard: { text: string; callback_data: string }[][];
}
export interface GameConfig {
  countries: readonly Country[];
  flagsUrl: string;
  flagsDirectory: string;
  now?: () => number;
  schedule?: (fn: () => void, ms: number) => () => void;
  onError?: (error: unknown) => void;
}
export interface GameCallback {
  userId: string;
  peerId: number;
  name: string;
  acknowledge: (text: string) => Promise<unknown>;
}
export function createGroupGame(config: GameConfig) {
  const now = config.now ?? Date.now;
  const report = config.onError ?? ((error: unknown) => console.error('Group game:', error));
  const schedule =
    config.schedule ??
    ((fn: () => void, ms: number) => {
      const timer = setTimeout(fn, ms);
      timer.unref();
      return () => clearTimeout(timer);
    });
  interface Session {
    match: GroupMatch;
    api: GameApi;
    chatId: number;
    messageId?: number;
    photo?: string;
    deadline?: number;
    timedRound?: number;
    cancel?: () => void;
  }
  const sessions = new Map<number, Session>();
  const queues = new Map<number, Promise<void>>();
  let disposed = false;
  function enqueue(chatId: number, task: () => Promise<void>): Promise<void> {
    if (disposed) return Promise.resolve();
    const next = (queues.get(chatId) ?? Promise.resolve())
      .then(() => (disposed ? undefined : task()))
      .catch(report);
    queues.set(chatId, next);
    void next.finally(() => {
      if (queues.get(chatId) === next) queues.delete(chatId);
    });
    return next;
  }
  function view(s: Session) {
    const m = s.match;
    const data = (action: string, suffix = '') => `g:${m.id}:${action}${suffix}`;
    const b = (text: string, action: string) => ({ text, callback_data: data(action) });
    let caption: string;
    let rows: Markup['inline_keyboard'];
    let country = config.countries[0];
    if (m.phase === 'lobby') {
      caption = `Групповая игра • Лобби\n10 вопросов, 4 варианта, 30 секунд. Минимум два игрока.\n${[...m.players.values()].map((p) => p.name).join(', ')}\nНачать и остановить может создатель.`;
      rows = [
        [b('Вступить', 'join'), b('Выйти', 'leave')],
        [b('Начать', 'start'), b('Остановить', 'stop')],
      ];
    } else if (m.phase === 'playing') {
      const q = m.questions[m.round];
      country = q.countries[q.correctAnswerIndex];
      const active = [...m.players.values()].filter((p) => p.active);
      const answered = active.filter((p) => m.answers.has(p.id)).length;
      caption = `Вопрос ${m.round + 1}/10 — Как называется страна на флаге?\nОтветили: ${answered}/${active.length} • Осталось: ${Math.max(0, Math.ceil(((s.deadline ?? now() + 30_000) - now()) / 1000))} с\nНеактивных не ждём; вернуться могут только участники стартового состава.`;
      rows = q.countries.map((c, i) => [
        { text: c.name.ru, callback_data: data('answer', `:${m.round}:${i}`) },
      ]);
      rows.push([b('Выйти', 'leave'), b('Вернуться', 'join')], [b('Остановить', 'stop')]);
    } else {
      caption = `Игра завершена\nПравильно / Ошибки / Пропуски\n${[...m.players.values()].map((p) => `${p.name}: ${p.correct} / ${p.wrong} / ${p.skipped}`).join('\n')}\nНовая игра: /game`;
      rows = [];
    }
    return { caption, rows, country };
  }
  async function render(s: Session): Promise<void> {
    const { caption, rows, country } = view(s);
    const photo = await versionedFlagUrl(
      config.flagsUrl,
      join(config.flagsDirectory, 'bot'),
      country.flag[0],
    );
    if (disposed || sessions.get(s.chatId) !== s) return;
    const reply_markup = { inline_keyboard: rows };
    if (s.messageId === undefined) {
      const sent = await s.api.sendPhoto(s.chatId, photo, { caption, reply_markup });
      s.messageId = sent.message_id;
    } else {
      const edit = () =>
        photo !== s.photo
          ? s.api.editMessageMedia(
              s.chatId,
              s.messageId!,
              { type: 'photo', media: photo, caption },
              { reply_markup },
            )
          : s.api.editMessageCaption(s.chatId, s.messageId!, { caption, reply_markup });
      try {
        try {
          await edit();
        } catch (error) {
          if (/message is not modified/i.test(String(error))) return;
          if (/message to edit not found|message can't be edited/i.test(String(error))) throw error;
          // Retry edits only: sendPhoto is not idempotent after a lost response.
          if (disposed) return;
          await edit();
        }
      } catch (error) {
        if (/message is not modified/i.test(String(error))) return;
        if (!/message to edit not found|message can't be edited/i.test(String(error))) throw error;
        if (disposed) return;
        const sent = await s.api.sendPhoto(s.chatId, photo, { caption, reply_markup });
        s.messageId = sent.message_id;
      }
    }
    s.photo = photo;
  }
  function syncRound(s: Session): void {
    if (s.match.phase !== 'playing' || s.timedRound !== s.match.round) {
      s.cancel?.();
      s.cancel = undefined;
      s.deadline = undefined;
      s.timedRound = undefined;
    }
  }
  function arm(s: Session): void {
    s.cancel?.();
    s.cancel = undefined;
    if (disposed || s.match.phase !== 'playing') return;
    const round = s.match.round;
    const deadline = s.deadline;
    s.cancel = schedule(
      () => {
        if (
          disposed ||
          sessions.get(s.chatId) !== s ||
          s.match.phase !== 'playing' ||
          s.match.round !== round ||
          s.deadline !== deadline
        )
          return;
        // Timer and callback transitions run synchronously on the same event loop.
        if (deadline !== undefined && now() >= deadline) {
          s.match.expire(round);
          syncRound(s);
        }
        arm(s);
        void enqueue(s.chatId, () => update(s));
      },
      Math.min(5_000, Math.max(0, (deadline ?? now() + 5_000) - now())),
    );
  }
  async function update(s: Session): Promise<void> {
    if (disposed || sessions.get(s.chatId) !== s) return;
    syncRound(s);
    const phase = s.match.phase;
    const round = s.match.round;
    try {
      await render(s);
      if (disposed || sessions.get(s.chatId) !== s) return;
      if (
        phase === 'playing' &&
        s.match.phase === phase &&
        s.match.round === round &&
        s.timedRound !== round
      ) {
        s.timedRound = round;
        s.deadline = now() + 30_000;
      }
      if (phase === 'finished' && s.match.phase === phase) sessions.delete(s.chatId);
    } finally {
      arm(s);
    }
  }
  async function command(ctx: UniversalContext): Promise<void> {
    if (ctx.chatType !== 'group' && ctx.chatType !== 'supergroup') {
      void Promise.resolve()
        .then(() => ctx.reply('/game доступна только в группах и супергруппах.'))
        .catch(report);
      return;
    }
    void enqueue(ctx.peerId, async () => {
      let s = sessions.get(ctx.peerId);
      if (!s) {
        const profile = await ctx.getUserProfile();
        if (disposed) return;
        const name = profile?.firstName ?? `Игрок ${ctx.userId}`;
        s = {
          match: new GroupMatch(randomBytes(6).toString('hex'), ctx.userId, name, config.countries),
          api: ctx.platformApi as GameApi,
          chatId: ctx.peerId,
        };
        sessions.set(ctx.peerId, s);
      }
      await update(s);
    });
  }
  async function callback(ctx: GameCallback, data: string): Promise<void> {
    if (disposed) return;
    const receivedAt = now();
    if (!/^g:[a-f0-9]{12}:(?:(?:join|leave|start|stop)|answer:[0-9]:[0-3])(?![\s\S])/.test(data)) {
      acknowledge(ctx, 'Действие устарело');
      return;
    }
    const s = sessions.get(ctx.peerId);
    const parts = data.split(':');
    if (!s || parts[0] !== 'g' || parts[1] !== s.match.id) {
      acknowledge(ctx, 'Игра устарела');
      return;
    }
    const m = s.match;
    if (m.phase === 'playing' && s.deadline !== undefined && receivedAt >= s.deadline) {
      m.expire(m.round);
      syncRound(s);
    }
    let text = 'Действие устарело';
    switch (parts[2]) {
      case 'join':
        text = m.join(ctx.userId, ctx.name);
        break;
      case 'leave':
        text = m.leave(ctx.userId);
        break;
      case 'start':
        text = m.start(ctx.userId);
        break;
      case 'stop':
        text = m.stop(ctx.userId);
        break;
      case 'answer':
        text =
          Number(parts[3]) !== m.round || m.phase !== 'playing'
            ? 'Вопрос устарел'
            : s.timedRound === m.round && s.deadline !== undefined
              ? m.answer(ctx.userId, Number(parts[3]), Number(parts[4]))
              : 'Вопрос ещё не опубликован';
        break;
    }
    syncRound(s);
    arm(s);
    // State acceptance never waits for Telegram acknowledgement or rendering.
    acknowledge(ctx, text);
    void enqueue(s.chatId, () => update(s));
  }
  const acknowledgements = new Set<Promise<unknown>>();
  function acknowledge(ctx: GameCallback, text: string): void {
    const pending = Promise.resolve()
      .then(() => ctx.acknowledge(text))
      .catch(report);
    acknowledgements.add(pending);
    void pending.then(() => acknowledgements.delete(pending));
  }
  /** Wait for background effects in tests/shutdown, not in polling middleware. */
  async function flush(): Promise<void> {
    while (queues.size || acknowledgements.size) {
      await Promise.all([...queues.values(), ...acknowledgements]);
    }
  }
  function dispose(): void {
    disposed = true;
    for (const s of sessions.values()) s.cancel?.();
    sessions.clear();
  }
  return { command, callback, dispose, flush };
}
