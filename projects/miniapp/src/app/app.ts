import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TelegramApiService } from '@verse-bot/miniapp/angular';
import { HeaderComponent } from './ui/header/header.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent],
  templateUrl: './app.html',
})
export class App implements OnInit, OnDestroy {
  protected readonly tg = inject(TelegramApiService);

  async ngOnInit() {
    await this.tg.init();
    this.tg.settingsButton.show();
  }

  ngOnDestroy(): void {
    this.tg.destroy();
  }
}
