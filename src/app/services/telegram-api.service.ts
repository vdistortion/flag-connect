import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import {
  closeMiniApp,
  disableVerticalSwipes,
  hideBackButton,
  hideSettingsButton,
  init,
  miniApp,
  miniAppReady,
  mountBackButton,
  mountClosingBehavior,
  mountMainButton,
  mountSecondaryButton,
  mountSettingsButton,
  mountSwipeBehavior,
  mountViewport,
  onBackButtonClick,
  onMainButtonClick,
  onSecondaryButtonClick,
  onSettingsButtonClick,
  setMainButtonParams,
  setSecondaryButtonParams,
  showBackButton,
  showSettingsButton,
  unmountBackButton,
  unmountClosingBehavior,
  unmountMainButton,
  unmountSecondaryButton,
  unmountSettingsButton,
  unmountSwipeBehavior,
  unmountViewport,
} from '@telegram-apps/sdk';

@Injectable({
  providedIn: 'root',
})
export class TelegramApiService {
  private router = inject(Router);
  private listeners: VoidFunction[] = [];
  public isMiniApp$ = new BehaviorSubject(false);

  private install() {
    return new Promise<void>((resolve, reject) => {
      try {
        init();
        mountViewport.ifAvailable();
        mountSwipeBehavior.ifAvailable();
        mountClosingBehavior.ifAvailable();
        mountMainButton.ifAvailable();
        mountSecondaryButton.ifAvailable();
        mountSettingsButton.ifAvailable();
        mountBackButton.ifAvailable();
        miniApp.mountSync.ifAvailable();
        this.isMiniApp$.next(true);
        resolve();
      } catch (e) {
        this.isMiniApp$.next(false);
        reject(e);
      }
    });
  }

  async init() {
    return this.install().then(() => {
      disableVerticalSwipes.ifAvailable();
      miniAppReady.ifAvailable();
      this.on();
      this.isMiniApp$.subscribe();
    });
  }

  showMainButton(text: string): void {
    setMainButtonParams({
      text,
      isEnabled: true,
      isVisible: true,
    });
  }

  hideMainButton(): void {
    setMainButtonParams({
      isEnabled: false,
      isVisible: false,
    });
  }

  showSecondaryButton(text: string): void {
    setSecondaryButtonParams({
      text,
      isEnabled: true,
      isVisible: true,
    });
  }

  hideSecondaryButton(): void {
    setSecondaryButtonParams({
      isEnabled: false,
      isVisible: false,
    });
  }

  showSettingsButton(): void {
    showSettingsButton();
  }

  hideSettingsButton(): void {
    hideSettingsButton();
  }

  showBackButton(): void {
    showBackButton();
  }

  hideBackButton(): void {
    hideBackButton();
  }

  onMainButtonClick() {
    const listener = onMainButtonClick(() => {
      this.router.navigateByUrl('/list').catch(console.error);
    });

    this.listeners.push(listener);
  }

  onSecondaryButtonClick() {
    const listener = onSecondaryButtonClick(closeMiniApp);

    this.listeners.push(listener);
  }

  onSettingsButtonClick() {
    const listener = onSettingsButtonClick(() => {
      this.router.navigateByUrl('/settings').catch(console.error);
    });

    this.listeners.push(listener);
  }

  onBackButtonClick() {
    const listener = onBackButtonClick(() => {
      this.router.navigateByUrl('/').catch(console.error);
    });

    this.listeners.push(listener);
  }

  on() {
    this.onMainButtonClick();
    this.onSecondaryButtonClick();
    this.onSettingsButtonClick();
    this.onBackButtonClick();
  }

  off() {
    this.listeners.forEach((listener) => listener());
  }

  destroy() {
    this.off();
    unmountViewport();
    unmountSwipeBehavior();
    unmountClosingBehavior();
    unmountMainButton();
    unmountSecondaryButton();
    unmountSettingsButton();
    unmountBackButton();
    unmountMainButton();
  }
}
