import { Component, inject, output, viewChild } from '@angular/core';
import { QuizService } from '../services/quiz.service';
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
          [disabled]="!quiz.primaryAction().enabled"
          (clicked)="activated.emit()"
        >
          {{ quiz.primaryAction().text }}
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
  readonly activated = output<void>();
  private readonly button = viewChild<ButtonComponent>('button');
  focus(): void {
    this.button()?.focus();
  }
}
