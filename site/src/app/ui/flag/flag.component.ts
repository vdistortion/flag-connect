import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-flag',
  imports: [],
  templateUrl: './flag.component.html',
  styleUrl: './flag.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlagComponent {
  @Input() public error = false;
  @Input() public success = false;
  @Input() image: string[] = [];
  @Input() name: string = 'Flag';
}
