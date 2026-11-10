import { describe, expect, it } from 'vitest';
import {
  COUNTRY_CATALOG_URL,
  createQuestion,
  parseCountryCatalog,
  type Country,
} from './dist/index.js';

const countries: readonly Country[] = Array.from({ length: 12 }, (_, index) => ({
  code: `C${index}`,
  name: { en: `Country ${index}`, ru: `Страна ${index}` },
  flag: [`c${index}.svg`],
}));

describe('parseCountryCatalog', () => {
  it('exports the pinned CDN catalog URL', () => {
    expect(COUNTRY_CATALOG_URL).toBe(
      'https://cdn.jsdelivr.net/gh/vdistortion/country-flags@0.1.0/countries.json',
    );
  });

  it('accepts a catalog with ten distinct countries', () => {
    const catalog = Array.from({ length: 10 }, (_, index) => ({
      code: `A${String.fromCharCode(65 + index)}`,
      name: { en: `Country ${index}`, ru: `Страна ${index}` },
      flag: [`flag-${index}.svg`],
    }));

    expect(parseCountryCatalog(catalog)).toEqual(catalog);
  });

  it('rejects an invalid catalog or incomplete country structure', () => {
    const catalog = Array.from({ length: 10 }, (_, index) => ({
      code: `A${String.fromCharCode(65 + index)}`,
      name: { en: `Country ${index}`, ru: `Страна ${index}` },
      flag: [`flag-${index}.svg`],
    }));
    for (const invalid of [
      null,
      {},
      'catalog',
      [null, ...catalog.slice(1)],
      [{ ...catalog[0], name: null }, ...catalog.slice(1)],
      [{ ...catalog[0], name: { en: ' ', ru: 'Страна' } }, ...catalog.slice(1)],
      [{ ...catalog[0], name: { en: 'Country', ru: 1 } }, ...catalog.slice(1)],
    ]) {
      expect(() => parseCountryCatalog(invalid)).toThrow();
    }
  });

  it('requires at least ten distinct uppercase two-letter codes', () => {
    const catalog = Array.from({ length: 10 }, (_, index) => ({
      code: `A${String.fromCharCode(65 + index)}`,
      name: { en: 'Country', ru: 'Страна' },
      flag: ['flag.svg'],
    }));
    for (const invalid of [
      catalog.slice(0, 9),
      [{ ...catalog[0], code: catalog[1].code }, ...catalog.slice(1)],
      [{ ...catalog[0], code: 'aa' }, ...catalog.slice(1)],
      [{ ...catalog[0], code: 'A1' }, ...catalog.slice(1)],
      [{ ...catalog[0], code: null }, ...catalog.slice(1)],
    ]) {
      expect(() => parseCountryCatalog(invalid)).toThrow();
    }
  });

  it('requires non-empty arrays of safe SVG basenames', () => {
    const catalog = Array.from({ length: 10 }, (_, index) => ({
      code: `A${String.fromCharCode(65 + index)}`,
      name: { en: 'Country', ru: 'Страна' },
      flag: ['flag.svg'],
    }));
    for (const flag of [
      null,
      [],
      'flag.svg',
      [null],
      [''],
      ['../x.svg'],
      ['x/y.svg'],
      ['x\\y.svg'],
      ['x%2f.svg'],
      ['x.svg?foo'],
      ['x.webp'],
      ['.svg'],
    ]) {
      expect(() => parseCountryCatalog([{ ...catalog[0], flag }, ...catalog.slice(1)])).toThrow();
    }
  });
});

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
