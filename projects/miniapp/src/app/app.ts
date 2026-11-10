import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { TelegramApiService } from '@verse-bot/miniapp/angular';
import { LanguageService } from 'shared';
import { filter } from 'rxjs';
import { TelegramQuizMainButtonService } from './telegram-quiz-main-button.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
})
export class App implements OnInit, OnDestroy {
  protected readonly tg = inject(TelegramApiService);
  protected readonly language = inject(LanguageService).language;
  private readonly document = inject(DOCUMENT);
  private destroyed = false;
  private readonly router = inject(Router);
  private readonly quizMainButton = inject(TelegramQuizMainButtonService);
  private readonly removeSettingsClick: VoidFunction[] = [];
  private readonly removeBackClick: VoidFunction[] = [];
  private readonly routeSubscription = this.router.events
    .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
    .subscribe(() => this.updateBackButton());

  async ngOnInit(): Promise<void> {
    const browser = this.document.defaultView as
      (Window & { initTelegramEnvironment?: VoidFunction }) | null;
    browser?.initTelegramEnvironment?.();
    await this.tg.init();
    if (this.destroyed) return;
    this.quizMainButton.activate();
    if (!this.tg.isApp()) return;

    this.tg.settingsButton.show();
    this.removeSettingsClick.push(
      this.tg.settingsButton.onClick(() => void this.router.navigateByUrl('/settings')),
    );
    this.removeBackClick.push(
      this.tg.backButton.onClick(() => void this.router.navigateByUrl('/')),
    );
    this.updateBackButton();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    const browser = this.document.defaultView as
      (Window & { cleanupTelegramEnvironment?: VoidFunction }) | null;
    browser?.cleanupTelegramEnvironment?.();
    this.routeSubscription.unsubscribe();
    this.removeSettingsClick.forEach((remove) => remove());
    this.removeBackClick.forEach((remove) => remove());
    this.tg.settingsButton.hide();
    this.tg.backButton.hide();
    this.tg.destroy();
  }

  private updateBackButton(): void {
    if (!this.tg.isApp()) return;
    if (this.router.url.split(/[?#]/, 1)[0] === '/') this.tg.backButton.hide();
    else this.tg.backButton.show();
  }
}
