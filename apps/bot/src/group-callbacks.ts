import { createUniversalTelegramBot } from '@verse-bot/telegram';
import type { createGroupGame } from './group-game.js';

type TelegramBot = ReturnType<typeof createUniversalTelegramBot>;
/** Group callbacks require the raw callback ID absent from UniversalContext. */
export function installGroupCallbacks(
  bot: TelegramBot,
  game: ReturnType<typeof createGroupGame>,
): void {
  // Verse consumes callbacks and acknowledges without text in its finally block.
  // Prepend narrowly-scoped middleware instead of invoking that route twice.
  const original = bot.middleware();
  bot.middleware = () => async (ctx, next) => {
    const query = ctx.callbackQuery;
    if (!query?.data?.startsWith('g:')) return original(ctx, next);
    const chat = query.message?.chat;
    if (!chat || (chat.type !== 'group' && chat.type !== 'supergroup')) {
      void ctx
        .answerCallbackQuery({ text: 'Игра доступна только в группе', show_alert: false })
        .catch((error: unknown) => console.error('Group callback failed:', error));
      return;
    }
    void game
      .callback(
        {
          userId: String(query.from.id),
          peerId: chat.id,
          name: [query.from.first_name, query.from.last_name].filter(Boolean).join(' '),
          acknowledge: (text) => ctx.answerCallbackQuery({ text, show_alert: false }),
        },
        query.data,
      )
      .catch((error: unknown) => console.error('Group callback failed:', error));
  };
}
