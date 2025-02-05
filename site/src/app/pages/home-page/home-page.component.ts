import { ChangeDetectionStrategy, Component } from '@angular/core';
import flags from './../../../flags.json';

interface Flag {
  country: {
    en: string;
    ru: string;
  };
  flag: string;
}

@Component({
  selector: 'app-home-page',
  imports: [],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  public flags: Flag[] = flags;
}
