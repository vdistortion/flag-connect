import { NgOptimizedImage } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
  private readonly catalog = inject(CountryCatalogService);
  private readonly catalogCountries = toSignal(this.catalog.countries, { initialValue: [] });
  protected readonly popup = signal<{ src: string; alt: string } | null>(null);
  protected readonly countries = computed(() =>
    [...this.catalogCountries()].sort((a, b) =>
      a.name[this.language()].localeCompare(b.name[this.language()], this.language()),
    ),
  );

  showPopup(src: string, alt: string): void {
    this.popup.set({ src, alt });
  }

  hidePopup(): void {
    this.popup.set(null);
  }
}
