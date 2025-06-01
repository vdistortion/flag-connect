import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { QuizService } from '../../services/quiz.service';
import { ButtonComponent } from '../../ui/button/button.component';
import { FlagComponent } from '../../ui/flag/flag.component';
import { TelegramApiService } from '../../services/telegram-api.service';

@Component({
  selector: 'app-quiz-flag-page',
  imports: [ButtonComponent, FlagComponent],
  templateUrl: './quiz-flag-page.component.html',
  styleUrl: './quiz-flag-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [QuizService],
})
export class QuizFlagPageComponent implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  protected tg = inject(TelegramApiService);
  protected quizService = inject(QuizService);
  private listeners: VoidFunction[] = [];

  ngOnInit() {
    const offClick = this.tg.onMainButtonClick(() => this.onNext());
    this.listeners.push(offClick);
    this.onNext();
  }

  ngOnDestroy(): void {
    this.listeners.forEach((listener) => listener());
    this.tg.hideMainButton();
  }

  onAnswer(index: number) {
    if (this.quizService.answerIndex < 0) {
      this.quizService.answerIndex = index;
      this.tg.showMainButton('Продолжить');
    }
  }

  onNext() {
    this.quizService.calcQuestion();
    this.tg.hideMainButton();
    this.cdr.markForCheck();
  }
}
