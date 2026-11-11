import { computed, DestroyRef, effect, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { createQuestion, type Country } from '@flag-connect/flag-domain';
import { QUIZ_SETTINGS, SettingsService, type SessionMode } from './settings.service';
import { QUIZ_MAIN_BUTTON } from './quiz-main-button';
import { LanguageService } from './language.service';
import { CountryCatalogService } from './country-catalog.service';

interface QuizPrimaryAction {
  readonly kind: 'choose' | 'reveal' | 'next' | 'results' | 'restart';
  readonly text: string;
  readonly enabled: boolean;
}

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
  private targetDeck: Country[] = [];
  private readonly sessionModeState = signal<SessionMode>(this.settings.sessionMode());
  private readonly roundLengthState = signal(this.settings.roundLength());
  private readonly completedState = signal(false);
  private readonly resultsState = signal<readonly { country: Country; correct: boolean | null }[]>(
    [],
  );
  readonly sessionMode = this.sessionModeState.asReadonly();
  readonly roundLength = this.roundLengthState.asReadonly();
  readonly completed = this.completedState.asReadonly();
  readonly results = this.resultsState.asReadonly();
  private readonly score = signal({ correct: 0, incorrect: 0, revealed: 0 });
  readonly correctCount = computed(() => this.score().correct);
  readonly incorrectCount = computed(() => this.score().incorrect);
  readonly revealedCount = computed(() => this.score().revealed);
  private readonly answeredCount = computed(
    () => this.correctCount() + this.incorrectCount() + this.revealedCount(),
  );
  readonly questionNumber = computed(() =>
    this.countries().length ? this.answeredCount() + (this.hasAnswered() ? 0 : 1) : 0,
  );
  private readonly statusState = signal<'loading' | 'ready' | 'error'>('loading');
  readonly status = this.statusState.asReadonly();
  readonly usesTelegramMainButton = computed(() => this.mainButton?.available() ?? false);
  private readonly sessionStarted = signal(false);
  private readonly choiceSettings = signal({
    count: this.settings.count(),
    noChoices: this.settings.noChoices(),
  });
  // Choice and session settings are frozen from the first request until restart.
  readonly count = computed(() => {
    const choices = this.sessionStarted()
      ? this.choiceSettings()
      : { count: this.settings.count(), noChoices: this.settings.noChoices() };
    return choices.noChoices ? QUIZ_SETTINGS.noChoicesCount : choices.count;
  });
  readonly noChoices = computed(() =>
    this.sessionStarted() ? this.choiceSettings().noChoices : this.settings.noChoices(),
  );
  private readonly countriesState = signal<readonly Country[]>([]);
  private readonly correctAnswerIndexState = signal(-1);
  private readonly answerIndexState = signal(-1);
  private readonly answerRevealedState = signal(false);
  readonly countries = this.countriesState.asReadonly();
  readonly correctAnswerIndex = this.correctAnswerIndexState.asReadonly();
  readonly answerIndex = this.answerIndexState.asReadonly();
  readonly answerRevealed = this.answerRevealedState.asReadonly();
  readonly hasAnswered = computed(() =>
    this.noChoices() ? this.answerRevealed() : this.answerIndex() >= 0,
  );
  readonly correctCountry = computed(() => this.countries()[this.correctAnswerIndex()] ?? null);
  readonly primaryAction = computed<QuizPrimaryAction>(() => {
    const messages = this.language.messages();
    if (this.completed()) {
      return { kind: 'restart', text: messages.playAgain, enabled: true };
    }
    if (this.noChoices() && !this.hasAnswered()) {
      return { kind: 'reveal', text: messages.showAnswer, enabled: !!this.correctCountry() };
    }
    if (!this.hasAnswered()) {
      return { kind: 'choose', text: messages.chooseAnswer, enabled: false };
    }
    const finalAnswer =
      this.sessionMode() === 'round' && this.answeredCount() >= this.roundLength();
    return {
      kind: finalAnswer ? 'results' : 'next',
      text: finalAnswer ? messages.results : messages.next,
      enabled: true,
    };
  });

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
    this.statusState.set('loading');
    this.catalogService.countries.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (countries) => {
        if (!Array.isArray(countries) || countries.length < this.count()) {
          this.statusState.set('error');
          return;
        }
        this.catalog.set(countries);
        this.statusState.set('ready');
        if (this.pendingQuestion) this.nextQuestion();
      },
      error: () => this.statusState.set('error'),
      complete: () => {
        if (this.status() === 'loading') this.statusState.set('error');
      },
    });
  }

  selectAnswer(index: number): void {
    if (
      this.completed() ||
      this.noChoices() ||
      this.hasAnswered() ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= this.countries().length
    ) {
      return;
    }
    this.answerIndexState.set(index);
    const country = this.correctCountry()!;
    this.recordAnswer(country, index === this.correctAnswerIndex());
    this.updateMainButton();
  }

  revealAnswer(): void {
    if (this.completed() || !this.correctCountry() || !this.noChoices() || this.answerRevealed())
      return;
    this.answerRevealedState.set(true);
    const country = this.correctCountry()!;
    this.recordAnswer(country, null);
    this.updateMainButton();
  }

  private recordAnswer(country: Country, correct: boolean | null): void {
    const key = correct === null ? 'revealed' : correct ? 'correct' : 'incorrect';
    this.score.update((score) => ({ ...score, [key]: score[key] + 1 }));
    // Zen retains aggregate scores, not an ever-growing per-question history.
    if (this.sessionMode() === 'round') {
      this.resultsState.update((results) => [...results, { country, correct }]);
    }
  }

  restart(): void {
    this.startSession();
  }

  repeatMistakes(): void {
    if (!this.completed()) return;
    const mistakes = [
      ...new Map(
        this.results()
          .filter((result) => result.correct === false)
          .map((result) => [result.country.code, result.country]),
      ).values(),
    ];
    if (mistakes.length === 0) return;
    this.startSession(mistakes);
  }

  private startSession(targets?: readonly Country[]): void {
    this.snapshotSettings();
    if (targets) {
      this.sessionModeState.set('round');
      this.roundLengthState.set(targets.length);
    }
    this.targetDeck = targets ? [...targets] : [];
    this.completedState.set(false);
    this.resultsState.set([]);
    this.score.set({ correct: 0, incorrect: 0, revealed: 0 });
    this.countriesState.set([]);
    this.correctAnswerIndexState.set(-1);
    this.answerIndexState.set(-1);
    this.answerRevealedState.set(false);
    this.nextQuestion();
  }

  private snapshotSettings(): void {
    this.sessionModeState.set(this.settings.sessionMode());
    this.roundLengthState.set(this.settings.roundLength());
    this.choiceSettings.set({ count: this.settings.count(), noChoices: this.settings.noChoices() });
    this.sessionStarted.set(true);
  }

  nextQuestion(): void {
    if (!this.sessionStarted()) this.snapshotSettings();
    if (this.completed() || (this.countries().length > 0 && !this.hasAnswered())) return;
    if (this.sessionMode() === 'round' && this.answeredCount() >= this.roundLength()) {
      this.completedState.set(true);
      this.updateMainButton();
      return;
    }
    const countryCatalog = this.catalog();
    if (countryCatalog.length === 0) {
      this.pendingQuestion = true;
      return;
    }
    this.pendingQuestion = false;
    if (this.sessionMode() === 'round') {
      this.roundLengthState.set(Math.min(this.roundLength(), countryCatalog.length));
    }
    // Refill iteratively: zen never accumulates decks or recurses.
    if (this.targetDeck.length === 0) this.targetDeck = [...countryCatalog];
    const targetIndex = Math.floor(Math.random() * this.targetDeck.length);
    const [target] = this.targetDeck.splice(targetIndex, 1);
    const question = createQuestion(this.count(), Math.random, countryCatalog, target.code);
    this.countriesState.set(question.countries);
    this.correctAnswerIndexState.set(question.correctAnswerIndex);
    this.answerIndexState.set(-1);
    this.answerRevealedState.set(false);
    this.updateMainButton();
  }

  private mainButtonVersion = 0;

  activatePrimaryAction(): void {
    const action = this.primaryAction();
    if (!action.enabled || this.status() !== 'ready') return;
    switch (action.kind) {
      case 'restart':
        this.restart();
        break;
      case 'reveal':
        this.revealAnswer();
        break;
      case 'next':
      case 'results':
        this.nextQuestion();
    }
  }

  private updateMainButton(): void {
    const version = ++this.mainButtonVersion;
    const action = this.primaryAction();
    this.mainButton?.set(action.text, action.enabled, () => {
      if (version === this.mainButtonVersion) this.activatePrimaryAction();
    });
  }

  ngOnDestroy(): void {
    this.mainButtonVersion++;
    this.mainButton?.hide();
  }
}
