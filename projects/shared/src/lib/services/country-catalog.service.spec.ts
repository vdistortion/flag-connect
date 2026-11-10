import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { COUNTRY_CATALOG_URL } from '@flag-connect/flag-domain';
import { CountryCatalogService } from './country-catalog.service';

describe('CountryCatalogService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.resetTestingModule());

  it('rejects malformed CDN data instead of exposing it as countries', () => {
    const service = TestBed.inject(CountryCatalogService);
    let error: unknown;
    service.countries.subscribe({ error: (err: unknown) => (error = err) });
    TestBed.inject(HttpTestingController)
      .expectOne(COUNTRY_CATALOG_URL)
      .flush([{ code: 'AA' }]);
    expect(error).toBeInstanceOf(Error);
  });
});
