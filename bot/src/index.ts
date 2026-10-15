import 'dotenv/config';
import { join } from 'node:path';
import { createUniversalTelegramBot } from '@verse-bot/telegram';
import type { UniversalContext, UniversalKeyboardButton } from '@verse-bot/core';
import { countries, createQuestion, type QuizQuestion } from '@flag-connect/flag-domain';
import { createNumberedFlagImage } from './country-flag-composite.js';
import { versionedFlagUrl } from './flag-asset-url.js';
import {
  bold,
  button,
  buttonRow,
  type BlockNode,
  doc,
  list,
  paragraph,
  photo,
  type InputRichMessage,
  type RichDocument,
} from 'tg-rich-messages';

type QuizMode = 'flag' | 'country';

interface TelegramRichApi {
  sendRichMessage(chatId: number, message: InputRichMessage): Promise<unknown>;
}

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');

const configuredMiniAppUrl = process.env.MINIAPP_URL;
if (!configuredMiniAppUrl) throw new Error('MINIAPP_URL is required');

const parsedMiniAppUrl = new URL(configuredMiniAppUrl);
if (parsedMiniAppUrl.protocol !== 'https:') throw new Error('MINIAPP_URL must use HTTPS');
const miniAppUrl = configuredMiniAppUrl.replace(/\/+$/, '');
const flagsUrl = `${miniAppUrl}/images/flags/bot/`;
const generatedFlagsUrl = `${miniAppUrl}/images/generated/`;
const flagsDirectory = process.env.FLAG_ASSETS_DIR ?? '/flags';
const generatedFlagsDirectory = process.env.GENERATED_FLAGS_DIR ?? '/generated';
const COUNTRY_CHOICE_GROUP_SIZE = 2;
const counts = new Map<string, number>();
const countFor = (ctx: UniversalContext) => counts.get(ctx.userId) ?? 4;

const inline = (label: string, callbackData: string): UniversalKeyboardButton => ({
  label,
  command: callbackData,
});

function isQuizMode(value: string | undefined): value is QuizMode {
  return value === 'flag' || value === 'country';
}

function richChoiceRows(mode: QuizMode, indexes: number[], correctIndex: number, count: number) {
  const buttons = indexes.map((countryIndex, choiceIndex) =>
    button(String(choiceIndex + 1), {
      type: 'callback_data',
      data: `answer:${mode}:${countryIndex}:${correctIndex}:${count}`,
      style: 'primary',
    }),
  );

  return Array.from({ length: Math.ceil(buttons.length / 5) }, (_, row) =>
    buttonRow(buttons.slice(row * 5, row * 5 + 5)),
  );
}

function followUpButtons(mode: QuizMode) {
  return buttonRow([
    button('⚙️ Настройки', {
      type: 'callback_data',
      data: `settings:${mode}`,
    }),
    button('Продолжить', { type: 'callback_data', data: `more:${mode}` }),
  ]);
}

async function countryChoiceBlocks(question: QuizQuestion, count: number): Promise<BlockNode[]> {
  const blocks: BlockNode[] = [];

  for (let offset = 0; offset < count; offset += COUNTRY_CHOICE_GROUP_SIZE) {
    const indexes = question.countryIndexes.slice(offset, offset + COUNTRY_CHOICE_GROUP_SIZE);
    const firstNumber = offset + 1;
    const numberedFlags = indexes.map((index, itemIndex) => ({
      code: countries[index].code,
      filename: countries[index].flag[0],
      number: firstNumber + itemIndex,
    }));
    const compositeFilename = await createNumberedFlagImage(
      numberedFlags,
      join(flagsDirectory, 'bot'),
      generatedFlagsDirectory,
    );
    blocks.push(photo(`${generatedFlagsUrl}${encodeURIComponent(compositeFilename)}`));
  }

  return blocks;
}

async function replyRich(ctx: UniversalContext, message: RichDocument): Promise<void> {
  const api = ctx.platformApi as TelegramRichApi | undefined;
  if (!api || typeof api.sendRichMessage !== 'function') {
    throw new Error('Telegram Rich Messages API is unavailable');
  }

  await api.sendRichMessage(ctx.peerId, message.toInputRichMessage({ skipEntityDetection: true }));
}

async function askQuestion(ctx: UniversalContext, mode: QuizMode): Promise<void> {
  const count = countFor(ctx);
  const question = createQuestion(count);
  const correctCountry = question.countries[question.correctAnswerIndex];
  const correctCountryIndex = question.countryIndexes[question.correctAnswerIndex];
  const hasChoices = count > 1;
  const questionPrompt = () =>
    paragraph(
      hasChoices
        ? [bold('Найди флаг страны: '), correctCountry.name.ru]
        : bold(`Как выглядит флаг страны «${correctCountry.name.ru}»?`),
    );
  const choices =
    mode === 'flag'
      ? [
          photo(
            await versionedFlagUrl(flagsUrl, join(flagsDirectory, 'bot'), correctCountry.flag[0]),
            {
              caption: 'Как называется страна на флаге?',
            },
          ),
          ...(hasChoices
            ? [
                list(
                  question.countries.map((country) => country.name.ru),
                  { ordered: true },
                ),
              ]
            : []),
        ]
      : [questionPrompt(), ...(hasChoices ? await countryChoiceBlocks(question, count) : [])];
  const repeatedPrompt = mode === 'country' && hasChoices ? [questionPrompt()] : [];
  const trailingButtons = hasChoices
    ? richChoiceRows(mode, question.countryIndexes, correctCountryIndex, count)
    : [
        buttonRow([
          button('Показать ответ', {
            type: 'callback_data',
            data: `reveal:${mode}:${correctCountryIndex}`,
            style: 'primary',
          }),
        ]),
      ];

  await replyRich(ctx, doc(...choices, ...repeatedPrompt, ...trailingButtons));
}

async function showSettings(ctx: UniversalContext, mode: QuizMode): Promise<void> {
  const countsButtons = [
    ...Array.from({ length: 9 }, (_, index) =>
      inline(String(index + 2), `count:${mode}:${index + 2}`),
    ),
    inline('Без вариантов', `count:${mode}:1`),
    inline('10', `count:${mode}:10`),
  ];

  await ctx.reply('Сколько должно быть вариантов ответа?', {
    inlineKeyboard: [countsButtons.slice(0, 9), countsButtons.slice(9)],
  });
}

async function handleCallback(ctx: UniversalContext, data: string): Promise<void> {
  const [action, ...parts] = data.split(':');

  if (action === 'reveal') {
    const [modeValue, countryIndexValue] = parts;
    const mode = isQuizMode(modeValue) ? modeValue : undefined;
    const countryIndex = Number(countryIndexValue);
    if (!mode || !Number.isInteger(countryIndex) || !countries[countryIndex]) {
      await ctx.reply('Вопрос устарел. Начни новый раунд через /flags или /country.');
      return;
    }

    const country = countries[countryIndex];
    const answer =
      mode === 'flag'
        ? paragraph([bold('Ответ: '), country.name.ru])
        : photo(await versionedFlagUrl(flagsUrl, join(flagsDirectory, 'bot'), country.flag[0]), {
            caption: `Правильный флаг страны ${country.name.ru}`,
          });
    await replyRich(ctx, doc(answer, followUpButtons(mode)));
    return;
  }

  if (action === 'answer') {
    const [modeValue, chosenValue, correctValue, countValue] = parts;
    const mode = isQuizMode(modeValue) ? modeValue : undefined;
    const chosen = Number(chosenValue);
    const correct = Number(correctValue);
    const count = Number(countValue);
    if (
      !mode ||
      !Number.isInteger(chosen) ||
      !countries[chosen] ||
      !Number.isInteger(correct) ||
      !countries[correct] ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > 10
    ) {
      await ctx.reply('Вопрос устарел. Начни новый раунд через /flags или /country.');
      return;
    }

    const correctName = countries[correct].name.ru;
    const chosenName = countries[chosen].name.ru;
    const result =
      chosen === correct
        ? count === 1
          ? `Это ${correctName}`
          : `☑️ Правильно, это ${correctName}`
        : mode === 'flag'
          ? `Вы ответили ${chosenName}.\n❌ Неправильно, это ${correctName}`
          : '❌ Вы выбрали неверный флаг.';

    await replyRich(ctx, doc(paragraph(result), followUpButtons(mode)));
    return;
  }

  if (action === 'more' || action === 'settings') {
    const mode = isQuizMode(parts[0]) ? parts[0] : undefined;
    if (!mode) {
      await ctx.reply('Вопрос устарел. Начни новый раунд через /flags или /country.');
      return;
    }

    if (action === 'more') await askQuestion(ctx, mode);
    else await showSettings(ctx, mode);
    return;
  }

  if (action === 'count') {
    const [modeValue, countValue] = parts;
    const mode = isQuizMode(modeValue) ? modeValue : undefined;
    const count = Number(countValue);
    if (!mode || !Number.isInteger(count) || count < 1 || count > 10) return;

    counts.set(ctx.userId, count);
    await askQuestion(ctx, mode);
    return;
  }

  await ctx.reply('Не удалось обработать нажатие. Начни новый раунд через /flags или /country.');
}

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
    // The published Verse adapter acknowledges callbacks after this handler returns.
    // Send the rich-message response in the background to stop Telegram's spinner promptly.
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
