import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { mdiImageMultipleOutline, mdiCloseCircleOutline, mdiHome } from '@mdi/js';

@Component({
  selector: 'app-icon',
  imports: [],
  templateUrl: './icon.component.svg',
  styleUrl: './icon.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  @Input({ required: true }) icon!: string;
  @Input() size = 24;
  @Input() color = '';

  icons: Record<string, string> = {
    mdiImageMultipleOutline,
    mdiCloseCircleOutline,
    mdiHome,
  };
}
