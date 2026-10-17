import { Component, inject, OnInit } from '@angular/core';
import { QuizService } from '../../services/quiz.service';
import { FlagComponent } from '../../ui/flag/flag.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-quiz-country-page',
  imports: [FlagComponent, ButtonComponent],
  templateUrl: './quiz-country-page.component.html',
  styleUrl: './quiz-country-page.component.scss',
  providers: [QuizService],
})
export class QuizCountryPageComponent implements OnInit {
  protected readonly quizService = inject(QuizService);
  protected readonly language = inject(LanguageService).language;
  protected readonly messages = inject(LanguageService).messages;

  ngOnInit(): void {
    this.quizService.nextQuestion();
  }
}
