import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { COUNTRY_CATALOG_URL } from '../../services/country-catalog.service';
import { ListPageComponent } from './list-page.component';

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
});
