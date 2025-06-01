import { inject, Injectable } from '@angular/core';
import type { ICountry } from '../flag.interface';
import countries from '../../../public/countries.json';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root',
})
export class QuizService {
  settingsService = inject(SettingsService);
  count = this.settingsService.count;
  countries: ICountry[] = [];
  correctAnswerIndex = -1;
  answerIndex = -1;

  setCount(count: number) {
    this.count = count;
    this.settingsService.count = count;
  }

  calcQuestion() {
    const indexes: number[] = [];
    this.countries = [];
    this.answerIndex = -1;

    while (indexes.length < this.count) {
      const index = this.randomIndex(countries);
      if (!indexes.includes(index)) indexes.push(index);
    }

    indexes.forEach((answerIndex) => {
      this.countries.push(countries[answerIndex]);
    });

    this.correctAnswerIndex = this.randomIndex(this.countries);
  }

  randomIndex(array: any[]): number {
    return Math.floor(Math.random() * array.length);
  }

  shuffle(array: any[]) {
    array.sort(() => Math.random() - 0.5);
  }
}
