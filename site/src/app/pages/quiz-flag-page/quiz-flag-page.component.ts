import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { QuizService } from '../../quiz.service';

@Component({
  selector: 'app-quiz-flag-page',
  imports: [],
  templateUrl: './quiz-flag-page.component.html',
  styleUrl: './quiz-flag-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [QuizService],
})
export class QuizFlagPageComponent implements OnInit {
  quizService = inject(QuizService);

  ngOnInit() {
    this.quizService.calcQuestion();
  }
}
