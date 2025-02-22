import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { ButtonComponent } from '../../ui/button/button.component';
import { QuizService } from '../../quiz.service';

@Component({
  selector: 'app-quiz-country-page',
  imports: [ButtonComponent],
  templateUrl: './quiz-country-page.component.html',
  styleUrl: './quiz-country-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [QuizService],
})
export class QuizCountryPageComponent implements OnInit {
  quizService = inject(QuizService);

  ngOnInit() {
    this.quizService.calcQuestion();
  }
}
