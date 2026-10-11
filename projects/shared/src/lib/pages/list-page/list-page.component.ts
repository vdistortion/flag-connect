import { NgOptimizedImage } from '@angular/common';
import { Component, signal } from '@angular/core';
import { countries, type Country } from '@flag-connect/flag-domain';
import { FlagComponent } from '../../ui/flag/flag.component';
import { PopupComponent } from '../../ui/popup/popup.component';

@Component({
  selector: 'app-list-page',
  imports: [FlagComponent, NgOptimizedImage, PopupComponent],
  templateUrl: './list-page.component.html',
  styleUrl: './list-page.component.scss',
})
export class ListPageComponent {
  protected readonly lang = signal<'ru' | 'en'>('ru');
  protected readonly popup = signal<{ src: string; alt: string } | null>(null);
  protected readonly countries: readonly Country[] = [...countries].sort((a, b) =>
    a.name.ru.localeCompare(b.name.ru, 'ru'),
  );

  toggleName(): void {
    this.lang.update((language) => (language === 'ru' ? 'en' : 'ru'));
  }

  showPopup(src: string, alt: string): void {
    this.popup.set({ src, alt });
  }

  hidePopup(): void {
    this.popup.set(null);
  }
}
