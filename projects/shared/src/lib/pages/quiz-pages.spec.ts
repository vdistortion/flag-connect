import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { signal, Type } from '@angular/core';
import { QUIZ_MAIN_BUTTON } from '../services/quiz-main-button';
import { CountryCatalogService, COUNTRY_CATALOG_URL } from '../services/country-catalog.service';
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

describe.each(
  ([QuizFlagPageComponent, QuizCountryPageComponent] as Type<unknown>[]).map((Page) => ({
    name: Page.name,
    Page,
  })),
)('$name quiz presentation and interaction', ({ Page }) => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideTestStorage()],
    }),
  );
  afterEach(() => TestBed.resetTestingModule());

  it('selects numbered answers from the document, including 0 for option ten', () => {
    TestBed.inject(SettingsService).setCount(10);
    const fixture = TestBed.createComponent(Page);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne(COUNTRY_CATALOG_URL).flush(countries);
    fixture.detectChanges();
    const quiz = fixture.debugElement.injector.get(QuizService);
    const event = new KeyboardEvent('keydown', { key: '0', bubbles: true, cancelable: true });
    document.dispatchEvent(event);
    fixture.detectChanges();
    expect(quiz.answerIndex()).toBe(9);
    expect(event.defaultPrevented).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    expect(quiz.answerIndex()).toBe(9);
  });

  it('moves option focus with arrows and wraps without selecting', () => {
    const fixture = TestBed.createComponent(Page);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne(COUNTRY_CATALOG_URL).flush(countries);
    fixture.detectChanges();
    const options = fixture.nativeElement.querySelectorAll(
      '.countries button.flag__image-button, .countries app-button button',
    ) as NodeListOf<HTMLButtonElement>;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(document.activeElement).toBe(options[0]);
    options[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(document.activeElement).toBe(options[options.length - 1]);
    options[options.length - 1].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    expect(document.activeElement).toBe(options[0]);
    expect(fixture.debugElement.injector.get(QuizService).hasAnswered()).toBe(false);
  });

  it('ignores modified, repeated, composing, prevented and unrelated interactive key events', () => {
    const fixture = TestBed.createComponent(Page);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne(COUNTRY_CATALOG_URL).flush(countries);
    fixture.detectChanges();
    const quiz = fixture.debugElement.injector.get(QuizService);
    for (const init of [
      { ctrlKey: true },
      { altKey: true },
      { metaKey: true },
      { shiftKey: true },
      { repeat: true },
      { isComposing: true },
    ]) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '1', ...init }));
    }
    const prevented = new KeyboardEvent('keydown', { key: '1', cancelable: true });
    prevented.preventDefault();
    document.dispatchEvent(prevented);
    for (const markup of [
      '<input>',
      '<textarea></textarea>',
      '<select></select>',
      '<div contenteditable="true"><span>edit</span></div>',
      '<button>settings</button>',
      '<a href="/">home</a>',
      '<div role="button" tabindex="0">menu</div>',
      '<div role="switch">toggle</div>',
      '<summary>details</summary>',
    ]) {
      const host = document.createElement('div');
      host.innerHTML = markup;
      document.body.append(host);
      (host.querySelector('span') ?? host.firstElementChild)!.dispatchEvent(
        new KeyboardEvent('keydown', { key: '1', bubbles: true }),
      );
      host.remove();
    }
    expect(quiz.hasAnswered()).toBe(false);
  });

  it('uses Enter to reveal then advance once and leaves native buttons to the browser', () => {
    TestBed.inject(SettingsService).setNoChoices(true);
    const fixture = TestBed.createComponent(Page);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne(COUNTRY_CATALOG_URL).flush(countries);
    fixture.detectChanges();
    const quiz = fixture.debugElement.injector.get(QuizService);
    const reveal = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
    document.dispatchEvent(reveal);
    fixture.detectChanges();
    expect(quiz.hasAnswered()).toBe(true);
    expect(reveal.defaultPrevented).toBe(true);
    const action = fixture.nativeElement.querySelector(
      '.quiz-action-bar button',
    ) as HTMLButtonElement;
    const native = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    action.dispatchEvent(native);
    expect(native.defaultPrevented).toBe(false);
    expect(quiz.hasAnswered()).toBe(true);
    action.click();
    fixture.detectChanges();
    expect(quiz.hasAnswered()).toBe(false);
  });

  it('advances an answered question once from document Enter and disposes shortcuts on destroy', () => {
    const fixture = TestBed.createComponent(Page);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne(COUNTRY_CATALOG_URL).flush(countries);
    fixture.detectChanges();
    const quiz = fixture.debugElement.injector.get(QuizService);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    fixture.detectChanges();
    expect(quiz.answerIndex()).toBe(0);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(quiz.hasAnswered()).toBe(false);
    fixture.destroy();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
    expect(quiz.hasAnswered()).toBe(false);
  });

  it('leaves Enter on an answer option to native activation and ignores out-of-range numbers', () => {
    const fixture = TestBed.createComponent(Page);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne(COUNTRY_CATALOG_URL).flush(countries);
    fixture.detectChanges();
    const quiz = fixture.debugElement.injector.get(QuizService);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '9' }));
    const answer = fixture.nativeElement.querySelector('.countries button') as HTMLButtonElement;
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    answer.dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(false);
    expect(quiz.hasAnswered()).toBe(false);
    answer.click();
    fixture.detectChanges();
    expect(quiz.hasAnswered()).toBe(true);
  });

  it('does not accept shortcuts while loading or Enter before an answer', () => {
    const fixture = TestBed.createComponent(Page);
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    TestBed.inject(HttpTestingController).expectOne(COUNTRY_CATALOG_URL).flush(countries);
    fixture.detectChanges();
    const quiz = fixture.debugElement.injector.get(QuizService);
    const question = quiz.countries();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(quiz.hasAnswered()).toBe(false);
    expect(quiz.countries()).toBe(question);
  });

  it('presents a question heading, visible shortcut help and numbered answer options', () => {
    const fixture = TestBed.createComponent(Page);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne(COUNTRY_CATALOG_URL).flush(countries);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('h1')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('.keyboard-hints')?.textContent).toMatch(/1.*4/);
    const numbers = fixture.nativeElement.querySelectorAll('.option-number');
    expect(numbers).toHaveLength(4);
    expect(numbers[0].textContent.trim()).toBe('1');
    expect(numbers[3].textContent.trim()).toBe('4');
  });

  it('accepts shortcuts from the programmatically focused main landmark', () => {
    const fixture = TestBed.createComponent(Page);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne(COUNTRY_CATALOG_URL).flush(countries);
    fixture.detectChanges();
    const main = document.createElement('main');
    main.tabIndex = -1;
    document.body.append(main);
    try {
      main.focus();
      main.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }));
      expect(fixture.debugElement.injector.get(QuizService).answerIndex()).toBe(0);
    } finally {
      main.remove();
    }
  });

  it('names the correct answer visibly after an incorrect answer, without relying on color', () => {
    const fixture = TestBed.createComponent(Page);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne(COUNTRY_CATALOG_URL).flush(countries);
    fixture.detectChanges();
    const quiz = fixture.debugElement.injector.get(QuizService);
    const wrong = (quiz.correctAnswerIndex() + 1) % quiz.countries().length;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: String(wrong + 1) }));
    fixture.detectChanges();
    const feedback = fixture.nativeElement.querySelector('.quiz-feedback');
    expect(feedback).not.toBeNull();
    expect(feedback.classList.contains('visually-hidden')).toBe(false);
    expect(feedback.getAttribute('aria-live')).toBe('polite');
    expect(feedback.textContent).toContain(quiz.correctCountry()!.name.en);
    expect(feedback.textContent).toMatch(/incorrect|неверно/i);
    expect(feedback.textContent).toContain(String(quiz.correctAnswerIndex() + 1));
  });

  it('names a revealed answer and keeps keyboard help in no-choice mode', () => {
    TestBed.inject(SettingsService).setNoChoices(true);
    const fixture = TestBed.createComponent(Page);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne(COUNTRY_CATALOG_URL).flush(countries);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.keyboard-hints')?.textContent).toContain('Enter');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    const quiz = fixture.debugElement.injector.get(QuizService);
    expect(fixture.nativeElement.querySelector('.quiz-feedback')?.textContent).toContain(
      quiz.correctCountry()!.name.en,
    );
  });

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
});
