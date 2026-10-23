import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { type Country } from '@flag-connect/flag-domain';
import { Observable, shareReplay } from 'rxjs';

export const COUNTRY_CATALOG_URL =
  'https://cdn.jsdelivr.net/gh/vdistortion/country-flags@0.1.0/countries.json';
export const FLAG_CDN_BASE_URL =
  'https://cdn.jsdelivr.net/gh/vdistortion/country-flags@0.1.0/flags/';

@Injectable({ providedIn: 'root' })
export class CountryCatalogService {
  private readonly http = inject(HttpClient);
  readonly countries: Observable<readonly Country[]> = this.http
    .get<readonly Country[]>(COUNTRY_CATALOG_URL)
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));
}
