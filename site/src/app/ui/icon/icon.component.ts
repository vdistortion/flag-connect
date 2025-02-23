import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { mdiImageMultipleOutline } from '@mdi/js';

@Component({
  selector: 'app-icon',
  imports: [],
  templateUrl: './icon.component.svg',
  styleUrl: './icon.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  @Input({ required: true }) public icon!: string;
  @Input() public size: number = 24;
  @Input() public color: string = '';

  public icons: any = {
    mdiImageMultipleOutline,
  };
}
