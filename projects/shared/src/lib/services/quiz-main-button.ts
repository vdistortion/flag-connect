import { InjectionToken, Signal } from '@angular/core';

export interface QuizMainButton {
  readonly available: Signal<boolean>;
  set(text: string, enabled: boolean, onClick: () => void): void;
  hide(): void;
}

export const QUIZ_MAIN_BUTTON = new InjectionToken<QuizMainButton>('QUIZ_MAIN_BUTTON');

export const QUIZ_LAYOUT = new InjectionToken<'web' | 'miniapp'>('QUIZ_LAYOUT', {
  providedIn: 'root',
  factory: () => 'web',
});

export const SHOW_HOME_SETTINGS = new InjectionToken<boolean>('SHOW_HOME_SETTINGS', {
  providedIn: 'root',
  factory: () => true,
});
