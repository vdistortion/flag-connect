import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { QuizService } from '../../services/quiz.service';

@Component({
  selector: 'app-settings-page',
  imports: [],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [QuizService],
})
export class SettingsPageComponent {
  quizService = inject(QuizService);
  value = this.quizService.count;

  setCount(e: Event) {
    const el = e.target as HTMLInputElement;
    const value = Number(el.value);
    this.quizService.setCount(value);
    this.value = value;
  }
}
