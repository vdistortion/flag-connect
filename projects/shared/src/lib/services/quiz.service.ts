import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { createQuestion, type Country } from '@flag-connect/flag-domain';
import { SettingsService } from './settings.service';
import { QUIZ_MAIN_BUTTON } from './quiz-main-button';

@Injectable({
  providedIn: 'root',
})
export class QuizService implements OnDestroy {
  private readonly settings = inject(SettingsService);
  private readonly mainButton = inject(QUIZ_MAIN_BUTTON, { optional: true });
  readonly usesTelegramMainButton = this.mainButton !== null;
  readonly count = computed(() => this.settings.count());
  readonly countries = signal<readonly Country[]>([]);
  readonly correctAnswerIndex = signal(-1);
  readonly answerIndex = signal(-1);
  readonly hasAnswered = computed(() => this.answerIndex() >= 0);
  readonly correctCountry = computed(() => this.countries()[this.correctAnswerIndex()] ?? null);

  selectAnswer(index: number): void {
    if (this.hasAnswered() || index < 0 || index >= this.countries().length) return;
    this.answerIndex.set(index);
    this.mainButton?.set('Далее', true, () => this.nextQuestion());
  }

  nextQuestion(): void {
    const question = createQuestion(this.count());
    this.countries.set(question.countries);
    this.correctAnswerIndex.set(question.correctAnswerIndex);
    this.answerIndex.set(-1);
    this.mainButton?.set('Выберите ответ', false, () => undefined);
  }

  ngOnDestroy(): void {
    this.mainButton?.hide();
  }
}
