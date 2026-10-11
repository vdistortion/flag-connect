import { Component, inject, OnInit } from '@angular/core';
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
export class QuizFlagPageComponent implements OnInit {
  protected readonly quizService = inject(QuizService);

  ngOnInit(): void {
    this.quizService.nextQuestion();
  }
}
