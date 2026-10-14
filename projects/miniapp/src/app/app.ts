import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { TelegramApiService } from '@verse-bot/miniapp/angular';
import { HeaderComponent } from 'shared';
import { filter } from 'rxjs';
import { TelegramQuizMainButtonService } from './telegram-quiz-main-button.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent],
  templateUrl: './app.html',
})
export class App implements OnInit, OnDestroy {
  protected readonly tg = inject(TelegramApiService);
  private readonly router = inject(Router);
  private readonly quizMainButton = inject(TelegramQuizMainButtonService);
  private readonly removeSettingsClick: VoidFunction[] = [];
  private readonly removeBackClick: VoidFunction[] = [];
  private readonly routeSubscription = this.router.events
    .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
    .subscribe(() => this.updateBackButton());

  async ngOnInit(): Promise<void> {
    await this.tg.init();
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
