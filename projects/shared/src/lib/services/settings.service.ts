import { inject, Injectable, signal } from '@angular/core';
import { WebStorageService } from './webstorage.service';

export const QUIZ_SETTINGS = {
  defaultCount: 4,
  noChoicesCount: 1,
  minCount: 2,
  maxCount: 10,
} as const;
const STORAGE_KEY = 'fc-count';
const NO_CHOICES_STORAGE_KEY = 'fc-no-choices';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly storage = inject(WebStorageService);
  private readonly savedCount = this.storage.get<unknown>(STORAGE_KEY);
  readonly count = signal(this.readChoiceCount(this.savedCount));
  readonly noChoices = signal(this.readNoChoices(this.savedCount));

  setCount(value: number): void {
    if (
      !Number.isInteger(value) ||
      value < QUIZ_SETTINGS.minCount ||
      value > QUIZ_SETTINGS.maxCount
    ) {
      return;
    }

    this.count.set(value);
    if (value === QUIZ_SETTINGS.defaultCount) this.storage.delete(STORAGE_KEY);
    else this.storage.set(STORAGE_KEY, value);
    this.storage.set(NO_CHOICES_STORAGE_KEY, this.noChoices());
  }

  setNoChoices(value: boolean): void {
    this.noChoices.set(value);
    this.storage.set(NO_CHOICES_STORAGE_KEY, value);
  }

  private readChoiceCount(value: unknown): number {
    return typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= QUIZ_SETTINGS.minCount &&
      value <= QUIZ_SETTINGS.maxCount
      ? value
      : QUIZ_SETTINGS.defaultCount;
  }

  private readNoChoices(savedCount: unknown): boolean {
    const savedValue = this.storage.get<unknown>(NO_CHOICES_STORAGE_KEY);
    return typeof savedValue === 'boolean'
      ? savedValue
      : savedCount === QUIZ_SETTINGS.noChoicesCount;
  }
}
