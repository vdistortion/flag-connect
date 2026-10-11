import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-button',
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  readonly country = input(false);
  readonly error = input(false);
  readonly success = input(false);
  readonly disabled = input(false);
  readonly clicked = output<void>();
}
