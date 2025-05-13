import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-flag',
  imports: [IconComponent],
  templateUrl: './flag.component.html',
  styleUrl: './flag.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlagComponent {
  @Input() error = false;
  @Input() success = false;
  @Input() image: string[] = [];
  @Input() name = 'Flag';
  @Input() aspectRatio = 0;
  @Output() onClick = new EventEmitter<string>();
  protected index = 0;

  nextFlag(e: Event) {
    if (this.image.length > 0) {
      e.stopPropagation();
      if (this.index > this.image.length - 2) this.index = 0;
      else this.index++;
    }
  }
}
