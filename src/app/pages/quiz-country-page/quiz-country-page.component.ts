import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { TelegramApiService } from '@verse-bot/miniapp/angular';
import { QuizService } from '../../services/quiz.service';
import { FlagComponent } from '../../ui/flag/flag.component';
import { ButtonComponent } from '../../ui/button/button.component';

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
    const offClick = this.tg.api.onMainButtonClick(() => this.onNext());
    this.listeners.push(offClick);
    this.onNext();
  }

  ngOnDestroy(): void {
    this.listeners.forEach((listener) => listener());
  }

  onAnswer(index: number) {
    if (this.quizService.answerIndex < 0) {
      this.quizService.answerIndex = index;
      this.tg.api.showMainButton('Продолжить');
    }
  }

  onNext() {
    this.quizService.calcQuestion();
    this.tg.api.hideMainButton();
    this.cdr.markForCheck();
  }
}
