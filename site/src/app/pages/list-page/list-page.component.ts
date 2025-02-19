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
  selector: 'app-list-page',
  imports: [],
  templateUrl: './list-page.component.html',
  styleUrl: './list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListPageComponent {
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
