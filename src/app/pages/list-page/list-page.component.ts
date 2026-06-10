import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { TelegramApiService } from '@verse-bot/miniapp/angular';
import countries from '../../../../public/countries.json';
import { Country } from '../../flag.interface';
import { FlagComponent } from '../../ui/flag/flag.component';
import { PopupComponent } from '../../ui/popup/popup.component';

@Component({
  selector: 'app-list-page',
  imports: [FlagComponent, PopupComponent],
  templateUrl: './list-page.component.html',
  styleUrl: './list-page.component.scss',
})
export class ListPageComponent implements OnInit, OnDestroy {
  private tg = inject(TelegramApiService);
  private listeners: VoidFunction[] = [];
  protected srcFlag = '';
  protected isPopupVisible = false;
  protected lang: 'ru' | 'en' = 'ru';
  protected countries: Country[] = countries.sort((a, b) => {
    if (a.name.ru.toLowerCase() < b.name.ru.toLowerCase()) {
      return -1;
    }
    if (a.name.ru.toLowerCase() > b.name.ru.toLowerCase()) {
      return 1;
    }
    return 0;
  });

  ngOnInit(): void {
    this.listeners.push(this.tg.api.onMainButtonClick(() => {}));
    this.tg.api.showMainButton('Назад');
  }

  ngOnDestroy(): void {
    this.listeners.forEach((listener) => listener());
  }

  toggleName() {
    this.lang === 'ru' ? (this.lang = 'en') : (this.lang = 'ru');
  }

  showPopup(src: string) {
    this.srcFlag = src;
    this.isPopupVisible = true;
  }

  hidePopup() {
    this.srcFlag = '';
    this.isPopupVisible = false;
  }
}
