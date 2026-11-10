import { TestBed } from '@angular/core/testing';
import { FlagComponent } from '../flag/flag.component';
import { PopupComponent } from '../popup/popup.component';

describe('Action icon identifiers', () => {
  it('uses a valid Iconify identifier and explicit size for flag variants', () => {
    const fixture = TestBed.createComponent(FlagComponent);
    fixture.componentRef.setInput('image', ['py.svg', 'py-reverse.svg']);
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('.flag__variant-button iconify-icon');
    expect(icon.getAttribute('icon')).toBe('mdi:image-multiple-outline');
    expect(icon.getAttribute('width')).toBe('24');
    expect(icon.getAttribute('height')).toBe('24');
  });

  it('uses a valid Iconify identifier and explicit size for closing previews', () => {
    const fixture = TestBed.createComponent(PopupComponent);
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('.popup__close iconify-icon');
    expect(icon.getAttribute('icon')).toBe('mdi:close-circle-outline');
    expect(icon.getAttribute('width')).toBe('24');
    expect(icon.getAttribute('height')).toBe('24');
  });
});
