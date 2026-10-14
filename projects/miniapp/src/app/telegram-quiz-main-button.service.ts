import { Injectable, OnDestroy } from '@angular/core';
import { TelegramApiService } from '@verse-bot/miniapp/angular';
import type { QuizMainButton } from 'shared';

interface MainButtonState {
  text: string;
  enabled: boolean;
  onClick: () => void;
}

interface TelegramMainButtonApi {
  enable(): void;
  disable(): void;
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
  private active = false;

  constructor(private readonly telegram: TelegramApiService) {}

  activate(): void {
    this.active = this.telegram.isApp();
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
    this.active = false;
  }

  private apply(): void {
    if (!this.active) return;

    this.removeClickListener?.();
    this.removeClickListener = null;

    if (!this.state) {
      this.telegram.mainButton.hide();
      return;
    }

    const state = this.state;
    this.telegram.mainButton.show(state.text);
    const nativeButton = (window as TelegramWindow).Telegram?.WebApp?.MainButton;
    if (state.enabled) nativeButton?.enable();
    else nativeButton?.disable();

    this.removeClickListener = this.telegram.mainButton.onClick(() => {
      if (this.state?.enabled) this.state.onClick();
    });
  }
}
