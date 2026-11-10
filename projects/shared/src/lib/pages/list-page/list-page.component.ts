import { NgOptimizedImage } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { type Country } from '@flag-connect/flag-domain';
import { CountryCatalogService } from '../../services/country-catalog.service';
import { LanguageService } from '../../services/language.service';
import { FlagComponent } from '../../ui/flag/flag.component';
import { PopupComponent } from '../../ui/popup/popup.component';

@Component({
  selector: 'app-list-page',
  imports: [FlagComponent, NgOptimizedImage, PopupComponent],
  templateUrl: './list-page.component.html',
  styleUrl: './list-page.component.scss',
})
export class ListPageComponent {
  protected readonly language = inject(LanguageService).language;
  protected readonly messages = inject(LanguageService).messages;
  private readonly catalog = inject(CountryCatalogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly catalogCountries = signal<readonly Country[]>([]);
  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly popup = signal<{ src: string; alt: string } | null>(null);
  protected readonly query = signal('');
  protected readonly copy = computed(() =>
    this.language() === 'ru'
      ? {
          search: 'Поиск страны',
          introduction:
            'Найдите страну по названию или коду. Нажмите на флаг, чтобы рассмотреть его подробнее.',
          hint: 'Название на русском, английском или код страны',
          clear: 'Очистить поиск',
          empty: 'Страны не найдены',
          emptyHint: 'Попробуйте другое название или код страны.',
          count: `${this.countries().length} из ${this.catalogCountries().length} стран`,
          preview: 'Просмотр флага',
        }
      : {
          search: 'Search countries',
          introduction:
            'Explore flags by country name or code. Select a flag to open a larger preview.',
          hint: 'English or Russian name, or country code',
          clear: 'Clear search',
          empty: 'No countries found',
          emptyHint: 'Try another country name or code.',
          count: `${this.countries().length} of ${this.catalogCountries().length} countries`,
          preview: 'Flag preview',
        },
  );
  protected readonly countries = computed(() =>
    this.catalogCountries()
      .filter((country) => {
        const query = this.query().trim().toLocaleLowerCase();
        return [country.name.ru, country.name.en, country.code].some((value) =>
          value.toLocaleLowerCase().includes(query),
        );
      })
      .sort((a, b) =>
        a.name[this.language()].localeCompare(b.name[this.language()], this.language()),
      ),
  );

  constructor() {
    this.loadCatalog();
  }

  protected retry(): void {
    if (this.status() === 'error') this.loadCatalog();
  }

  private loadCatalog(): void {
    this.status.set('loading');
    this.catalog.countries.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (countries) => {
        this.catalogCountries.set(countries);
        this.status.set('ready');
      },
      error: () => this.status.set('error'),
      complete: () => {
        if (this.status() === 'loading') this.status.set('error');
      },
    });
  }

  showPopup(src: string, alt: string): void {
    this.popup.set({ src, alt });
  }

  hidePopup(): void {
    this.popup.set(null);
  }
}
