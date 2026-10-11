import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-button',
  imports: [],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  @Input() country = false;
  @Input() error = false;
  @Input() success = false;
  @Input() disabled = false;
  @Output() onClick = new EventEmitter<void>();
}
