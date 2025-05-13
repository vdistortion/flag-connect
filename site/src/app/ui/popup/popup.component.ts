import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-popup',
  imports: [IconComponent],
  templateUrl: './popup.component.html',
  styleUrl: './popup.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PopupComponent {
  @Output() close = new EventEmitter();
}
