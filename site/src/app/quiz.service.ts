import { Injectable } from '@angular/core';
import type { ICountry } from './flag.interface';
import countries from '../countries.json';

@Injectable()
export class QuizService {
  count: number = 4;
  countries: ICountry[] = [];
  correctAnswerIndex: number = -1;
  answerIndex: number = -1;

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
