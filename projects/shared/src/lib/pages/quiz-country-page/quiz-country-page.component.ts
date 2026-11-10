import { Component } from '@angular/core';
import { QuizService } from '../../services/quiz.service';
import { FlagComponent } from '../../ui/flag/flag.component';
import { QuizPageBase } from '../quiz-page-base';
import { QuizActionComponent } from '../quiz-action.component';

@Component({
  selector: 'app-quiz-country-page',
  imports: [FlagComponent, QuizActionComponent],
  templateUrl: './quiz-country-page.component.html',
  styleUrl: './quiz-country-page.component.scss',
  providers: [QuizService],
})
export class QuizCountryPageComponent extends QuizPageBase {}
