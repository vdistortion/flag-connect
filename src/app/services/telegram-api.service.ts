import { inject, Injectable } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import {
  bindThemeParamsCssVars,
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
  private location = inject(Location);
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
      bindThemeParamsCssVars();
      this.on();
      this.isMiniApp$.subscribe();
    });
  }

  showMainButton(text: string): void {
    if (!this.isMiniApp$.value) return;
    setMainButtonParams({
      text,
      isEnabled: true,
      isVisible: true,
    });
  }

  hideMainButton(): void {
    if (!this.isMiniApp$.value) return;
    setMainButtonParams({
      isEnabled: false,
      isVisible: false,
    });
  }

  showSecondaryButton(text: string): void {
    if (!this.isMiniApp$.value) return;
    setSecondaryButtonParams({
      text,
      isEnabled: true,
      isVisible: true,
    });
  }

  hideSecondaryButton(): void {
    if (!this.isMiniApp$.value) return;
    setSecondaryButtonParams({
      isEnabled: false,
      isVisible: false,
    });
  }

  showSettingsButton(): void {
    if (!this.isMiniApp$.value) return;
    showSettingsButton();
  }

  hideSettingsButton(): void {
    if (!this.isMiniApp$.value) return;
    hideSettingsButton();
  }

  showBackButton(): void {
    if (!this.isMiniApp$.value) return;
    showBackButton();
  }

  hideBackButton(): void {
    if (!this.isMiniApp$.value) return;
    hideBackButton();
  }

  onMainButtonClick(cb?: Function): VoidFunction {
    if (!this.isMiniApp$.value) return () => {};
    return onMainButtonClick(() => {
      cb ? cb() : this.goBack();
    });
  }

  private onSecondaryButtonClick() {
    const listener = onSecondaryButtonClick(closeMiniApp);
    this.listeners.push(listener);
  }

  private onSettingsButtonClick() {
    const listener = onSettingsButtonClick(() => this.navigate('/settings'));
    this.listeners.push(listener);
  }

  private onBackButtonClick() {
    const listener = onBackButtonClick(() => this.goBack());
    this.listeners.push(listener);
  }

  private on() {
    this.onSecondaryButtonClick();
    this.onSettingsButtonClick();
    this.onBackButtonClick();
  }

  private off() {
    this.listeners.forEach((listener) => listener());
  }

  private navigate(url: string): void {
    this.router.navigateByUrl(url).catch(console.error);
  }

  private goBack() {
    if (window.history.length > 1) this.location.back();
    else this.navigate('/');
  }

  destroy() {
    if (!this.isMiniApp$.value) return;

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
