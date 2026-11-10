import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { CountryCatalogService, FLAG_CDN_BASE_URL } from '../../services/country-catalog.service';
import { QUIZ_MAIN_BUTTON, SHOW_HOME_SETTINGS } from '../../services/quiz-main-button';
import { HomePageComponent } from './home-page.component';

describe('HomePageComponent settings fallback', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [{ provide: CountryCatalogService, useValue: { countries: of([]) } }],
    }),
  );

  it('selects three distinct catalog flags on each visit and keeps them stable while mounted', async () => {
    const countries = Array.from({ length: 10 }, (_, index) => ({
      code: `C${String.fromCharCode(65 + index)}`,
      name: { en: `Country ${index}`, ru: `Страна ${index}` },
      flag: [`c${index}.svg`],
    }));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CountryCatalogService, useValue: { countries: of(countries) } },
      ],
    });
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
      const first = TestBed.createComponent(HomePageComponent);
      first.detectChanges();
      await first.whenStable();
      const sources = () =>
        [...first.nativeElement.querySelectorAll('.flag-tile img')].map((img: HTMLImageElement) =>
          img.getAttribute('src'),
        );
      const selected = sources();
      expect(selected).toHaveLength(3);
      expect(new Set(selected).size).toBe(3);
      expect(selected).toEqual([0, 1, 2].map((i) => `${FLAG_CDN_BASE_URL}c${i}.svg`));
      random.mockReturnValue(0.99);
      first.detectChanges();
      expect(sources()).toEqual(selected);
      first.destroy();
      const second = TestBed.createComponent(HomePageComponent);
      second.detectChanges();
      await second.whenStable();
      const next = [...second.nativeElement.querySelectorAll('.flag-tile img')].map(
        (img: HTMLImageElement) => img.getAttribute('src'),
      );
      expect(next).toHaveLength(3);
      expect(next).not.toEqual(selected);
      expect(second.nativeElement.querySelector('.atlas-art').getAttribute('aria-hidden')).toBe(
        'true',
      );
    } finally {
      random.mockRestore();
    }
  });

  it('keeps navigation usable if the decorative catalog fails', async () => {
    const catalog = new Subject<never>();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CountryCatalogService, useValue: { countries: catalog } },
      ],
    });
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    catalog.error(new Error('offline'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.primary-link').getAttribute('href')).toBe(
      '/quiz/flag',
    );
    expect(fixture.nativeElement.querySelectorAll('.flag-tile')).toHaveLength(3);
    expect(fixture.nativeElement.querySelectorAll('.flag-tile img')).toHaveLength(0);
  });

  it('offers settings outside Telegram and hides them when Telegram is available', () => {
    const available = signal(false);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SHOW_HOME_SETTINGS, useValue: false },
        { provide: QUIZ_MAIN_BUTTON, useValue: { available, set: () => {}, hide: () => {} } },
      ],
    });
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a[routerlink="settings"]')).not.toBeNull();
    available.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a[routerlink="settings"]')).toBeNull();
  });

  it('offers named native links and a single page heading', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('h1')).toHaveLength(1);
    for (const path of ['quiz/flag', 'quiz/country', 'list']) {
      const link = fixture.nativeElement.querySelector(`a[routerlink="${path}"]`);
      expect(link?.getAttribute('href')).toBe(`/${path}`);
      expect(link?.textContent.trim().length).toBeGreaterThan(0);
      expect(link?.querySelector('button')).toBeNull();
    }
  });
});
