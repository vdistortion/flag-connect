import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Type } from '@angular/core';
import { provideRouter } from '@angular/router';
import { COUNTRY_CATALOG_URL } from '../services/country-catalog.service';
import { SettingsService } from '../services/settings.service';
import { QuizService } from '../services/quiz.service';
import { provideTestStorage } from '../testing/provide-test-storage';
import { QuizFlagPageComponent } from './quiz-flag-page/quiz-flag-page.component';
import { QuizCountryPageComponent } from './quiz-country-page/quiz-country-page.component';

const countries = Array.from({ length: 10 }, (_, i) => ({
  code: `C${String.fromCharCode(65 + i)}`,
  name: { en: `Country ${i}`, ru: `Страна ${i}` },
  flag: [`c${i}.svg`],
}));

describe.each([QuizFlagPageComponent, QuizCountryPageComponent] as Type<unknown>[])(
  '%s round UI',
  (Page) => {
    beforeEach(() =>
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          provideHttpClient(),
          provideHttpClientTesting(),
          provideTestStorage(),
        ],
      }),
    );
    it('keeps zen endless and shows the current correct/incorrect ratio', () => {
      const fixture = TestBed.createComponent(Page);
      fixture.detectChanges();
      TestBed.inject(HttpTestingController).expectOne(COUNTRY_CATALOG_URL).flush(countries);
      fixture.detectChanges();
      const quiz = fixture.debugElement.injector.get(QuizService);
      for (let i = 0; i < 12; i++) {
        quiz.selectAnswer(
          i % 2 === 0
            ? quiz.correctAnswerIndex()
            : (quiz.correctAnswerIndex() + 1) % quiz.countries().length,
        );
        quiz.nextQuestion();
      }
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.score-correct').style.width).toBe('50%');
      expect(fixture.nativeElement.querySelector('.score-incorrect').style.width).toBe('50%');
      expect(fixture.nativeElement.querySelector('.round-results')).toBeNull();
    });

    it('shows a neutral score, finishes a round, repeats mistakes and restarts with focus', async () => {
      const settings = TestBed.inject(SettingsService);
      settings.setSessionMode('round');
      settings.setRoundLength(10);
      const fixture = TestBed.createComponent(Page);
      fixture.detectChanges();
      TestBed.inject(HttpTestingController).expectOne(COUNTRY_CATALOG_URL).flush(countries);
      fixture.detectChanges();
      const quiz = fixture.debugElement.injector.get(QuizService);
      expect(fixture.nativeElement.querySelector('.score-strip')).not.toBeNull();
      expect(
        fixture.nativeElement.querySelector('.score-strip').classList.contains('neutral'),
      ).toBe(true);
      for (let i = 0; i < 10; i++) {
        const index =
          i === 0
            ? (quiz.correctAnswerIndex() + 1) % quiz.countries().length
            : quiz.correctAnswerIndex();
        fixture.nativeElement
          .querySelectorAll('.countries button.flag__image-button, .countries app-button button')
          [index].click();
        fixture.detectChanges();
        fixture.nativeElement.querySelector('.quiz-action-bar button').click();
        fixture.detectChanges();
      }
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('.round-results')).not.toBeNull();
      expect(fixture.nativeElement.querySelectorAll('.countries button')).toHaveLength(0);
      expect(fixture.nativeElement.querySelector('.round-score').textContent).toContain('9');
      expect(document.activeElement).toBe(fixture.nativeElement.querySelector('.round-results h1'));
      fixture.nativeElement.querySelector('.repeat-mistakes').click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.round-results')).toBeNull();
      expect(quiz.roundLength()).toBe(1);
    });
  },
);
