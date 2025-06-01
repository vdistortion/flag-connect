import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { HeaderComponent } from './ui/header/header.component';
import { TelegramApiService } from './services/telegram-api.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private tg = inject(TelegramApiService);

  async ngOnInit() {
    this.tg.init().then(() => {
      this.router.events
        .pipe(filter((event) => event instanceof NavigationEnd))
        .subscribe((event) => {
          this.tg.showSecondaryButton('Закрыть');

          if (event.urlAfterRedirects === '/') {
            this.tg.showMainButton('Все флаги');
            this.tg.hideBackButton();
          } else {
            this.tg.showBackButton();
            this.tg.hideMainButton();
          }

          if (event.urlAfterRedirects === '/settings') {
            this.tg.hideSettingsButton();
          } else {
            this.tg.showSettingsButton();
          }
        });
    });
  }

  ngOnDestroy() {
    this.tg.destroy();
  }
}
