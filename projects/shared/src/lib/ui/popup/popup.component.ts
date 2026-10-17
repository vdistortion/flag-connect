import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  output,
  viewChild,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-popup',
  imports: [IconComponent],
  host: {
    '(document:keydown.escape)': 'close.emit()',
    '(keydown.tab)': 'trapFocus($event)',
  },
  templateUrl: './popup.component.html',
  styleUrl: './popup.component.scss',
})
export class PopupComponent {
  protected readonly messages = inject(LanguageService).messages;
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef) as ElementRef<HTMLElement>;
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  readonly close = output<void>();

  constructor() {
    const previousFocus = this.document.activeElement;

    afterNextRender(() => this.closeButton()?.nativeElement.focus());
    this.destroyRef.onDestroy(() => {
      if (typeof HTMLElement !== 'undefined' && previousFocus instanceof HTMLElement) {
        previousFocus.focus();
      }
    });
  }

  trapFocus(event: Event): void {
    if (!(event instanceof KeyboardEvent)) return;

    const focusable = this.host.nativeElement.querySelectorAll<HTMLElement>(
      '.popup__content button:not([disabled]), .popup__content [href], .popup__content input:not([disabled]), .popup__content [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable.item(0);
    const last = focusable.item(focusable.length - 1);
    if (!first || !last) return;

    if (event.shiftKey && this.document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && this.document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
