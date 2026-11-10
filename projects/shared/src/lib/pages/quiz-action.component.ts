import { Component, inject, output, viewChild } from '@angular/core';
import { QuizService } from '../services/quiz.service';
import { LanguageService } from '../services/language.service';
import { ButtonComponent } from '../ui/button/button.component';

@Component({
  selector: 'app-quiz-action',
  imports: [ButtonComponent],
  template: `
    @if (!quiz.usesTelegramMainButton()) {
      <div class="quiz-action-bar">
        <app-button
          #button
          [country]="true"
          [disabled]="!quiz.noChoices() && !quiz.hasAnswered()"
          (clicked)="activated.emit()"
        >
          @if (quiz.noChoices() && !quiz.hasAnswered()) {
            {{ messages().showAnswer }}
          } @else if (quiz.hasAnswered()) {
            {{
              quiz.sessionMode() === 'round' && quiz.results().length >= quiz.roundLength()
                ? language() === 'ru'
                  ? 'Результат'
                  : 'Results'
                : messages().next
            }}
          } @else {
            {{ messages().chooseAnswer }}
          }
        </app-button>
      </div>
    }
  `,
  styles: [
    `
      .quiz-action-bar {
        position: fixed;
        z-index: 10;
        right: 0;
        bottom: 0;
        left: 0;
        display: flex;
        justify-content: center;
        padding: 12px 20px calc(12px + env(safe-area-inset-bottom));
        border-top: 1px solid var(--border-color, #8886);
        background: var(--surface-color, var(--bg-color));
        box-shadow: 0 -4px 24px #00000008;
      }
      app-button {
        width: min(100%, 520px);
      }
    `,
  ],
})
export class QuizActionComponent {
  protected readonly quiz = inject(QuizService);
  protected readonly messages = inject(LanguageService).messages;
  protected readonly language = inject(LanguageService).language;
  readonly activated = output<void>();
  private readonly button = viewChild<ButtonComponent>('button');
  focus(): void {
    this.button()?.focus();
  }
}
