import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import type { Country } from '@flag-connect/flag-domain';
import { QuizService } from './quiz.service';
import { SettingsService } from './settings.service';
import { CountryCatalogService } from './country-catalog.service';
import { QUIZ_MAIN_BUTTON } from './quiz-main-button';
import { LanguageService } from './language.service';
import { provideTestStorage } from '../testing/provide-test-storage';

const countries: readonly Country[] = Array.from({ length: 10 }, (_, index) => ({
  code: `C${index}`,
  name: { en: `Country ${index}`, ru: `Страна ${index}` },
  flag: [`c${index}.svg`],
}));

describe('QuizService sessions', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideTestStorage(),
        { provide: CountryCatalogService, useValue: { countries: of(countries) } },
      ],
    }),
  );
  afterEach(() => TestBed.resetTestingModule());

  function round(): QuizService {
    const settings = TestBed.inject(SettingsService);
    settings.setSessionMode('round');
    settings.setRoundLength(10);
    const quiz = TestBed.inject(QuizService);
    quiz.nextQuestion();
    return quiz;
  }

  it('does not skip an unanswered question or accept invalid answer indexes', () => {
    const quiz = round();
    const country = quiz.correctCountry();
    const choices = quiz.countries();
    quiz.selectAnswer(NaN);
    quiz.selectAnswer(0.5);
    quiz.selectAnswer(-1);
    quiz.selectAnswer(quiz.count());
    expect(quiz.hasAnswered()).toBe(false);
    expect(quiz.results()).toEqual([]);
    quiz.nextQuestion();
    expect(quiz.countries()).toBe(choices);
    expect(quiz.correctCountry()).toBe(country);
  });

  it('counts reveals as self-study and cannot reveal before a question exists', () => {
    TestBed.inject(SettingsService).setNoChoices(true);
    const quiz = TestBed.inject(QuizService);
    quiz.revealAnswer();
    expect(quiz.hasAnswered()).toBe(false);
    expect(quiz.results()).toEqual([]);
    quiz.nextQuestion();
    const country = quiz.correctCountry();
    quiz.selectAnswer(0);
    quiz.revealAnswer();
    quiz.revealAnswer();
    expect(quiz.results()).toEqual([]);
    expect(quiz.correctCount()).toBe(0);
    expect(quiz.incorrectCount()).toBe(0);
    expect(quiz.revealedCount()).toBe(1);
    quiz.nextQuestion();
    expect(quiz.questionNumber()).toBe(2);
    expect(quiz.hasAnswered()).toBe(false);
  });

  it('snapshots all settings on the first question and restart applies current settings', () => {
    const settings = TestBed.inject(SettingsService);
    const quiz = TestBed.inject(QuizService);
    settings.setSessionMode('round');
    settings.setRoundLength(10);
    quiz.nextQuestion();
    expect(quiz.sessionMode()).toBe('round');
    settings.setSessionMode('zen');
    settings.setRoundLength(20);
    settings.setCount(10);
    settings.setNoChoices(true);
    expect(quiz.count()).toBe(4);
    expect(quiz.noChoices()).toBe(false);
    expect(quiz.sessionMode()).toBe('round');
    expect(quiz.roundLength()).toBe(10);
    quiz.selectAnswer(quiz.correctAnswerIndex());
    quiz.nextQuestion();
    expect(quiz.countries()).toHaveLength(4);
    quiz.restart();
    expect(quiz.sessionMode()).toBe('zen');
    expect(quiz.roundLength()).toBe(20);
    expect(quiz.noChoices()).toBe(true);
    expect(quiz.count()).toBe(1);
    expect(quiz.countries()).toHaveLength(1);
    expect(quiz.results()).toEqual([]);
    expect(quiz.questionNumber()).toBe(1);
    expect(quiz.completed()).toBe(false);
    expect(quiz.hasAnswered()).toBe(false);
  });

  it('keeps zen endless with targets unique until each catalog deck is exhausted', () => {
    const quiz = TestBed.inject(QuizService);
    quiz.nextQuestion();
    for (let deck = 0; deck < 3; deck++) {
      const targets = new Set<string>();
      for (let index = 0; index < countries.length; index++) {
        targets.add(quiz.correctCountry()!.code);
        quiz.selectAnswer(quiz.correctAnswerIndex());
        quiz.nextQuestion();
      }
      expect(targets.size).toBe(countries.length);
    }
    expect(quiz.completed()).toBe(false);
    expect(quiz.questionNumber()).toBe(31);
  });

  it('keeps zen history bounded while counting every answer and reveal', () => {
    const quiz = TestBed.inject(QuizService);
    quiz.nextQuestion();
    for (let index = 0; index < 220; index++) {
      quiz.selectAnswer(
        index % 2 ? (quiz.correctAnswerIndex() + 1) % quiz.count() : quiz.correctAnswerIndex(),
      );
      quiz.nextQuestion();
    }
    expect(quiz.correctCount()).toBe(110);
    expect(quiz.incorrectCount()).toBe(110);
    expect(quiz.questionNumber()).toBe(221);
    expect(quiz.results()).toHaveLength(0);
    TestBed.inject(SettingsService).setNoChoices(true);
    quiz.restart();
    quiz.revealAnswer();
    quiz.nextQuestion();
    expect(quiz.revealedCount()).toBe(1);
    expect(quiz.questionNumber()).toBe(2);
    expect(quiz.results()).toHaveLength(0);
  });

  it('finishes a self-study round without treating reveals as graded answers', () => {
    TestBed.inject(SettingsService).setNoChoices(true);
    const quiz = round();
    for (let index = 0; index < 10; index++) {
      quiz.revealAnswer();
      quiz.nextQuestion();
    }
    expect(quiz.completed()).toBe(true);
    expect(quiz.revealedCount()).toBe(10);
    expect(quiz.correctCount()).toBe(0);
    expect(quiz.incorrectCount()).toBe(0);
    expect(quiz.results()).toHaveLength(10);
    expect(quiz.results().every((result) => result.correct === null)).toBe(true);
  });

  it('caps a round to the available unique countries', () => {
    const settings = TestBed.inject(SettingsService);
    settings.setSessionMode('round');
    settings.setRoundLength(20);
    const quiz = TestBed.inject(QuizService);
    quiz.nextQuestion();
    expect(quiz.roundLength()).toBe(countries.length);
    const targets = new Set<string>();
    for (let index = 0; index < countries.length; index++) {
      targets.add(quiz.correctCountry()!.code);
      quiz.selectAnswer(quiz.correctAnswerIndex());
      quiz.nextQuestion();
    }
    expect(targets.size).toBe(countries.length);
    expect(quiz.completed()).toBe(true);
  });

  it('repeats only unique wrong targets as a finite round with full-catalog distractors', () => {
    const quiz = round();
    const wrong: Country[] = [];
    for (let index = 0; index < 10; index++) {
      if (index < 2) wrong.push(quiz.correctCountry()!);
      quiz.selectAnswer(
        index < 2 ? (quiz.correctAnswerIndex() + 1) % quiz.count() : quiz.correctAnswerIndex(),
      );
      quiz.nextQuestion();
    }
    quiz.repeatMistakes();
    expect(quiz.sessionMode()).toBe('round');
    expect(quiz.roundLength()).toBe(2);
    expect(quiz.results()).toEqual([]);
    expect(quiz.questionNumber()).toBe(1);
    const repeated: Country[] = [];
    for (let index = 0; index < 2; index++) {
      repeated.push(quiz.correctCountry()!);
      expect(quiz.countries()).toHaveLength(4);
      expect(new Set(quiz.countries().map((country) => country.code)).size).toBe(4);
      expect(quiz.countries().some((country) => !wrong.includes(country))).toBe(true);
      quiz.selectAnswer(quiz.correctAnswerIndex());
      quiz.nextQuestion();
    }
    expect(new Set(repeated)).toEqual(new Set(wrong));
    expect(quiz.completed()).toBe(true);
    const results = quiz.results();
    quiz.repeatMistakes();
    expect(quiz.results()).toBe(results);
    expect(quiz.completed()).toBe(true);
  });

  it('localizes final/results buttons and invalidates callbacks from earlier button states', () => {
    const button = { available: signal(true), set: vi.fn(), hide: vi.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: QUIZ_MAIN_BUTTON, useValue: button }],
    });
    const quiz = round();
    const language = TestBed.inject(LanguageService);
    const action = () => button.set.mock.lastCall![2] as () => void;
    const staleUnanswered = action();
    quiz.selectAnswer(quiz.correctAnswerIndex());
    staleUnanswered();
    expect(quiz.hasAnswered()).toBe(true);
    const staleNext = action();
    for (let index = 0; index < 9; index++) {
      quiz.nextQuestion();
      quiz.selectAnswer(quiz.correctAnswerIndex());
    }
    language.language.set('en');
    TestBed.tick();
    expect(button.set.mock.lastCall!.slice(0, 2)).toEqual(['Results', true]);
    staleNext();
    expect(quiz.completed()).toBe(false);
    action()();
    expect(button.set.mock.lastCall!.slice(0, 2)).toEqual(['Play again', true]);
    language.language.set('ru');
    TestBed.tick();
    expect(button.set.mock.lastCall!.slice(0, 2)).toEqual(['Ещё раз', true]);
    const restart = action();
    restart();
    expect(quiz.questionNumber()).toBe(1);
    expect(quiz.completed()).toBe(false);
    expect(quiz.results()).toEqual([]);
    quiz.selectAnswer(quiz.correctAnswerIndex());
    restart();
    expect(quiz.results()).toHaveLength(1);
    for (let index = 0; index < 9; index++) {
      quiz.nextQuestion();
      quiz.selectAnswer(quiz.correctAnswerIndex());
    }
    expect(button.set.mock.lastCall!.slice(0, 2)).toEqual(['Результат', true]);
    TestBed.resetTestingModule();
    expect(button.hide).toHaveBeenCalled();
  });

  it('records each answer once and completes only after advancing the answered final question', () => {
    const quiz = round();
    expect(quiz.sessionMode()).toBe('round');
    expect(quiz.roundLength()).toBe(10);
    expect(quiz.questionNumber()).toBe(1);
    for (let index = 0; index < 10; index++) {
      const country = quiz.correctCountry()!;
      quiz.selectAnswer(
        index === 1 ? (quiz.correctAnswerIndex() + 1) % quiz.count() : quiz.correctAnswerIndex(),
      );
      quiz.selectAnswer(quiz.correctAnswerIndex());
      expect(quiz.results()).toHaveLength(index + 1);
      expect(quiz.results()[index]).toEqual({ country, correct: index !== 1 });
      expect(quiz.questionNumber()).toBe(index + 1);
      expect(quiz.completed()).toBe(false);
      if (index < 9) quiz.nextQuestion();
    }
    expect(quiz.correctCount()).toBe(9);
    expect(quiz.incorrectCount()).toBe(1);
    expect(quiz.revealedCount()).toBe(0);
    const lastCountry = quiz.correctCountry();
    quiz.nextQuestion();
    expect(quiz.completed()).toBe(true);
    expect(quiz.correctCountry()).toBe(lastCountry);
    expect(quiz.questionNumber()).toBe(10);
    quiz.nextQuestion();
    expect(quiz.results()).toHaveLength(10);
    expect(quiz.correctCountry()).toBe(lastCountry);
  });
});
