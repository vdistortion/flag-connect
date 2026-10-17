import { NgOptimizedImage } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { countries, type Country } from '@flag-connect/flag-domain';
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
  protected readonly popup = signal<{ src: string; alt: string } | null>(null);
  protected readonly countries = computed(() =>
    [...countries].sort((a, b) =>
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
