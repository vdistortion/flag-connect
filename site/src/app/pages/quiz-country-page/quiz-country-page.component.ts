import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { QuizService } from '../../quiz.service';
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
export class QuizCountryPageComponent implements OnInit {
  quizService = inject(QuizService);

  ngOnInit() {
    this.quizService.calcQuestion();
  }
}
