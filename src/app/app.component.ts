import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './ui/header/header.component';
import { TelegramApiService } from './services/telegram-api.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit, OnDestroy {
  protected tg = inject(TelegramApiService);

  async ngOnInit() {
    this.tg
      .init()
      .then(() => this.tg.showSettingsButton())
      .catch(() => console.info('browser'));
  }

  ngOnDestroy(): void {
    this.tg.destroy();
  }
}
