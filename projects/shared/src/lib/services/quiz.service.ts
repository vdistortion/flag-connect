import { computed, effect, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { createQuestion, type Country } from '@flag-connect/flag-domain';
import { QUIZ_SETTINGS, SettingsService } from './settings.service';
import { QUIZ_MAIN_BUTTON } from './quiz-main-button';
import { LanguageService } from './language.service';
import { CountryCatalogService } from './country-catalog.service';

@Injectable({
  providedIn: 'root',
})
export class QuizService implements OnDestroy {
  private readonly settings = inject(SettingsService);
  private readonly mainButton = inject(QUIZ_MAIN_BUTTON, { optional: true });
  private readonly language = inject(LanguageService);
  private readonly catalog = toSignal(inject(CountryCatalogService).countries, {
    initialValue: [] as readonly Country[],
  });
  readonly usesTelegramMainButton = this.mainButton !== null;
  readonly count = computed(() =>
    this.settings.noChoices() ? QUIZ_SETTINGS.noChoicesCount : this.settings.count(),
  );
  readonly noChoices = computed(() => this.settings.noChoices());
  readonly countries = signal<readonly Country[]>([]);
  readonly correctAnswerIndex = signal(-1);
  readonly answerIndex = signal(-1);
  readonly answerRevealed = signal(false);
  readonly hasAnswered = computed(() =>
    this.noChoices() ? this.answerRevealed() : this.answerIndex() >= 0,
  );
  readonly correctCountry = computed(() => this.countries()[this.correctAnswerIndex()] ?? null);

  constructor() {
    effect(() => {
      this.language.messages();
      if (this.countries().length > 0) this.updateMainButton();
    });
  }

  selectAnswer(index: number): void {
    if (this.noChoices() || this.hasAnswered() || index < 0 || index >= this.countries().length) {
      return;
    }
    this.answerIndex.set(index);
    this.updateMainButton();
  }

  revealAnswer(): void {
    if (!this.noChoices() || this.answerRevealed()) return;
    this.answerRevealed.set(true);
    this.updateMainButton();
  }

  nextQuestion(): void {
    const countryCatalog = this.catalog();
    if (countryCatalog.length === 0) return;
    const question = createQuestion(this.count(), Math.random, countryCatalog);
    this.countries.set(question.countries);
    this.correctAnswerIndex.set(question.correctAnswerIndex);
    this.answerIndex.set(-1);
    this.answerRevealed.set(false);
    this.updateMainButton();
  }

  private updateMainButton(): void {
    const noChoices = this.noChoices();
    const answered = this.hasAnswered();
    const messages = this.language.messages();

    if (noChoices && !answered) {
      this.mainButton?.set(messages.showAnswer, true, () => this.revealAnswer());
      return;
    }

    this.mainButton?.set(answered ? messages.next : messages.chooseAnswer, answered, () => {
      if (answered) this.nextQuestion();
    });
  }

  ngOnDestroy(): void {
    this.mainButton?.hide();
  }
}
