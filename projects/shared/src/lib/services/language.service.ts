import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  computed,
  DestroyRef,
  inject,
  Injectable,
  REQUEST,
  signal,
} from '@angular/core';

export type AppLanguage = 'ru' | 'en';

const MESSAGES = {
  ru: {
    pageTitle: 'FlagConnect — викторина по флагам',
    guessCountryByFlag: 'Угадать страну по флагу',
    identifyCountry: 'Какая это страна?',
    guessFlagByCountry: 'Угадать флаг по стране',
    allFlags: 'Все флаги',
    settings: 'Настройки',
    answerCount: 'Количество вариантов',
    answerCountLabel: 'Количество вариантов ответа',
    noChoices: 'Без вариантов',
    showAnswer: 'Показать ответ',
    countryFlagPrompt: 'Как выглядит флаг этой страны?',
    flagToIdentify: 'Флаг, который нужно угадать',
    flagOption: 'Вариант флага',
    correctAnswer: 'Верно. Правильный ответ.',
    incorrectAnswer: 'Неверно. Правильный ответ выделен.',
    next: 'Далее',
    chooseAnswer: 'Выберите ответ',
    showAnotherFlag: 'Показать другой вариант флага',
    selectFlag: 'Выбрать флаг',
    closeImage: 'Закрыть изображение',
    countryFlag: 'Флаг страны',
    close: 'Закрыть',
  },
  en: {
    pageTitle: 'FlagConnect — flag quiz',
    guessCountryByFlag: 'Guess the country by its flag',
    identifyCountry: 'Which country is it?',
    guessFlagByCountry: 'Guess the flag by its country',
    allFlags: 'All flags',
    settings: 'Settings',
    answerCount: 'Number of options',
    answerCountLabel: 'Number of answer options',
    noChoices: 'No answer choices',
    showAnswer: 'Show answer',
    countryFlagPrompt: "What does this country's flag look like?",
    flagToIdentify: 'Flag to identify',
    flagOption: 'Flag option',
    correctAnswer: 'Correct answer.',
    incorrectAnswer: 'Incorrect. The correct answer is highlighted.',
    next: 'Next',
    chooseAnswer: 'Choose an answer',
    showAnotherFlag: 'Show another version of the flag',
    selectFlag: 'Select flag',
    closeImage: 'Close image',
    countryFlag: 'Country flag',
    close: 'Close',
  },
} as const;

export function languageFromTag(tag: string | null | undefined): AppLanguage {
  return tag?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

export function languageFromAcceptLanguage(header: string | null): AppLanguage {
  if (!header) return 'en';

  const preferred = header
    .split(',')
    .map((entry, index) => {
      const [tag, ...parameters] = entry.trim().split(';');
      const qualityParameter = parameters.find((parameter) => parameter.trim().startsWith('q='));
      const quality = qualityParameter ? Number(qualityParameter.trim().slice(2)) : 1;
      return { tag, quality: Number.isFinite(quality) ? quality : 0, index };
    })
    .filter((entry) => entry.quality > 0)
    .sort((left, right) => right.quality - left.quality || left.index - right.index)[0];

  return languageFromTag(preferred?.tag);
}

interface TelegramWindow extends Window {
  Telegram?: {
    WebApp?: {
      initDataUnsafe?: {
        user?: {
          language_code?: string;
        };
      };
    };
  };
}

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly document = inject(DOCUMENT);
  private readonly request = inject(REQUEST, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  readonly language = signal(this.getInitialLanguage());
  readonly messages = computed(() => MESSAGES[this.language()]);

  constructor() {
    this.updateDocumentLanguage();

    afterNextRender(() => {
      const browserWindow = this.document.defaultView;
      if (!browserWindow) return;

      const syncLanguage = () => {
        const root = this.document.documentElement;
        const telegram = (browserWindow as TelegramWindow).Telegram?.WebApp;
        const telegramLanguage = root.classList.contains('telegram-miniapp')
          ? telegram?.initDataUnsafe?.user?.language_code
          : undefined;
        const browserLanguage =
          browserWindow.navigator.languages[0] ?? browserWindow.navigator.language;

        this.setLanguage(languageFromTag(telegramLanguage ?? browserLanguage));
      };

      syncLanguage();
      browserWindow.addEventListener('languagechange', syncLanguage);
      this.destroyRef.onDestroy(() =>
        browserWindow.removeEventListener('languagechange', syncLanguage),
      );
    });
  }

  private getInitialLanguage(): AppLanguage {
    if (this.request) {
      return languageFromAcceptLanguage(this.request.headers.get('accept-language'));
    }

    return languageFromTag(this.document.documentElement.lang);
  }

  private setLanguage(language: AppLanguage): void {
    if (this.language() === language) return;

    this.language.set(language);
    this.updateDocumentLanguage();
  }

  private updateDocumentLanguage(): void {
    const language = this.language();
    this.document.documentElement.lang = language;
    this.document.title = MESSAGES[language].pageTitle;
    this.document.documentElement.classList.remove('locale-pending');
  }
}
