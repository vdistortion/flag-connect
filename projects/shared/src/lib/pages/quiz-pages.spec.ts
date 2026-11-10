import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { signal, Type } from '@angular/core';
import { QUIZ_MAIN_BUTTON } from '../services/quiz-main-button';
import { CountryCatalogService, COUNTRY_CATALOG_URL } from '../services/country-catalog.service';
import { SettingsService } from '../services/settings.service';
import { QuizFlagPageComponent } from './quiz-flag-page/quiz-flag-page.component';
import { QuizCountryPageComponent } from './quiz-country-page/quiz-country-page.component';

const countries = Array.from({ length: 10 }, (_, i) => ({
  code: `C${String.fromCharCode(65 + i)}`,
  name: { en: `Country ${i}`, ru: `Страна ${i}` },
  flag: [`c${i}.svg`],
}));

describe.each([QuizFlagPageComponent, QuizCountryPageComponent] as Type<unknown>[])(
  '%s catalog loading',
  (Page) => {
    beforeEach(() =>
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting()],
      }),
    );
    afterEach(() => TestBed.resetTestingModule());

    it('shows loading and renders the first question after delayed HTTP', () => {
      const fixture = TestBed.createComponent(Page);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toMatch(
        /loading|загрузка/i,
      );
      TestBed.inject(HttpTestingController).expectOne(COUNTRY_CATALOG_URL).flush(countries);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.quiz-action-bar')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
    });

    it('shows an error and retries a failed request', () => {
      const fixture = TestBed.createComponent(Page);
      fixture.detectChanges();
      const http = TestBed.inject(HttpTestingController);
      http
        .expectOne(COUNTRY_CATALOG_URL)
        .flush('offline', { status: 503, statusText: 'Unavailable' });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
      fixture.nativeElement.querySelector('[role="alert"] button').click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
      http.expectOne(COUNTRY_CATALOG_URL).flush(countries);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.quiz-action-bar')).not.toBeNull();
    });

    it('immediately renders a question when the catalog is already cached', () => {
      TestBed.inject(CountryCatalogService).countries.subscribe();
      TestBed.inject(HttpTestingController).expectOne(COUNTRY_CATALOG_URL).flush(countries);
      const fixture = TestBed.createComponent(Page);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.quiz-action-bar')).not.toBeNull();
      TestBed.inject(HttpTestingController).expectNone(COUNTRY_CATALOG_URL);
    });

    it('uses the browser action button until Telegram becomes available', () => {
      const available = signal(false);
      TestBed.configureTestingModule({
        providers: [
          { provide: QUIZ_MAIN_BUTTON, useValue: { available, set: () => {}, hide: () => {} } },
        ],
      });
      const fixture = TestBed.createComponent(Page);
      fixture.detectChanges();
      TestBed.inject(HttpTestingController).expectOne(COUNTRY_CATALOG_URL).flush(countries);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.quiz-action-bar')).not.toBeNull();
      available.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.quiz-action-bar')).toBeNull();
    });

    it('uses Telegram main button to advance after an answer', () => {
      const available = signal(true);
      let state: { enabled: boolean; click: () => void } | undefined;
      TestBed.configureTestingModule({
        providers: [
          {
            provide: QUIZ_MAIN_BUTTON,
            useValue: {
              available,
              set: (_text: string, enabled: boolean, click: () => void) =>
                (state = { enabled, click }),
              hide: () => {},
            },
          },
        ],
      });
      const fixture = TestBed.createComponent(Page);
      fixture.detectChanges();
      TestBed.inject(HttpTestingController).expectOne(COUNTRY_CATALOG_URL).flush(countries);
      fixture.detectChanges();
      expect(state?.enabled).toBe(false);
      (
        fixture.nativeElement.querySelector(
          '.countries button.flag__image-button, .countries app-button button',
        ) as HTMLButtonElement
      ).click();
      fixture.detectChanges();
      expect(state?.enabled).toBe(true);
      state?.click();
      fixture.detectChanges();
      expect(state?.enabled).toBe(false);
      expect(fixture.nativeElement.querySelector('.quiz-action-bar')).toBeNull();
    });

    it('enables next only after choosing an answer and resets for the next question', () => {
      const fixture = TestBed.createComponent(Page);
      fixture.detectChanges();
      TestBed.inject(HttpTestingController).expectOne(COUNTRY_CATALOG_URL).flush(countries);
      fixture.detectChanges();
      const action = fixture.nativeElement.querySelector(
        '.quiz-action-bar button',
      ) as HTMLButtonElement;
      expect(action.disabled).toBe(true);
      const answer = fixture.nativeElement.querySelector(
        '.countries button.flag__image-button, .countries app-button button',
      ) as HTMLButtonElement;
      answer.click();
      fixture.detectChanges();
      expect(action.disabled).toBe(false);
      action.click();
      fixture.detectChanges();
      expect(action.disabled).toBe(true);
    });

    it('focuses the action after answering and the first option after next', async () => {
      const fixture = TestBed.createComponent(Page);
      fixture.detectChanges();
      TestBed.inject(HttpTestingController).expectOne(COUNTRY_CATALOG_URL).flush(countries);
      fixture.detectChanges();
      const answerSelector = '.countries button.flag__image-button, .countries app-button button';
      (fixture.nativeElement.querySelector(answerSelector) as HTMLButtonElement).click();
      fixture.detectChanges();
      await fixture.whenStable();
      const action = fixture.nativeElement.querySelector(
        '.quiz-action-bar button',
      ) as HTMLButtonElement;
      expect(document.activeElement).toBe(action);
      action.click();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(document.activeElement).toBe(fixture.nativeElement.querySelector(answerSelector));
    });

    it('reveals and resets the no-choice answer', () => {
      TestBed.inject(SettingsService).setNoChoices(true);
      const fixture = TestBed.createComponent(Page);
      fixture.detectChanges();
      TestBed.inject(HttpTestingController).expectOne(COUNTRY_CATALOG_URL).flush(countries);
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector(
        '.quiz-action-bar button',
      ) as HTMLButtonElement;
      expect(button.disabled).toBe(false);
      expect(fixture.nativeElement.querySelector('.answer-reveal, .answer-reveal-flag')).toBeNull();
      button.click();
      fixture.detectChanges();
      expect(
        fixture.nativeElement.querySelector('.answer-reveal, .answer-reveal-flag'),
      ).not.toBeNull();
      button.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.answer-reveal, .answer-reveal-flag')).toBeNull();
    });
  },
);
