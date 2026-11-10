import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PopupComponent } from './popup.component';

@Component({
  imports: [PopupComponent],
  template: ` <header>Background header</header>
    <main>
      <button class="trigger" (click)="open.set(true)">Preview</button>
      <aside inert="original">Already inert</aside>
      @if (open()) {
        <app-popup label="Country preview" (close)="open.set(false)">
          <button hidden>Hidden control</button>
          <button disabled>Disabled control</button>
          <textarea aria-label="Notes"></textarea>
          <select aria-label="Variant">
            <option>First</option>
          </select>
        </app-popup>
      }
    </main>`,
})
class PopupHost {
  readonly open = signal(false);
}

describe('PopupComponent accessibility', () => {
  let originalStyle: string | null;
  beforeEach(() => {
    originalStyle = document.body.getAttribute('style');
    TestBed.configureTestingModule({});
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    if (originalStyle === null) document.body.removeAttribute('style');
    else document.body.setAttribute('style', originalStyle);
  });

  it('locks scrolling and inerts only background branches, restoring exact original attributes on close', async () => {
    document.body.setAttribute('style', 'color: red; overflow: scroll !important;');
    const before = document.body.getAttribute('style');
    const fixture = TestBed.createComponent(PopupHost);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const trigger = root.querySelector<HTMLButtonElement>('.trigger')!;
    trigger.focus();
    trigger.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.body.style.overflow).toBe('hidden');
    expect(root.querySelector('header')!.hasAttribute('inert')).toBe(true);
    expect(trigger.hasAttribute('inert')).toBe(true);
    expect(root.querySelector('aside')!.hasAttribute('inert')).toBe(true);
    const dialog = root.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.closest('[inert]')).toBeNull();
    expect(dialog.closest('[aria-hidden="true"]')).toBeNull();
    expect(document.activeElement).toBe(root.querySelector('.popup__close'));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(root.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.getAttribute('style')).toBe(before);
    expect(root.querySelector('header')!.hasAttribute('inert')).toBe(false);
    expect(trigger.hasAttribute('inert')).toBe(false);
    expect(root.querySelector('aside')!.getAttribute('inert')).toBe('original');
    expect(document.activeElement).toBe(trigger);
  });

  it('restores absent body styles and background state when destroyed while open', async () => {
    document.body.removeAttribute('style');
    const fixture = TestBed.createComponent(PopupHost);
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.body.style.overflow).toBe('hidden');
    fixture.destroy();
    expect(document.body.getAttribute('style')).toBeNull();
  });

  it('wraps Tab in both directions across visible controls including select and textarea', async () => {
    const fixture = TestBed.createComponent(PopupHost);
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const close = root.querySelector<HTMLButtonElement>('.popup__close')!;
    const last = root.querySelector<HTMLSelectElement>('select')!;
    close.focus();
    const backward = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    close.dispatchEvent(backward);

    expect(backward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);
    const forward = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    last.dispatchEvent(forward);
    expect(forward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(close);
  });

  it('keeps the close control inside the dialog above projected preview content', () => {
    const fixture = TestBed.createComponent(PopupHost);
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const close = getComputedStyle(root.querySelector('.popup__close')!);
    expect(close.top).toBe('16px');
    expect(close.right).toBe('16px');
    expect(Number(close.zIndex)).toBeGreaterThan(0);
    expect(getComputedStyle(root.querySelector('.popup__content')!).display).toBe('flex');
  });
});
