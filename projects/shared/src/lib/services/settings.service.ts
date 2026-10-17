import { inject, Injectable, signal } from '@angular/core';
import { WebStorageService } from './webstorage.service';

export const QUIZ_SETTINGS = {
  defaultCount: 4,
  noChoicesCount: 1,
  minCount: 2,
  maxCount: 10,
} as const;
const STORAGE_KEY = 'fc-count';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly storage = inject(WebStorageService);
  readonly count = signal(this.readCount());

  setCount(value: number): void {
    if (
      !Number.isInteger(value) ||
      (value !== QUIZ_SETTINGS.noChoicesCount &&
        (value < QUIZ_SETTINGS.minCount || value > QUIZ_SETTINGS.maxCount))
    ) {
      return;
    }

    this.count.set(value);
    if (value === QUIZ_SETTINGS.defaultCount) this.storage.delete(STORAGE_KEY);
    else this.storage.set(STORAGE_KEY, value);
  }

  private readCount(): number {
    const value = this.storage.get<unknown>(STORAGE_KEY);
    return typeof value === 'number' &&
      Number.isInteger(value) &&
      (value === QUIZ_SETTINGS.noChoicesCount ||
        (value >= QUIZ_SETTINGS.minCount && value <= QUIZ_SETTINGS.maxCount))
      ? value
      : QUIZ_SETTINGS.defaultCount;
  }
}
