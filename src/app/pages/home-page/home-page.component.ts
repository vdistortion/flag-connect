import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TelegramApiService } from '@verse-bot/miniapp/angular';
import { ButtonComponent } from '../../ui/button/button.component';

@Component({
  selector: 'app-home-page',
  imports: [ButtonComponent, RouterLink],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  protected tg = inject(TelegramApiService);
  private listeners: VoidFunction[] = [];

  ngOnInit(): void {
    const offClick = this.tg.api.onMainButtonClick(() => this.router.navigateByUrl('/list'));
    this.listeners.push(offClick);
    this.tg.api.showMainButton('Все флаги');
    this.tg.api.hideBackButton();
  }

  ngOnDestroy(): void {
    this.listeners.forEach((listener) => listener());
    this.tg.api.showBackButton();
  }
}
