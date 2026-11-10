import { Injectable, OnDestroy, signal } from '@angular/core';
import { TelegramApiService } from '@verse-bot/miniapp/angular';
import type { QuizMainButton } from 'shared';

interface MainButtonState {
  text: string;
  enabled: boolean;
  onClick: () => void;
}

interface TelegramMainButtonApi {
  setText(text: string): unknown;
  show(): unknown;
  hide(): unknown;
  enable(): void;
  disable(): void;
  onClick(listener: VoidFunction): unknown;
  offClick(listener: VoidFunction): unknown;
}

interface TelegramWindow extends Window {
  Telegram?: {
    WebApp?: {
      MainButton?: TelegramMainButtonApi;
    };
  };
}

@Injectable()
export class TelegramQuizMainButtonService implements QuizMainButton, OnDestroy {
  private state: MainButtonState | null = null;
  private removeClickListener: VoidFunction | null = null;
  readonly available = signal(false);
  private nativeButton: TelegramMainButtonApi | null = null;

  constructor(private readonly telegram: TelegramApiService) {}

  activate(): void {
    this.nativeButton =
      typeof window === 'undefined'
        ? null
        : ((window as TelegramWindow).Telegram?.WebApp?.MainButton ?? null);
    this.available.set(this.telegram.isApp() && this.nativeButton !== null);
    this.apply();
  }

  set(text: string, enabled: boolean, onClick: () => void): void {
    this.state = { text, enabled, onClick };
    this.apply();
  }

  hide(): void {
    this.state = null;
    this.apply();
  }

  ngOnDestroy(): void {
    this.hide();
    this.available.set(false);
  }

  private apply(): void {
    if (!this.available()) return;

    this.removeClickListener?.();
    this.removeClickListener = null;

    if (!this.state) {
      this.nativeButton!.hide();
      return;
    }

    const state = this.state;
    const nativeButton = this.nativeButton!;
    nativeButton.setText(state.text);
    nativeButton.show();
    if (state.enabled) nativeButton.enable();
    else nativeButton.disable();

    const listener = () => {
      if (this.available() && this.state === state && state.enabled) state.onClick();
    };
    nativeButton.onClick(listener);
    this.removeClickListener = () => nativeButton.offClick(listener);
  }
}
