import { inject, Injectable, signal } from '@angular/core';
import { WebStorageService } from './webstorage.service';

export const QUIZ_SETTINGS = {
  defaultCount: 4,
  noChoicesCount: 1,
  minCount: 2,
  maxCount: 10,
} as const;
export type SessionMode = 'zen' | 'round';
const SESSION_MODE_STORAGE_KEY = 'fc-session-mode';
const ROUND_LENGTH_STORAGE_KEY = 'fc-round-length';
export const ROUND_LENGTHS = [10, 15, 20, 25, 30, 35, 40];
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
  readonly sessionMode = signal<SessionMode>(
    this.storage.get<unknown>(SESSION_MODE_STORAGE_KEY) === 'round' ? 'round' : 'zen',
  );

  private readonly savedRoundLength = this.storage.get<unknown>(ROUND_LENGTH_STORAGE_KEY);
  readonly roundLength = signal<number>(
    typeof this.savedRoundLength === 'number' && ROUND_LENGTHS.includes(this.savedRoundLength)
      ? this.savedRoundLength
      : 10,
  );

  setRoundLength(value: number): void {
    if (!ROUND_LENGTHS.includes(value)) return;
    this.roundLength.set(value);
    this.storage.set(ROUND_LENGTH_STORAGE_KEY, value);
  }

  setSessionMode(value: SessionMode): void {
    if (value !== 'zen' && value !== 'round') return;
    this.sessionMode.set(value);
    this.storage.set(SESSION_MODE_STORAGE_KEY, value);
  }

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
