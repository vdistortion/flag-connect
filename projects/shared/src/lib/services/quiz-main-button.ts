import { InjectionToken } from '@angular/core';

export interface QuizMainButton {
  set(text: string, enabled: boolean, onClick: () => void): void;
  hide(): void;
}

export const QUIZ_MAIN_BUTTON = new InjectionToken<QuizMainButton>('QUIZ_MAIN_BUTTON');

export const SHOW_HOME_SETTINGS = new InjectionToken<boolean>('SHOW_HOME_SETTINGS', {
  providedIn: 'root',
  factory: () => true,
});
