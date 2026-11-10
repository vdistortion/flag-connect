import { Component, computed, inject, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QuizService } from '../services/quiz.service';
import { LanguageService } from '../services/language.service';

@Component({
  selector: 'app-quiz-results',
  imports: [RouterLink],
  template: `
    <section class="round-results" aria-labelledby="round-title">
      <p class="result-eyebrow">{{ copy().complete }}</p>
      <h1 id="round-title" tabindex="-1">{{ copy().title }}</h1>
      @if (graded()) {
        <p class="round-score">
          {{ quiz.correctCount() }} <span>/ {{ graded() }}</span>
        </p>
        <p>{{ copy().correct }} · {{ accuracy() }}%</p>
      }
      @if (quiz.revealedCount()) {
        <p>{{ copy().selfStudy }}: {{ quiz.revealedCount() }}</p>
      }
      <div class="result-actions">
        @if (quiz.incorrectCount()) {
          <button class="repeat-mistakes" type="button" (click)="repeat.emit()">
            {{ copy().repeat }} · {{ quiz.incorrectCount() }}
          </button>
        }
        <button class="restart-game" type="button" (click)="restart.emit()">
          {{ copy().again }}
        </button>
        <a routerLink="/">{{ copy().home }}</a>
      </div>
      <details>
        <summary>{{ copy().review }}</summary>
        <ul>
          @for (result of quiz.results(); track $index) {
            <li>
              <span>{{ result.country.name[language()] }}</span
              ><span>{{
                result.correct === null
                  ? copy().revealed
                  : result.correct
                    ? '✓ ' + copy().correct
                    : '× ' + copy().incorrect
              }}</span>
            </li>
          }
        </ul>
      </details>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .round-results {
        max-width: 640px;
        margin: 0 auto;
        padding: 28px;
        border: 1px solid var(--border-color, #8886);
        border-radius: 20px;
        background: var(--surface-color, var(--bg-color));
      }
      .result-eyebrow {
        text-transform: uppercase;
        font-size: 12px;
        letter-spacing: 0.08em;
        color: var(--muted-color, var(--text-color));
      }
      h1 {
        font-size: clamp(28px, 4vw, 40px);
        margin: 12px 0;
        letter-spacing: -0.04em;
      }
      .round-score {
        font-size: 64px;
        font-weight: 750;
        line-height: 1.2;
        margin: 24px 0 8px;
        font-variant-numeric: tabular-nums;
      }
      .round-score span {
        font-size: 28px;
        color: var(--muted-color, var(--text-color));
        font-weight: 400;
      }
      .result-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin: 28px 0;
        align-items: center;
      }
      button,
      a {
        min-height: 44px;
        border: 1px solid var(--border-color, #8886);
        border-radius: 10px;
        padding: 12px 16px;
        font: inherit;
        font-weight: 600;
        cursor: pointer;
        background: var(--flag-color);
        color: var(--text-color);
        text-decoration: none;
      }
      .restart-game {
        background: var(--button-color);
        color: var(--button-text-color);
        border-color: transparent;
      }
      details {
        border-top: 1px solid var(--border-color, #8886);
        padding-top: 20px;
      }
      summary {
        cursor: pointer;
        min-height: 44px;
      }
      ul {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      li {
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 8px;
        padding: 12px 0;
        border-top: 1px solid var(--border-color, #8886);
        font-size: 14px;
      }
      li span:last-child {
        color: var(--muted-color, var(--text-color));
      }
      @media (max-width: 500px) {
        .round-results {
          padding: 20px;
        }
      }
    `,
  ],
})
export class QuizResultsComponent {
  protected readonly quiz = inject(QuizService);
  protected readonly language = inject(LanguageService).language;
  readonly restart = output<void>();
  readonly repeat = output<void>();
  protected readonly graded = computed(() => this.quiz.correctCount() + this.quiz.incorrectCount());
  protected readonly accuracy = computed(() =>
    this.graded() ? Math.round((this.quiz.correctCount() / this.graded()) * 100) : 0,
  );
  protected readonly copy = computed(() =>
    this.language() === 'ru'
      ? {
          complete: 'Раунд завершён',
          title: 'Каждый флаг — открытие',
          correct: 'Верно',
          incorrect: 'Ошибка',
          selfStudy: 'Изучено без оценки',
          revealed: 'Раскрыт ответ',
          repeat: 'Повторить ошибки',
          again: 'Ещё раз',
          home: 'На главную',
          review: 'Все ответы',
        }
      : {
          complete: 'Round complete',
          title: 'Every flag, a discovery',
          correct: 'Correct',
          incorrect: 'Incorrect',
          selfStudy: 'Studied without grading',
          revealed: 'Answer revealed',
          repeat: 'Practice mistakes',
          again: 'Play again',
          home: 'Home',
          review: 'All answers',
        },
  );
}
