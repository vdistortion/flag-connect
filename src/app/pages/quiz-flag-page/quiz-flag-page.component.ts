import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { TelegramApiService } from '@verse-bot/miniapp/angular';
import { QuizService } from '../../services/quiz.service';
import { ButtonComponent } from '../../ui/button/button.component';
import { FlagComponent } from '../../ui/flag/flag.component';

@Component({
  selector: 'app-quiz-flag-page',
  imports: [ButtonComponent, FlagComponent],
  templateUrl: './quiz-flag-page.component.html',
  styleUrl: './quiz-flag-page.component.scss',
  providers: [QuizService],
})
export class QuizFlagPageComponent implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  protected readonly tg = inject(TelegramApiService);
  protected quizService = inject(QuizService);
  private listeners: VoidFunction[] = [];

  ngOnInit() {
    const offClick = this.tg.mainButton.onClick(() => this.onNext());
    this.listeners.push(offClick);
    this.onNext();
  }

  ngOnDestroy(): void {
    this.listeners.forEach((listener) => listener());
  }

  onAnswer(index: number) {
    if (this.quizService.answerIndex < 0) {
      this.quizService.answerIndex = index;
      this.tg.mainButton.show('Продолжить');
    }
  }

  onNext() {
    this.quizService.calcQuestion();
    this.tg.mainButton.hide();
    this.cdr.markForCheck();
  }
}
