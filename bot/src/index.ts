import 'dotenv/config';
import { createUniversalTelegramBot } from '@verse-bot/telegram';
import type { UniversalContext, UniversalKeyboardButton } from '@verse-bot/core';
import { countries, createQuestion } from '@flag-connect/flag-domain';
import { bold, doc, paragraph } from 'tg-rich-messages';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');

const configuredMiniAppUrl = process.env.MINIAPP_URL;
if (!configuredMiniAppUrl) throw new Error('MINIAPP_URL is required');

const parsedMiniAppUrl = new URL(configuredMiniAppUrl);
if (parsedMiniAppUrl.protocol !== 'https:') throw new Error('MINIAPP_URL must use HTTPS');
const miniAppUrl = configuredMiniAppUrl.replace(/\/+$/, '');
const flagsUrl = `${miniAppUrl}/images/flags/`;
const counts = new Map<string, number>();
const countFor = (ctx: UniversalContext) => counts.get(ctx.userId) ?? 4;

const inline = (label: string, callbackData: string): UniversalKeyboardButton => ({
  label,
  command: callbackData,
});

async function askFlag(ctx: UniversalContext) {
  const count = countFor(ctx);
  const question = createQuestion(count);
  const correct = question.countries[question.correctAnswerIndex];
  const options = question.countries.map((country, index) => ({
    label: count === 1 ? 'Показать ответ' : country.name.ru,
    command: `answer:${question.countryIndexes[index]}:${question.countryIndexes[question.correctAnswerIndex]}:${count}`,
  }));

  if (!ctx.replyWithPhoto) throw new Error('Telegram photo replies are unavailable');
  await ctx.replyWithPhoto(
    `${flagsUrl}${encodeURIComponent(correct.flag[0])}`,
    'Какая это страна?',
    {
      inlineKeyboard: [options.slice(0, 5), options.slice(5)].filter((row) => row.length > 0),
    },
  );
}

async function handleCallback(ctx: UniversalContext, data: string) {
  const [action, a, b, c] = data.split(':');
  if (action === 'answer') {
    const chosen = Number(a);
    const answer = Number(b);
    const count = Number(c);
    if (
      !Number.isInteger(chosen) ||
      !countries[chosen] ||
      !Number.isInteger(answer) ||
      !countries[answer]
    ) {
      await ctx.reply('Вопрос устарел. Запусти новый раунд через /flags.');
      return;
    }

    const correctName = countries[answer].name.ru;
    const chosenName = countries[chosen].name.ru;
    const result =
      chosen === answer
        ? count === 1
          ? `Это ${correctName}`
          : `☑️ Правильно, это ${correctName}`
        : `Вы ответили ${chosenName}.\n❌ Неправильно, это ${correctName}`;
    await ctx.reply(doc(paragraph(result)), {
      inlineKeyboard: [[inline('⚙️ Настройки', 'settings'), inline('Продолжить', 'more')]],
    });
    return;
  }

  if (action === 'more') {
    await askFlag(ctx);
    return;
  }

  if (action === 'settings') {
    const buttons = Array.from({ length: 9 }, (_, index) =>
      inline(String(index + 2), `count:${index + 2}`),
    );
    buttons.push(inline('Без вариантов (1)', 'count:1'), inline('10', 'count:10'));
    await ctx.reply('Сколько должно быть вариантов ответа?', {
      inlineKeyboard: [buttons.slice(0, 9), buttons.slice(9)],
    });
    return;
  }

  if (action === 'count') {
    const count = Number(a);
    if (!Number.isInteger(count) || count < 1 || count > 10) return;
    counts.set(ctx.userId, count);
    await askFlag(ctx);
    return;
  }

  await ctx.reply('Не удалось обработать нажатие. Начни новый раунд: /flags.');
}

const bot = createUniversalTelegramBot({
  token,
  commands: {
    start: async (ctx) => {
      await ctx.reply(
        doc(
          paragraph([bold('FlagConnect'), ' — викторина по флагам.']),
          paragraph(
            'Используй /flags, чтобы начать. Mini App открывается через кнопку меню Telegram.',
          ),
        ),
      );
    },
    flags: askFlag,
    help: async (ctx) =>
      ctx.reply('Команды: /start — приветствие, /flags — угадать флаг, /help — справка.'),
  },
  buttons: [{ command: 'flags', label: '🌍 Флаги' }],
  onCallback: async (ctx, data) => {
    // Verse's published adapter acknowledges callbacks after this handler returns.
    // Run network operations in the background so Telegram stops showing the spinner promptly.
    void handleCallback(ctx, data).catch((error: unknown) => {
      console.error('Flag callback failed:', error);
      void ctx
        .reply('Не удалось обработать ответ. Попробуй ещё раз или начни /flags.')
        .catch(console.error);
    });
  },
});

const api = bot.api;
await api.setMyCommands([
  { command: 'start', description: 'Запустить бота' },
  { command: 'flags', description: 'Угадать флаг' },
  { command: 'help', description: 'Справка' },
]);
await api.setChatMenuButton({
  menu_button: { type: 'web_app', text: 'FlagConnect', web_app: { url: miniAppUrl } },
});

await bot.start();
