import {
  afterNextRender,
  Directive,
  inject,
  Injector,
  OnInit,
  viewChild,
  viewChildren,
} from '@angular/core';
import { QuizService } from '../services/quiz.service';
import { LanguageService } from '../services/language.service';
import { ButtonComponent } from '../ui/button/button.component';
import { FlagComponent } from '../ui/flag/flag.component';
import { QuizActionComponent } from './quiz-action.component';

@Directive()
export abstract class QuizPageBase implements OnInit {
  private readonly injector = inject(Injector);
  protected readonly quizService = inject(QuizService);
  protected readonly language = inject(LanguageService).language;
  protected readonly messages = inject(LanguageService).messages;
  private readonly answers = viewChildren<ButtonComponent | FlagComponent>('answerOption');
  private readonly actionButton = viewChild(QuizActionComponent);

  ngOnInit(): void {
    this.quizService.nextQuestion();
  }

  protected selectAnswer(index: number): void {
    this.quizService.selectAnswer(index);
    this.focusActionButton();
  }

  protected activateAction(): void {
    if (this.quizService.noChoices() && !this.quizService.hasAnswered()) {
      this.quizService.revealAnswer();
      this.focusActionButton();
      return;
    }
    this.quizService.nextQuestion();
    if (this.quizService.usesTelegramMainButton()) return;
    afterNextRender(
      () => {
        if (this.quizService.noChoices()) this.actionButton()?.focus();
        else this.answers()[0]?.focus();
      },
      { injector: this.injector },
    );
  }

  private focusActionButton(): void {
    if (this.quizService.usesTelegramMainButton()) return;
    afterNextRender(() => this.actionButton()?.focus(), { injector: this.injector });
  }
}
