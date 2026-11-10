import 'dotenv/config';
import { createUniversalTelegramBot } from '@verse-bot/telegram';
import { bold, doc, paragraph } from 'tg-rich-messages';
import { loadCountryCatalog } from './country-catalog.js';
import { createQuizHandlers } from './quiz-handlers.js';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');

const configuredMiniAppUrl = process.env.MINIAPP_URL;
if (!configuredMiniAppUrl) throw new Error('MINIAPP_URL is required');

const parsedMiniAppUrl = new URL(configuredMiniAppUrl);
if (parsedMiniAppUrl.protocol !== 'https:') throw new Error('MINIAPP_URL must use HTTPS');
const miniAppUrl = configuredMiniAppUrl.replace(/\/+$/, '');
const { askQuestion, handleCallback } = createQuizHandlers({
  countries: await loadCountryCatalog(),
  flagsUrl: `${miniAppUrl}/images/flags/bot/`,
  generatedFlagsUrl: `${miniAppUrl}/images/generated/`,
  flagsDirectory: process.env.FLAG_ASSETS_DIR ?? '/flags',
  generatedFlagsDirectory: process.env.GENERATED_FLAGS_DIR ?? '/generated',
});

const bot = createUniversalTelegramBot({
  token,
  commands: {
    start: async (ctx) => {
      await ctx.reply(
        doc(
          paragraph([bold('FlagConnect'), ' — викторина по флагам.']),
          paragraph('Используй /flags или /country, чтобы начать.'),
          paragraph('Mini App открывается через кнопку меню Telegram.'),
        ),
      );
    },
    flags: (ctx) => askQuestion(ctx, 'flag'),
    country: (ctx) => askQuestion(ctx, 'country'),
    help: async (ctx) =>
      ctx.reply('Команды: /flags — угадать страну по флагу; /country — угадать флаг по стране.'),
  },
  buttons: [
    { command: 'flags', label: '🌍 По флагу' },
    { command: 'country', label: '🏳️ По стране' },
  ],
  onCallback: async (ctx, data) => {
    // Verse acknowledges callbacks only after the handler returns.
    void handleCallback(ctx, data).catch((error: unknown) => {
      console.error('Flag callback failed:', error);
      void ctx
        .reply('Не удалось обработать ответ. Попробуй ещё раз или начни новый раунд.')
        .catch(console.error);
    });
  },
});

const api = bot.api;
await api.setMyCommands([
  { command: 'start', description: 'Запустить бота' },
  { command: 'flags', description: 'Угадать страну по флагу' },
  { command: 'country', description: 'Угадать флаг по стране' },
  { command: 'help', description: 'Справка' },
]);
await api.setChatMenuButton({
  menu_button: { type: 'web_app', text: 'FlagConnect', web_app: { url: miniAppUrl } },
});

await bot.start();
