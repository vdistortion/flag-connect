import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService, QUIZ_MAIN_BUTTON, SHOW_HOME_SETTINGS } from 'shared';

const COPY = {
  en: {
    title: 'Choose a quiz',
    subtitle: 'A little practice. A wider world.',
    country: 'Guess the country',
    countryHint: 'Look at the flag · name the country',
    flag: 'Find the flag',
    flagHint: 'Read the country · pick its flag',
    catalog: 'All flags',
    catalogHint: 'Explore the collection',
    settings: 'Settings',
    settingsHint: 'Session and answer options',
    menu: 'Quiz and learning',
  },
  ru: {
    title: 'Выберите викторину',
    subtitle: 'Немного практики — целый мир открытий.',
    country: 'Угадать страну',
    countryHint: 'Посмотрите на флаг · назовите страну',
    flag: 'Найти флаг',
    flagHint: 'Прочитайте название · выберите флаг',
    catalog: 'Все флаги',
    catalogHint: 'Изучите коллекцию',
    settings: 'Настройки',
    settingsHint: 'Режим игры и варианты ответа',
    menu: 'Викторина и обучение',
  },
} as const;

@Component({
  selector: 'app-miniapp-home',
  imports: [RouterLink],
  template: `
    <section class="miniapp-home wrapper" aria-labelledby="miniapp-home-title">
      <p class="miniapp-wordmark">FlagConnect</p>
      <h1 id="miniapp-home-title">{{ copy().title }}</h1>
      <p class="miniapp-home-intro">{{ copy().subtitle }}</p>
      <nav class="miniapp-menu" [attr.aria-label]="copy().menu">
        <a routerLink="/quiz/flag" class="miniapp-menu-item miniapp-menu-item--play">
          <span class="miniapp-menu-icon" aria-hidden="true">⚑</span>
          <span
            ><strong>{{ copy().country }}</strong
            ><small>{{ copy().countryHint }}</small></span
          >
          <span class="miniapp-chevron" aria-hidden="true">›</span>
        </a>
        <a routerLink="/quiz/country" class="miniapp-menu-item miniapp-menu-item--play">
          <span class="miniapp-menu-icon" aria-hidden="true">◎</span>
          <span
            ><strong>{{ copy().flag }}</strong
            ><small>{{ copy().flagHint }}</small></span
          >
          <span class="miniapp-chevron" aria-hidden="true">›</span>
        </a>
        <a routerLink="/list" class="miniapp-menu-item">
          <span class="miniapp-menu-icon" aria-hidden="true">▦</span>
          <span
            ><strong>{{ copy().catalog }}</strong
            ><small>{{ copy().catalogHint }}</small></span
          >
          <span class="miniapp-chevron" aria-hidden="true">›</span>
        </a>
        @if (showSettings()) {
          <a routerLink="/settings" class="miniapp-menu-item">
            <span class="miniapp-menu-icon" aria-hidden="true">⚙</span>
            <span
              ><strong>{{ copy().settings }}</strong
              ><small>{{ copy().settingsHint }}</small></span
            >
            <span class="miniapp-chevron" aria-hidden="true">›</span>
          </a>
        }
      </nav>
    </section>
  `,
})
export class MiniappHomeComponent {
  private readonly configuredShowSettings = inject(SHOW_HOME_SETTINGS);
  private readonly mainButton = inject(QUIZ_MAIN_BUTTON, { optional: true });
  protected readonly showSettings = computed(
    () => this.configuredShowSettings || (this.mainButton !== null && !this.mainButton.available()),
  );
  private readonly languageService = inject(LanguageService);
  protected readonly copy = computed(() => COPY[this.languageService.language()]);
}
