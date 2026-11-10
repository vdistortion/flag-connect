import { Component, computed, inject } from '@angular/core';
import { QuizService } from '../services/quiz.service';
import { LanguageService } from '../services/language.service';

@Component({
  selector: 'app-quiz-session',
  template: `
    <div class="session-heading">
      <span>{{ quiz.sessionMode() === 'zen' ? copy().zen : copy().round }}</span>
      <span
        >{{ copy().question }} {{ quiz.questionNumber() }}
        @if (quiz.sessionMode() === 'round') {
          / {{ quiz.roundLength() }}
        }
      </span>
    </div>
    <div
      class="score-strip"
      [class.neutral]="graded() === 0"
      role="img"
      [attr.aria-label]="
        copy().correct +
        ': ' +
        quiz.correctCount() +
        ', ' +
        copy().incorrect +
        ': ' +
        quiz.incorrectCount()
      "
    >
      <span
        class="score-correct"
        [style.width.%]="graded() ? (quiz.correctCount() / graded()) * 100 : 0"
      ></span>
      <span
        class="score-incorrect"
        [style.width.%]="graded() ? (quiz.incorrectCount() / graded()) * 100 : 0"
      ></span>
    </div>
    <p class="score-caption">
      <span>✓ {{ copy().correct }}: {{ quiz.correctCount() }}</span
      ><span>× {{ copy().incorrect }}: {{ quiz.incorrectCount() }}</span>
      @if (quiz.revealedCount()) {
        <span>{{ copy().revealed }}: {{ quiz.revealedCount() }}</span>
      }
    </p>
  `,
  styles: [
    `
      :host {
        display: block;
        margin-bottom: 24px;
      }
      .session-heading,
      .score-caption {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        font-size: 13px;
      }
      .session-heading {
        font-weight: 650;
        margin-bottom: 10px;
      }
      .score-strip {
        display: flex;
        height: 8px;
        border-radius: 6px;
        overflow: hidden;
        background: var(--border-color, var(--flag-color));
      }
      .score-correct {
        background: var(--score-correct-color, #21845b);
      }
      .score-incorrect {
        background: var(--score-incorrect-color, #c74448);
      }
      .score-caption {
        justify-content: flex-start;
        color: var(--muted-color, var(--text-color));
        margin: 8px 0 0;
        font-variant-numeric: tabular-nums;
      }
    `,
  ],
})
export class QuizSessionComponent {
  protected readonly quiz = inject(QuizService);
  private readonly language = inject(LanguageService).language;
  protected readonly graded = computed(() => this.quiz.correctCount() + this.quiz.incorrectCount());
  protected readonly copy = computed(() =>
    this.language() === 'ru'
      ? {
          zen: 'Дзен · Победа не предусмотрена',
          round: 'Раунд',
          question: 'Вопрос',
          correct: 'Верно',
          incorrect: 'Ошибок',
          revealed: 'Раскрыто',
        }
      : {
          zen: 'Zen · Victory is not part of the plan',
          round: 'Round',
          question: 'Question',
          correct: 'Correct',
          incorrect: 'Incorrect',
          revealed: 'Revealed',
        },
  );
}
