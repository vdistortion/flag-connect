import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
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
  private cdr = inject(ChangeDetectorRef);
  protected quizService = inject(QuizService);

  ngOnInit() {
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
