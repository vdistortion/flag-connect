import { computed, inject, Injectable, signal } from '@angular/core';
import { createQuestion, type Country } from '@flag-connect/flag-domain';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root',
})
export class QuizService {
  private readonly settings = inject(SettingsService);
  readonly count = computed(() => this.settings.count());
  readonly countries = signal<readonly Country[]>([]);
  readonly correctAnswerIndex = signal(-1);
  readonly answerIndex = signal(-1);
  readonly hasAnswered = computed(() => this.answerIndex() >= 0);
  readonly correctCountry = computed(() => this.countries()[this.correctAnswerIndex()] ?? null);

  selectAnswer(index: number): void {
    if (this.hasAnswered() || index < 0 || index >= this.countries().length) return;
    this.answerIndex.set(index);
  }

  nextQuestion(): void {
    const question = createQuestion(this.count());
    this.countries.set(question.countries);
    this.correctAnswerIndex.set(question.correctAnswerIndex);
    this.answerIndex.set(-1);
  }
}
