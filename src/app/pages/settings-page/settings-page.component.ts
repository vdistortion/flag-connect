import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { QuizService } from '../../services/quiz.service';
import { TelegramApiService } from '../../services/telegram-api.service';

@Component({
  selector: 'app-settings-page',
  imports: [],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [QuizService],
})
export class SettingsPageComponent implements OnInit, OnDestroy {
  private tg = inject(TelegramApiService);
  quizService = inject(QuizService);
  value = this.quizService.count;
  private listeners: VoidFunction[] = [];

  ngOnInit(): void {
    this.listeners.push(this.tg.onMainButtonClick());
    this.tg.showMainButton('Назад');
  }

  ngOnDestroy(): void {
    this.listeners.forEach((listener) => listener());
  }

  setCount(e: Event) {
    const el = e.target as HTMLInputElement;
    const value = Number(el.value);
    this.quizService.setCount(value);
    this.value = value;
  }
}
