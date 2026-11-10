import { TestBed } from '@angular/core/testing';
import { FlagComponent } from './flag.component';

describe('FlagComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('focuses the answer button rather than the variant switch', () => {
    const fixture = TestBed.createComponent(FlagComponent);
    fixture.componentRef.setInput('image', ['a.svg', 'b.svg']);
    fixture.componentRef.setInput('selectable', true);
    fixture.detectChanges();
    fixture.componentInstance.focus();
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('.flag__image-button'));
  });

  it('does not emit a selection when disabled or not selectable', () => {
    const fixture = TestBed.createComponent(FlagComponent);
    fixture.componentRef.setInput('image', ['a.svg']);
    fixture.detectChanges();
    let selections = 0;
    fixture.componentInstance.selected.subscribe(() => selections++);
    fixture.componentInstance.selectFlag();
    expect(selections).toBe(0);
    fixture.componentRef.setInput('selectable', true);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    fixture.componentInstance.selectFlag();
    expect(selections).toBe(0);
  });

  it('shows a valid first image after the input changes', () => {
    const fixture = TestBed.createComponent(FlagComponent);
    fixture.componentRef.setInput('image', ['a.svg', 'b.svg']);
    fixture.detectChanges();
    fixture.componentInstance.nextFlag();
    fixture.detectChanges();
    fixture.componentRef.setInput('image', ['c.svg']);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img')?.getAttribute('src')).toContain('c.svg');
  });

  it('resets to the first variant for a different flag with multiple variants', () => {
    const fixture = TestBed.createComponent(FlagComponent);
    fixture.componentRef.setInput('image', ['a.svg', 'b.svg']);
    fixture.detectChanges();
    fixture.componentInstance.nextFlag();
    fixture.detectChanges();
    fixture.componentRef.setInput('image', ['c.svg', 'd.svg']);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img')?.getAttribute('src')).toContain('c.svg');
  });
});
