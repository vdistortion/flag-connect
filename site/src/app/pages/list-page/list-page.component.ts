import { ChangeDetectionStrategy, Component } from '@angular/core';
import countries from '../../../countries.json';
import { ICountry } from '../../flag.interface';
import { FlagComponent } from '../../ui/flag/flag.component';

@Component({
  selector: 'app-list-page',
  imports: [FlagComponent],
  templateUrl: './list-page.component.html',
  styleUrl: './list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListPageComponent {
  protected visibleName: boolean = true;
  protected countries: ICountry[] = countries.sort((a, b) => {
    if (a.name.ru.toLowerCase() < b.name.ru.toLowerCase()) {
      return -1;
    }
    if (a.name.ru.toLowerCase() > b.name.ru.toLowerCase()) {
      return 1;
    }
    return 0;
  });

  toggleName() {
    this.visibleName = !this.visibleName;
  }
}
