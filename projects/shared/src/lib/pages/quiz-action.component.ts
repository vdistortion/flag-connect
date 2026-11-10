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
            {{ messages().next }}
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
        border-top: 1px solid color-mix(in srgb, var(--text-color) 14%, transparent);
        background: var(--bg-color);
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
  readonly activated = output<void>();
  private readonly button = viewChild<ButtonComponent>('button');
  focus(): void {
    this.button()?.focus();
  }
}
