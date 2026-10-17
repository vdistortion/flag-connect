import {
  afterNextRender,
  Component,
  inject,
  Injector,
  OnInit,
  viewChild,
  viewChildren,
} from '@angular/core';
import { QuizService } from '../../services/quiz.service';
import { FlagComponent } from '../../ui/flag/flag.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-quiz-country-page',
  imports: [FlagComponent, ButtonComponent],
  templateUrl: './quiz-country-page.component.html',
  styleUrl: './quiz-country-page.component.scss',
  providers: [QuizService],
})
export class QuizCountryPageComponent implements OnInit {
  private readonly injector = inject(Injector);
  protected readonly quizService = inject(QuizService);
  protected readonly language = inject(LanguageService).language;
  protected readonly messages = inject(LanguageService).messages;
  protected readonly answerFlags = viewChildren<FlagComponent>('answerFlag');
  protected readonly actionButton = viewChild<ButtonComponent>('actionButton');

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
    this.focusFirstAnswer();
  }

  private focusActionButton(): void {
    if (this.quizService.usesTelegramMainButton) return;
    afterNextRender(() => this.actionButton()?.focus(), { injector: this.injector });
  }

  private focusFirstAnswer(): void {
    if (this.quizService.usesTelegramMainButton) return;
    afterNextRender(
      () => {
        if (this.quizService.noChoices()) this.actionButton()?.focus();
        else this.answerFlags()[0]?.focus();
      },
      { injector: this.injector },
    );
  }
}
