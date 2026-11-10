import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
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
    '(keydown)': 'trapFocus($event)',
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
  readonly label = input('');

  constructor() {
    const previousFocus = this.document.activeElement;
    let restoreBackground: (() => void) | undefined;

    afterNextRender(() => {
      const body = this.document.body;
      const originalStyle = body.getAttribute('style');
      body.style.setProperty('overflow', 'hidden', 'important');
      const backgrounds = new Map<Element, string | null>();
      // Inert sibling branches at every level, never an ancestor of this dialog.
      let branch: Element = this.host.nativeElement;
      while (branch.parentElement) {
        const parent = branch.parentElement;
        for (const sibling of Array.from(parent.children)) {
          if (sibling === branch) continue;
          backgrounds.set(sibling, sibling.getAttribute('inert'));
          sibling.setAttribute('inert', '');
        }
        if (parent === body) break;
        branch = parent;
      }
      restoreBackground = () => {
        for (const [element, inert] of backgrounds) {
          if (inert === null) element.removeAttribute('inert');
          else element.setAttribute('inert', inert);
        }
        if (originalStyle === null) body.removeAttribute('style');
        else body.setAttribute('style', originalStyle);
      };
      this.closeButton()?.nativeElement.focus();
    });
    this.destroyRef.onDestroy(() => {
      restoreBackground?.();
      if (typeof HTMLElement !== 'undefined' && previousFocus instanceof HTMLElement) {
        previousFocus.focus();
      }
    });
  }

  trapFocus(event: Event): void {
    if (!(event instanceof KeyboardEvent) || event.key !== 'Tab') return;

    const dialog = this.host.nativeElement.querySelector('.popup__content');
    const focusable = Array.from(
      dialog?.querySelectorAll<HTMLElement>(
        'button, a[href], input, select, textarea, [tabindex]',
      ) ?? [],
    ).filter((element) => {
      if (
        element.tabIndex < 0 ||
        element.matches(':disabled') ||
        element.closest('[hidden], [inert], [aria-hidden="true"]')
      )
        return false;
      let ancestor: HTMLElement | null = element;
      while (ancestor && ancestor !== dialog) {
        const style = this.document.defaultView?.getComputedStyle(ancestor);
        if (style?.display === 'none' || style?.visibility === 'hidden') return false;
        ancestor = ancestor.parentElement;
      }
      return true;
    });
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

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
