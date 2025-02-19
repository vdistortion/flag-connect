import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import countries from '../../../countries.json';
import { ICountry } from '../../flag.interface';

@Component({
  selector: 'app-home-page',
  imports: [],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent implements OnInit {
  count: number = 4;
  countries: ICountry[] = [];
  correctAnswerIndex: number = -1;
  answerIndex: number = -1;

  ngOnInit() {
    this.calcQuestion();
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
