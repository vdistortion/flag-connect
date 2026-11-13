import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import type { UniversalContext, UniversalKeyboardButton } from '@verse-bot/core';
import { createQuestion, type Country, type QuizQuestion } from '@flag-connect/flag-domain';
import { createNumberedFlagImage } from './country-flag-composite.js';
import { versionedFlagUrl } from './flag-asset-url.js';
import { createChatActions, type ChatActionApi, type ChatActionOptions } from './chat-action.js';
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

export interface QuizConfig extends ChatActionOptions {
  countries: readonly Country[];
  flagsUrl: string;
  generatedFlagsUrl: string;
  flagsDirectory: string;
  generatedFlagsDirectory: string;
}

export function createQuizHandlers(config: QuizConfig) {
  const chatActions = createChatActions(config);
  const { countries, flagsUrl, generatedFlagsUrl, flagsDirectory, generatedFlagsDirectory } =
    config;
  const COUNTRY_CHOICE_GROUP_SIZE = 2;
  const counts = new Map<string, number>();
  interface QuizRound {
    ownerId: string;
    peerId: number;
    mode: QuizMode;
    choiceCount: number;
    correctCountryIndex: number;
    countryIndexes: readonly number[];
    answered: boolean;
    advancing: boolean;
    advanced: boolean;
  }

  const rounds = new Map<string, QuizRound>();
  const pendingRounds = new Map<string, Promise<void>>();
  const countFor = (ctx: UniversalContext) => counts.get(ctx.userId) ?? 4;

  const inline = (label: string, callbackData: string): UniversalKeyboardButton => ({
    label,
    command: callbackData,
  });

  function richChoiceRows(roundId: string, indexes: number[]) {
    const buttons = indexes.map((countryIndex, choiceIndex) =>
      button(String(choiceIndex + 1), {
        type: 'callback_data',
        data: `answer:${roundId}:${countryIndex}`,
        style: 'primary',
      }),
    );

    return Array.from({ length: Math.ceil(buttons.length / 5) }, (_, row) =>
      buttonRow(buttons.slice(row * 5, row * 5 + 5)),
    );
  }

  function followUpButtons(mode: QuizMode, roundId: string) {
    return buttonRow([
      button('⚙️ Настройки', {
        type: 'callback_data',
        data: `settings:${roundId}`,
      }),
      button('Продолжить', { type: 'callback_data', data: `more:${roundId}` }),
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

    await api.sendRichMessage(
      ctx.peerId,
      message.toInputRichMessage({ skipEntityDetection: true }),
    );
  }

  async function askQuestion(
    ctx: UniversalContext,
    mode: QuizMode,
    onPublished?: () => void,
  ): Promise<void> {
    return chatActions.run(
      ctx.platformApi as ChatActionApi | undefined,
      ctx.peerId,
      mode === 'country' && countFor(ctx) === 1 ? 'typing' : 'upload_photo',
      () => prepareQuestion(ctx, mode, onPublished),
    );
  }

  async function prepareQuestion(
    ctx: UniversalContext,
    mode: QuizMode,
    onPublished?: () => void,
  ): Promise<void> {
    const count = countFor(ctx);
    const question = createQuestion(count, Math.random, countries);
    const correctCountry = question.countries[question.correctAnswerIndex];
    const correctCountryIndex = question.countryIndexes[question.correctAnswerIndex];
    const roundId = randomUUID();
    const profile = ctx.chatType === 'private' ? null : await ctx.getUserProfile();
    const ownerName = profile
      ? [profile.firstName, profile.lastName].filter(Boolean).join(' ')
      : undefined;
    const addressedPrompt =
      ctx.chatType === 'private'
        ? []
        : [paragraph(`Вопрос для ${ownerName || `участника ${ctx.userId}`}.`)];
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
            ...addressedPrompt,
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
        : [
            ...addressedPrompt,
            questionPrompt(),
            ...(hasChoices ? await countryChoiceBlocks(question, count) : []),
          ];
    const repeatedPrompt = mode === 'country' && hasChoices ? [questionPrompt()] : [];
    const trailingButtons = hasChoices
      ? richChoiceRows(roundId, question.countryIndexes)
      : [
          buttonRow([
            button('Показать ответ', {
              type: 'callback_data',
              data: `reveal:${roundId}`,
              style: 'primary',
            }),
          ]),
        ];

    if (rounds.size >= 5_000) {
      const oldestRoundId = rounds.keys().next().value;
      if (oldestRoundId) rounds.delete(oldestRoundId);
    }
    // The API can accept a message even if its response is lost. Keep the round
    // so buttons in an ambiguously delivered question remain usable.
    rounds.set(roundId, {
      ownerId: ctx.userId,
      peerId: ctx.peerId,
      mode,
      choiceCount: count,
      correctCountryIndex,
      countryIndexes: question.countryIndexes,
      answered: false,
      advancing: false,
      advanced: false,
    });
    onPublished?.();
    const delivery = replyRich(ctx, doc(...choices, ...repeatedPrompt, ...trailingButtons));
    pendingRounds.set(roundId, delivery);
    try {
      await delivery;
    } finally {
      pendingRounds.delete(roundId);
    }
  }

  async function showSettings(
    ctx: UniversalContext,
    mode: QuizMode,
    roundId: string,
  ): Promise<void> {
    const countsButtons = [
      ...Array.from({ length: 8 }, (_, index) =>
        inline(String(index + 2), `count:${roundId}:${index + 2}`),
      ),
      inline('Без вариантов', `count:${roundId}:1`),
      inline('10', `count:${roundId}:10`),
    ];

    await ctx.reply('Сколько должно быть вариантов ответа?', {
      inlineKeyboard: [countsButtons.slice(0, 8), countsButtons.slice(8)],
    });
  }

  async function handleCallback(ctx: UniversalContext, data: string): Promise<void> {
    const [action, ...parts] = data.split(':');
    const origin = rounds.get(parts[0]);
    if (origin && origin.peerId !== ctx.peerId) {
      await ctx.reply('Этот вопрос запущен в другом чате. Начни новый через /flags или /country.');
      return;
    }
    const pending = pendingRounds.get(parts[0]);
    if (pending) await pending.catch(() => {});
    const source = rounds.get(parts[0]);
    if (source && (source.advancing || source.advanced)) {
      await ctx.reply('Вопрос устарел. Начни новый раунд через /flags или /country.');
      return;
    }

    if (action === 'reveal') {
      const [roundId] = parts;
      const round = rounds.get(roundId);
      if (!round || round.choiceCount !== 1) {
        await ctx.reply('Вопрос устарел. Начни новый раунд через /flags или /country.');
        return;
      }
      if (round.ownerId !== ctx.userId) {
        await ctx.reply('Этот вопрос предназначен другому участнику.');
        return;
      }
      if (round.answered) {
        await ctx.reply('Раунд завершён. Начни новый через /flags или /country.');
        return;
      }

      round.answered = true;
      try {
        const country = countries[round.correctCountryIndex];
        const deliver = async () => {
          const answer =
            round.mode === 'flag'
              ? paragraph([bold('Ответ: '), country.name.ru])
              : photo(
                  await versionedFlagUrl(flagsUrl, join(flagsDirectory, 'bot'), country.flag[0]),
                  {
                    caption: `Правильный флаг страны ${country.name.ru}`,
                  },
                );
          await replyRich(ctx, doc(answer, followUpButtons(round.mode, roundId)));
        };
        if (round.mode === 'country') {
          await chatActions.run(
            ctx.platformApi as ChatActionApi | undefined,
            ctx.peerId,
            'upload_photo',
            deliver,
          );
        } else {
          await deliver();
        }
      } catch (error) {
        round.answered = false;
        throw error;
      }
      return;
    }

    if (action === 'answer') {
      const [roundId, chosenValue] = parts;
      const round = rounds.get(roundId);
      const chosen = Number(chosenValue);
      if (
        !round ||
        round.choiceCount === 1 ||
        !/^\d+$/.test(chosenValue ?? '') ||
        !Number.isInteger(chosen) ||
        !round.countryIndexes.includes(chosen)
      ) {
        await ctx.reply('Вопрос устарел. Начни новый раунд через /flags или /country.');
        return;
      }
      if (round.ownerId !== ctx.userId) {
        await ctx.reply('Этот вопрос предназначен другому участнику.');
        return;
      }
      if (round.answered) {
        await ctx.reply('Раунд завершён. Начни новый через /flags или /country.');
        return;
      }
      round.answered = true;

      const correctName = countries[round.correctCountryIndex].name.ru;
      const chosenName = countries[chosen].name.ru;
      const result =
        chosen === round.correctCountryIndex
          ? round.choiceCount === 1
            ? `Это ${correctName}`
            : `☑️ Правильно, это ${correctName}`
          : round.mode === 'flag'
            ? `Вы ответили ${chosenName}.\n❌ Неправильно, это ${correctName}`
            : '❌ Вы выбрали неверный флаг.';

      try {
        await replyRich(ctx, doc(paragraph(result), followUpButtons(round.mode, roundId)));
      } catch (error) {
        round.answered = false;
        throw error;
      }
      return;
    }

    if (action === 'more' || action === 'settings') {
      const [roundId] = parts;
      const round = rounds.get(roundId);
      if (!round) {
        await ctx.reply('Вопрос устарел. Начни новый раунд через /flags или /country.');
        return;
      }
      if (round.ownerId !== ctx.userId) {
        await ctx.reply('Эти кнопки предназначены участнику, запустившему раунд.');
        return;
      }

      if (action === 'more') await advanceRound(ctx, round);
      else await showSettings(ctx, round.mode, roundId);
      return;
    }

    if (action === 'count') {
      const [roundId, countValue] = parts;
      const round = rounds.get(roundId);
      if (!round || parts.length !== 2 || !/^(?:[1-9]|10)$/.test(countValue ?? '')) return;
      const count = Number(countValue);
      if (round.ownerId !== ctx.userId) {
        await ctx.reply('Эти настройки принадлежат участнику, запустившему раунд.');
        return;
      }

      await advanceRound(ctx, round, count);
      return;
    }

    await ctx.reply('Не удалось обработать нажатие. Начни новый раунд через /flags или /country.');
  }

  async function advanceRound(
    ctx: UniversalContext,
    round: QuizRound,
    count?: number,
  ): Promise<void> {
    round.advancing = true;
    if (count !== undefined) counts.set(ctx.userId, count);
    try {
      await askQuestion(ctx, round.mode, () => {
        // Once sending starts, a lost API response cannot safely reopen old controls.
        round.advanced = true;
      });
    } finally {
      round.advancing = false;
    }
  }

  return {
    askQuestion: (ctx: UniversalContext, mode: QuizMode) => askQuestion(ctx, mode),
    handleCallback,
    dispose: chatActions.dispose,
  };
}
