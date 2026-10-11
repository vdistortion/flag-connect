import { Component } from '@angular/core';
import { countries, type Country } from '@flag-connect/flag-domain';
import { FlagComponent } from '../../ui/flag/flag.component';
import { PopupComponent } from '../../ui/popup/popup.component';

@Component({
  selector: 'app-list-page',
  imports: [FlagComponent, PopupComponent],
  templateUrl: './list-page.component.html',
  styleUrl: './list-page.component.scss',
})
export class ListPageComponent {
  protected srcFlag = '';
  protected isPopupVisible = false;
  protected lang: 'ru' | 'en' = 'ru';
  protected countries: Country[] = [...countries].sort((a, b) => {
    if (a.name.ru.toLowerCase() < b.name.ru.toLowerCase()) {
      return -1;
    }
    if (a.name.ru.toLowerCase() > b.name.ru.toLowerCase()) {
      return 1;
    }
    return 0;
  });

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
