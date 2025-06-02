import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import countries from '../../../../public/countries.json';
import { ICountry } from '../../flag.interface';
import { FlagComponent } from '../../ui/flag/flag.component';
import { PopupComponent } from '../../ui/popup/popup.component';
import { TelegramApiService } from '../../services/telegram-api.service';

@Component({
  selector: 'app-list-page',
  imports: [FlagComponent, PopupComponent],
  templateUrl: './list-page.component.html',
  styleUrl: './list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListPageComponent implements OnInit, OnDestroy {
  private tg = inject(TelegramApiService);
  private listeners: VoidFunction[] = [];
  protected srcFlag = '';
  protected isPopupVisible = false;
  protected lang: 'ru' | 'en' = 'ru';
  protected countries: ICountry[] = countries.sort((a, b) => {
    if (a.name.ru.toLowerCase() < b.name.ru.toLowerCase()) {
      return -1;
    }
    if (a.name.ru.toLowerCase() > b.name.ru.toLowerCase()) {
      return 1;
    }
    return 0;
  });

  ngOnInit(): void {
    this.listeners.push(this.tg.onMainButtonClick());
    this.tg.showMainButton('Назад');
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
