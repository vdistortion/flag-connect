import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonComponent } from '../../ui/button/button.component';
import { TelegramApiService } from '../../services/telegram-api.service';

@Component({
  selector: 'app-home-page',
  imports: [ButtonComponent, RouterLink],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  protected tg = inject(TelegramApiService);
  private listeners: VoidFunction[] = [];

  ngOnInit(): void {
    const offClick = this.tg.onMainButtonClick(() => this.router.navigateByUrl('/list'));
    this.listeners.push(offClick);
    this.tg.showMainButton('Все флаги');
    this.tg.hideBackButton();
  }

  ngOnDestroy(): void {
    this.listeners.forEach((listener) => listener());
    this.tg.showBackButton();
  }
}
