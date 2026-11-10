import { Component } from '@angular/core';
import { QuizService } from '../../services/quiz.service';
import { ButtonComponent } from '../../ui/button/button.component';
import { FlagComponent } from '../../ui/flag/flag.component';
import { QuizPageBase } from '../quiz-page-base';
import { QuizActionComponent } from '../quiz-action.component';
import { QuizFeedbackComponent } from '../quiz-feedback.component';

@Component({
  selector: 'app-quiz-flag-page',
  imports: [ButtonComponent, FlagComponent, QuizActionComponent, QuizFeedbackComponent],
  templateUrl: './quiz-flag-page.component.html',
  styleUrl: './quiz-flag-page.component.scss',
  providers: [QuizService],
})
export class QuizFlagPageComponent extends QuizPageBase {}
