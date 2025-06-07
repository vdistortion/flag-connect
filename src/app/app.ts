import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './ui/header/header.component';
import { TelegramApiService } from './services/telegram-api.service';

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
      .then(() => this.tg.showSettingsButton())
      .catch(() => document.body.classList.add('bg'));
  }

  ngOnDestroy(): void {
    this.tg.destroy();
  }
}
