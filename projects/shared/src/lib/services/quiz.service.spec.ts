import { TestBed } from '@angular/core/testing';
import { QuizService } from './quiz.service';
import { SettingsService } from './settings.service';
import { WebStorageService } from './webstorage.service';

describe('QuizService without answer choices', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        QuizService,
        SettingsService,
        {
          provide: WebStorageService,
          useValue: { get: () => 1, set: () => undefined, delete: () => undefined },
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

  it('allows the no-choice mode and up to ten choices in settings', () => {
    const settings = TestBed.inject(SettingsService);

    expect(settings.count()).toBe(1);
    settings.setCount(10);
    expect(settings.count()).toBe(10);
    settings.setCount(11);
    expect(settings.count()).toBe(10);
    settings.setCount(1);
    expect(settings.count()).toBe(1);
  });
});
