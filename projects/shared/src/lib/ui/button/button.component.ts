import { Component, ElementRef, input, output, viewChild } from '@angular/core';

@Component({
  selector: 'app-button',
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  private readonly nativeButton = viewChild<ElementRef<HTMLButtonElement>>('nativeButton');
  readonly country = input(false);
  readonly answerOption = input(false);
  readonly error = input(false);
  readonly success = input(false);
  readonly disabled = input(false);
  readonly clicked = output<void>();

  focus(): void {
    this.nativeButton()?.nativeElement.focus();
  }
}
