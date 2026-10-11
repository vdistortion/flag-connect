import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { QuizService } from '../../services/quiz.service';
import { FlagComponent } from '../../ui/flag/flag.component';
import { ButtonComponent } from '../../ui/button/button.component';

@Component({
  selector: 'app-quiz-country-page',
  imports: [FlagComponent, ButtonComponent],
  templateUrl: './quiz-country-page.component.html',
  styleUrl: './quiz-country-page.component.scss',
  providers: [QuizService],
})
export class QuizCountryPageComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  protected quizService = inject(QuizService);

  ngOnInit(): void {
    this.onNext();
  }

  onAnswer(index: number) {
    if (this.quizService.answerIndex < 0) {
      this.quizService.answerIndex = index;
      this.cdr.markForCheck();
    }
  }

  onNext() {
    this.quizService.calcQuestion();
    this.cdr.markForCheck();
  }
}
