import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TelegramApiService } from '@verse-bot/miniapp/angular';
import { HeaderComponent } from './ui/header/header.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit, OnDestroy {
  protected tg = inject(TelegramApiService);

  async ngOnInit() {
    this.tg
      .init()
      .then(() => this.tg.api.showSettingsButton())
      .catch(() => document.body.classList.add('bg'));
  }

  ngOnDestroy(): void {
    this.tg.destroy();
  }
}
