import { TestBed } from '@angular/core/testing';
import { QuizService } from './quiz.service';
import { SettingsService } from './settings.service';
import { WebStorageService } from './webstorage.service';
import { CountryCatalogService } from './country-catalog.service';
import type { Country } from '@flag-connect/flag-domain';
import { defer, of, Subject, throwError } from 'rxjs';
import { provideTestStorage } from '../testing/provide-test-storage';

const countries: readonly Country[] = Array.from({ length: 10 }, (_, index) => ({
  code: `C${index}`,
  name: { en: `Country ${index}`, ru: `Страна ${index}` },
  flag: [`c${index}.svg`],
}));

describe('QuizService asynchronous catalog', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideTestStorage()] }));
  afterEach(() => TestBed.resetTestingModule());
  it('creates the requested first question when the catalog arrives', () => {
    const catalog = new Subject<readonly Country[]>();
    TestBed.configureTestingModule({
      providers: [
        QuizService,
        { provide: CountryCatalogService, useValue: { countries: catalog } },
      ],
    });
    const quiz = TestBed.inject(QuizService);
    quiz.nextQuestion();
    expect(quiz.countries()).toHaveLength(0);
    catalog.next(countries);
    expect(quiz.correctCountry()).not.toBeNull();
  });

  it('reports an error and retries the failed catalog request', () => {
    const retry = new Subject<readonly Country[]>();
    let attempts = 0;
    const catalog = defer(() =>
      ++attempts === 1 ? throwError(() => new Error('offline')) : retry,
    );
    TestBed.configureTestingModule({
      providers: [
        QuizService,
        { provide: CountryCatalogService, useValue: { countries: catalog } },
      ],
    });
    const quiz = TestBed.inject(QuizService);
    quiz.nextQuestion();
    expect(quiz.status()).toBe('error');
    quiz.retry();
    expect(quiz.status()).toBe('loading');
    retry.next(countries);
    expect(quiz.status()).toBe('ready');
    expect(quiz.correctCountry()).not.toBeNull();
    expect(attempts).toBe(2);
  });
});

describe('QuizService without answer choices', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        QuizService,
        SettingsService,
        { provide: CountryCatalogService, useValue: { countries: of(countries) } },
        {
          provide: WebStorageService,
          useValue: {
            get: (key: string) => (key === 'fc-count' ? 1 : null),
            set: () => undefined,
            delete: () => undefined,
          },
        },
      ],
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  it('reveals the answer on request and resets for the next question', () => {
    const quiz = TestBed.inject(QuizService);

    quiz.nextQuestion();
    expect(quiz.noChoices()).toBe(true);
    expect(quiz.countries()).toHaveLength(1);
    expect(quiz.hasAnswered()).toBe(false);

    quiz.revealAnswer();
    expect(quiz.hasAnswered()).toBe(true);

    quiz.nextQuestion();
    expect(quiz.hasAnswered()).toBe(false);
  });

  it('migrates the saved no-choice setting and keeps a separate range value', () => {
    const settings = TestBed.inject(SettingsService);
    const quiz = TestBed.inject(QuizService);

    expect(settings.count()).toBe(4);
    expect(settings.noChoices()).toBe(true);
    expect(quiz.count()).toBe(1);

    settings.setCount(10);
    expect(settings.count()).toBe(10);
    expect(settings.noChoices()).toBe(true);

    settings.setNoChoices(false);
    expect(settings.noChoices()).toBe(false);
    expect(quiz.count()).toBe(10);

    settings.setCount(11);
    expect(settings.count()).toBe(10);

    settings.setNoChoices(true);
    expect(quiz.count()).toBe(1);
    expect(settings.count()).toBe(10);
  });
});
