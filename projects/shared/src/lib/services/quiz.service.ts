import { computed, DestroyRef, effect, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  private readonly catalogService = inject(CountryCatalogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly catalog = signal<readonly Country[]>([]);
  private pendingQuestion = false;
  readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  readonly usesTelegramMainButton = computed(() => this.mainButton?.available() ?? false);
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
    this.loadCatalog();
    effect(() => {
      this.language.messages();
      if (this.countries().length > 0) this.updateMainButton();
    });
  }

  retry(): void {
    if (this.status() !== 'error') return;
    this.loadCatalog();
  }

  private loadCatalog(): void {
    this.status.set('loading');
    this.catalogService.countries.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (countries) => {
        if (!Array.isArray(countries) || countries.length < this.count()) {
          this.status.set('error');
          return;
        }
        this.catalog.set(countries);
        this.status.set('ready');
        if (this.pendingQuestion) this.nextQuestion();
      },
      error: () => this.status.set('error'),
      complete: () => {
        if (this.status() === 'loading') this.status.set('error');
      },
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
    if (countryCatalog.length === 0) {
      this.pendingQuestion = true;
      return;
    }
    this.pendingQuestion = false;
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
