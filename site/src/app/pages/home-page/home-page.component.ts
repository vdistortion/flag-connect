import { ChangeDetectionStrategy, Component } from '@angular/core';
import flags from './../../../flags.json';

interface Flag {
  country: {
    en: string;
    ru: string;
  };
  flag: string[];
}

@Component({
  selector: 'app-home-page',
  imports: [],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  protected visibleName: boolean = true;
  protected flags: Flag[] = flags.sort((a, b) => {
    if (a.country.ru.toLowerCase() < b.country.ru.toLowerCase()) {
      return -1;
    }
    if (a.country.ru.toLowerCase() > b.country.ru.toLowerCase()) {
      return 1;
    }
    return 0;
  });

  toggleName() {
    this.visibleName = !this.visibleName;
  }
}
