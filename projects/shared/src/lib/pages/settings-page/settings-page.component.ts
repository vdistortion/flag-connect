import { Component, inject } from '@angular/core';
import { QUIZ_SETTINGS, SettingsService } from '../../services/settings.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-settings-page',
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.scss',
})
export class SettingsPageComponent {
  protected readonly settings = inject(SettingsService);
  protected readonly messages = inject(LanguageService).messages;
  protected readonly minCount = QUIZ_SETTINGS.minCount;
  protected readonly maxCount = QUIZ_SETTINGS.maxCount;

  setCount(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;

    const value = Number(input.value);
    this.settings.setCount(value);
  }
}
