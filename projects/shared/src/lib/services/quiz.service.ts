import { inject, Injectable } from '@angular/core';
import { createQuestion, type Country } from '@flag-connect/flag-domain';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root',
})
export class QuizService {
  settingsService = inject(SettingsService);
  count = this.settingsService.count;
  countries: Country[] = [];
  correctAnswerIndex = -1;
  answerIndex = -1;

  setCount(count: number) {
    this.count = count;
    this.settingsService.count = count;
  }

  calcQuestion() {
    const question = createQuestion(this.count);
    this.countries = question.countries;
    this.correctAnswerIndex = question.correctAnswerIndex;
    this.answerIndex = -1;
  }
}
