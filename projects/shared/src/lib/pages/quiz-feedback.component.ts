import { Component, computed, inject } from '@angular/core';
import { QuizService } from '../services/quiz.service';
import { LanguageService } from '../services/language.service';

@Component({
  selector: 'app-quiz-feedback',
  template: `
    <p class="keyboard-hints">
      @if (!quiz.noChoices()) {
        <span
          ><kbd>1–{{ quiz.countries().length === 10 ? 9 : quiz.countries().length }}</kbd>
          {{ copy().choose }}
          @if (quiz.countries().length === 10) {
            · <kbd>0</kbd> = 10
          }
        </span>
        <span><kbd>← ↑ ↓ →</kbd> {{ copy().move }}</span>
      }
      <span
        ><kbd>Enter</kbd>
        {{
          quiz.noChoices() && !quiz.hasAnswered() ? messages().showAnswer : messages().next
        }}</span
      >
    </p>
    <div
      class="quiz-feedback"
      aria-live="polite"
      aria-atomic="true"
      [class.quiz-feedback--answered]="quiz.hasAnswered()"
    >
      @if (quiz.hasAnswered()) {
        <span class="feedback-symbol" aria-hidden="true">{{ correct() ? '✓' : '↗' }}</span>
        <p>
          <strong>{{
            quiz.noChoices() ? copy().answer : correct() ? copy().correct : copy().incorrect
          }}</strong>
          <span
            >{{ quiz.correctCountry()?.name?.[language()] }}
            @if (!quiz.noChoices()) {
              · {{ copy().option }} {{ quiz.correctAnswerIndex() + 1 }}
            }
          </span>
        </p>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .keyboard-hints {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 18px;
        margin: 18px 0;
        color: var(--muted-color, var(--text-color));
        font-size: 12px;
        line-height: 1.8;
      }
      kbd {
        display: inline-block;
        padding: 0 6px;
        border: 1px solid var(--border-color, #8886);
        border-radius: 5px;
        background: var(--surface-color, var(--flag-color));
        font: inherit;
        font-weight: 600;
        color: var(--text-color);
      }
      .quiz-feedback {
        min-height: 0;
      }
      .quiz-feedback--answered {
        display: flex;
        align-items: center;
        gap: 14px;
        margin: 18px 0;
        padding: 18px;
        border: 1px solid var(--border-color, #8886);
        border-radius: 16px;
        background: var(--surface-color, var(--flag-color));
        color: var(--text-color);
      }
      p {
        margin: 0;
      }
      strong,
      p > span {
        display: block;
      }
      strong {
        margin-bottom: 4px;
      }
      p > span {
        font-size: 14px;
        line-height: 1.5;
      }
      .feedback-symbol {
        display: grid;
        place-items: center;
        width: 34px;
        height: 34px;
        flex-shrink: 0;
        border: 1px solid var(--border-color, #8886);
        border-radius: 50%;
        font-size: 22px;
      }
    `,
  ],
})
export class QuizFeedbackComponent {
  protected readonly quiz = inject(QuizService);
  protected readonly language = inject(LanguageService).language;
  protected readonly messages = inject(LanguageService).messages;
  protected readonly correct = computed(
    () => this.quiz.noChoices() || this.quiz.answerIndex() === this.quiz.correctAnswerIndex(),
  );
  protected readonly copy = computed(() =>
    this.language() === 'ru'
      ? {
          choose: 'выбрать',
          move: 'перейти к варианту',
          correct: 'Верно!',
          incorrect: 'Неверно. Правильный ответ:',
          answer: 'Правильный ответ',
          option: 'Вариант',
        }
      : {
          choose: 'to choose',
          move: 'to move focus',
          correct: 'Correct!',
          incorrect: 'Incorrect. The correct answer:',
          answer: 'The answer',
          option: 'Option',
        },
  );
}
