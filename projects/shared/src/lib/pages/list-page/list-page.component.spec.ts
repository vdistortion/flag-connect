import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { COUNTRY_CATALOG_URL } from '../../services/country-catalog.service';
import { ListPageComponent } from './list-page.component';
import { LanguageService } from '../../services/language.service';

const countries = Array.from({ length: 10 }, (_, i) => ({
  code: `C${String.fromCharCode(65 + i)}`,
  name: { en: `Country ${i}`, ru: `Страна ${i}` },
  flag: [`c${i}.svg`],
}));

describe('ListPageComponent catalog', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.resetTestingModule());

  it('labels search and filters by either language or code regardless of display language', () => {
    const fixture = TestBed.createComponent(ListPageComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne(COUNTRY_CATALOG_URL).flush(countries);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const search = root.querySelector<HTMLInputElement>('input[type="search"]');
    expect(search).not.toBeNull();
    expect(root.querySelector(`label[for="${search!.id}"]`)?.textContent).toBeTruthy();
    const filter = (query: string) => {
      search!.value = query;
      search!.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    for (const query of [' country 3 ', 'СТРАНА 3', 'cd']) {
      filter(query);
      expect(root.querySelectorAll('.flags app-flag')).toHaveLength(1);
      expect(root.querySelector('.flags h2')?.textContent).toContain('3');
    }
    TestBed.inject(LanguageService).language.set('ru');
    fixture.detectChanges();
    expect(root.querySelector('.flags h2')?.textContent).toContain('Страна 3');
  });

  it('shows a loading state and lets the user retry after an error', () => {
    const fixture = TestBed.createComponent(ListPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne(COUNTRY_CATALOG_URL)
      .flush('offline', { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    fixture.nativeElement.querySelector('[role="alert"] button').click();
    fixture.detectChanges();
    http.expectOne(COUNTRY_CATALOG_URL).flush(countries);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.flags app-flag')).toHaveLength(10);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    http.verify();
  });

  it('introduces the catalog, announces results and clears an empty search back to the input', () => {
    const fixture = TestBed.createComponent(ListPageComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne(COUNTRY_CATALOG_URL).flush(countries);
    TestBed.inject(LanguageService).language.set('en');
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('h1')?.textContent).toContain('All flags');
    expect(root.querySelector('.intro')?.textContent).toContain('preview');
    const search = root.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = 'no such country';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(root.querySelector('[aria-live="polite"]')?.textContent).toContain('0 of 10');
    expect(root.querySelector('.empty-state')?.textContent).toContain('No countries found');
    expect(root.querySelectorAll('.flags app-flag')).toHaveLength(0);
    root.querySelector<HTMLButtonElement>('.search-clear')!.click();
    fixture.detectChanges();
    expect(search.value).toBe('');
    expect(document.activeElement).toBe(search);
    expect(root.querySelectorAll('.flags app-flag')).toHaveLength(10);
    expect(root.querySelector('[aria-live="polite"]')?.textContent).toContain('10 of 10');
    TestBed.inject(LanguageService).language.set('ru');
    fixture.detectChanges();
    expect(root.querySelector('h1')?.textContent).toContain('Все флаги');
    expect(root.querySelector('label')?.textContent).toContain('Поиск');
    expect(root.querySelector('[aria-live="polite"]')?.textContent).toContain('10 из 10');
  });

  it('opens a named country preview from a catalog flag', () => {
    const fixture = TestBed.createComponent(ListPageComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne(COUNTRY_CATALOG_URL).flush(countries);
    TestBed.inject(LanguageService).language.set('en');
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    root.querySelector<HTMLButtonElement>('app-flag button')!.click();
    fixture.detectChanges();
    const dialog = root.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-label')).toContain('Country 0');
    expect(dialog?.querySelector('h2')?.textContent).toContain('Country 0');
    expect(dialog?.querySelector('img')?.alt).toBe('Country 0');
    root.querySelector<HTMLButtonElement>('.popup__close')!.click();
    fixture.detectChanges();
    expect(root.querySelector('[role="dialog"]')).toBeNull();
  });
});
