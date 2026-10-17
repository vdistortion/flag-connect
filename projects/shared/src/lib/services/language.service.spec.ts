import { languageFromAcceptLanguage, languageFromTag } from './language.service';

describe('languageFromTag', () => {
  it('uses Russian for Russian language tags and English otherwise', () => {
    expect(languageFromTag('ru-RU')).toBe('ru');
    expect(languageFromTag('ru')).toBe('ru');
    expect(languageFromTag('en-US')).toBe('en');
    expect(languageFromTag('fr')).toBe('en');
    expect(languageFromTag(undefined)).toBe('en');
  });
});

describe('languageFromAcceptLanguage', () => {
  it('uses the highest-priority browser language', () => {
    expect(languageFromAcceptLanguage('ru-RU,ru;q=0.9,en-US;q=0.8')).toBe('ru');
    expect(languageFromAcceptLanguage('en-US,en;q=0.9,ru;q=0.8')).toBe('en');
    expect(languageFromAcceptLanguage('fr-FR,ru;q=0.8')).toBe('en');
    expect(languageFromAcceptLanguage(null)).toBe('en');
  });
});
