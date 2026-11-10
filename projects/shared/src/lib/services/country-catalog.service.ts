import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { COUNTRY_CATALOG_URL, parseCountryCatalog, type Country } from '@flag-connect/flag-domain';
import { map, Observable, shareReplay } from 'rxjs';

export { COUNTRY_CATALOG_URL } from '@flag-connect/flag-domain';
export const FLAG_CDN_BASE_URL =
  'https://cdn.jsdelivr.net/gh/vdistortion/country-flags@0.1.0/flags/';

@Injectable({ providedIn: 'root' })
export class CountryCatalogService {
  private readonly http = inject(HttpClient);
  readonly countries: Observable<readonly Country[]> = this.http
    .get<unknown>(COUNTRY_CATALOG_URL)
    .pipe(map(parseCountryCatalog), shareReplay({ bufferSize: 1, refCount: false }));
}
