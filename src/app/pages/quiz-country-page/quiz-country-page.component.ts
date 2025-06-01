import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { QuizService } from '../../services/quiz.service';
import { FlagComponent } from '../../ui/flag/flag.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { TelegramApiService } from '../../services/telegram-api.service';

@Component({
  selector: 'app-quiz-country-page',
  imports: [FlagComponent, ButtonComponent],
  templateUrl: './quiz-country-page.component.html',
  styleUrl: './quiz-country-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [QuizService],
})
export class QuizCountryPageComponent implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  protected tg = inject(TelegramApiService);
  protected quizService = inject(QuizService);
  private listeners: VoidFunction[] = [];

  ngOnInit(): void {
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
