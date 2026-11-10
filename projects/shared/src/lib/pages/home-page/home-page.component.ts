import { NgOptimizedImage } from '@angular/common';
import { afterNextRender, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { createQuestion } from '@flag-connect/flag-domain';
import { CountryCatalogService, FLAG_CDN_BASE_URL } from '../../services/country-catalog.service';

import { QUIZ_MAIN_BUTTON, SHOW_HOME_SETTINGS } from '../../services/quiz-main-button';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent {
  private readonly catalog = inject(CountryCatalogService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly heroFlags = signal<readonly string[]>([]);
  protected readonly flagSlots = [0, 1, 2];

  constructor() {
    // Randomize only after hydration, not independently on server and client.
    afterNextRender(() => {
      this.catalog.countries.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (countries) => {
          if (countries.length < 3) return;
          this.heroFlags.set(
            createQuestion(3, Math.random, countries).countries.map(
              (country) => `${FLAG_CDN_BASE_URL}${encodeURIComponent(country.flag[0])}`,
            ),
          );
        },
        // Decoration must never block the home page when the CDN is unavailable.
        error: () => {},
      });
    });
  }

  private readonly configuredShowSettings = inject(SHOW_HOME_SETTINGS);
  private readonly mainButton = inject(QUIZ_MAIN_BUTTON, { optional: true });
  protected readonly showSettings = computed(
    () => this.configuredShowSettings || (this.mainButton !== null && !this.mainButton.available()),
  );
  protected readonly messages = inject(LanguageService).messages;
  protected readonly language = inject(LanguageService).language;
  protected readonly copy = computed(() =>
    this.language() === 'ru'
      ? {
          eyebrow: 'Мир начинается с любопытства',
          title: 'Откройте мир.',
          accent: 'Флаг за флагом.',
          intro: 'Учитесь узнавать страны без зубрёжки. Выберите режим и начните в своём темпе.',
          start: 'Начать тренировку',
          recommended: 'Начните здесь',
          country: 'Узнайте страну',
          countryHint: 'Один флаг. Несколько стран. Найдёте правильную?',
          flag: 'Найдите флаг',
          flagHint: 'Знакомое название — а какой у страны флаг?',
          explore: 'Исследуйте мир',
          exploreHint: 'Все страны в одном атласе с быстрым поиском.',
          modes: 'Ваш следующий шаг',
          keyboard: 'Удобно и без мыши',
          keyboardHint: 'Tab — навигация · 1–9 и 0 — ответ · Enter — далее',
          settingsHint: 'Количество ответов и режим самопроверки',
        }
      : {
          eyebrow: 'A little curiosity. A whole world.',
          title: 'Discover the world.',
          accent: 'One flag at a time.',
          intro:
            'Get to know countries without the cramming. Pick a mode and learn at your own pace.',
          start: 'Start practicing',
          recommended: 'A good place to start',
          country: 'Name the country',
          countryHint: 'One flag. A few countries. Can you find the match?',
          flag: 'Find the flag',
          flagHint: 'You know the country. Do you know its colours?',
          explore: 'Explore the atlas',
          exploreHint: 'Every country in one searchable collection.',
          modes: 'Choose your next discovery',
          keyboard: 'Made for your keyboard, too',
          keyboardHint: 'Tab to navigate · 1–9 and 0 to answer · Enter to continue',
          settingsHint: 'Answer options and self-study mode',
        },
  );
}
