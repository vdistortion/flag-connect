import { describe, expect, it } from 'vitest';
import { createQuestion, type Country } from './dist/index.js';

const countries: readonly Country[] = Array.from({ length: 12 }, (_, index) => ({
  code: `C${index}`,
  name: { en: `Country ${index}`, ru: `Страна ${index}` },
  flag: [`c${index}.svg`],
}));

describe('createQuestion', () => {
  it('creates a question with unique countries and a valid correct answer', () => {
    const question = createQuestion(5, () => 0.5, countries);

    expect(question.countries).toHaveLength(5);
    expect(new Set(question.countryIndexes).size).toBe(5);
    expect(question.correctAnswerIndex).toBeGreaterThanOrEqual(0);
    expect(question.correctAnswerIndex).toBeLessThan(5);
    expect(question.countries[question.correctAnswerIndex]).toBe(
      countries[question.countryIndexes[question.correctAnswerIndex]],
    );
  });

  it('supports a single answer choice', () => {
    const question = createQuestion(1, () => 0, countries);

    expect(question.countries).toHaveLength(1);
    expect(question.correctAnswerIndex).toBe(0);
  });

  it('can create questions from a separate catalog', () => {
    const catalog = countries.slice(0, 3);
    const question = createQuestion(2, () => 0, catalog);

    expect(question.countries).toHaveLength(2);
    expect(question.countries.every((country) => catalog.includes(country))).toBe(true);
  });

  it('rejects unsupported choice counts', () => {
    expect(() => createQuestion(0, Math.random, countries)).toThrow(RangeError);
    expect(() => createQuestion(11, Math.random, countries)).toThrow(RangeError);
    expect(() => createQuestion(2.5, Math.random, countries)).toThrow(RangeError);
  });
});
