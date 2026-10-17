import { computed, effect, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { createQuestion, type Country } from '@flag-connect/flag-domain';
import { SettingsService } from './settings.service';
import { QUIZ_MAIN_BUTTON } from './quiz-main-button';
import { LanguageService } from './language.service';

@Injectable({
  providedIn: 'root',
})
export class QuizService implements OnDestroy {
  private readonly settings = inject(SettingsService);
  private readonly mainButton = inject(QUIZ_MAIN_BUTTON, { optional: true });
  private readonly language = inject(LanguageService);
  readonly usesTelegramMainButton = this.mainButton !== null;
  readonly count = computed(() => this.settings.count());
  readonly countries = signal<readonly Country[]>([]);
  readonly correctAnswerIndex = signal(-1);
  readonly answerIndex = signal(-1);
  readonly hasAnswered = computed(() => this.answerIndex() >= 0);
  readonly correctCountry = computed(() => this.countries()[this.correctAnswerIndex()] ?? null);

  constructor() {
    effect(() => {
      this.language.messages();
      if (this.countries().length > 0) this.updateMainButton();
    });
  }

  selectAnswer(index: number): void {
    if (this.hasAnswered() || index < 0 || index >= this.countries().length) return;
    this.answerIndex.set(index);
    this.updateMainButton();
  }

  nextQuestion(): void {
    const question = createQuestion(this.count());
    this.countries.set(question.countries);
    this.correctAnswerIndex.set(question.correctAnswerIndex);
    this.answerIndex.set(-1);
    this.updateMainButton();
  }

  private updateMainButton(): void {
    const answered = this.hasAnswered();
    const messages = this.language.messages();
    this.mainButton?.set(answered ? messages.next : messages.chooseAnswer, answered, () => {
      if (answered) this.nextQuestion();
    });
  }

  ngOnDestroy(): void {
    this.mainButton?.hide();
  }
}
