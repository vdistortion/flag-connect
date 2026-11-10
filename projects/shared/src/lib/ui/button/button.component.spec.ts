import { TestBed } from '@angular/core/testing';
import { ButtonComponent } from './button.component';

describe('ButtonComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('is a non-submitting native button', () => {
    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button').getAttribute('type')).toBe('button');
  });

  it('supports focus and native disabled activation semantics', () => {
    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.detectChanges();
    let clicks = 0;
    fixture.componentInstance.clicked.subscribe(() => clicks++);
    fixture.componentInstance.focus();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(document.activeElement).toBe(button);
    button.click();
    expect(clicks).toBe(1);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    button.click();
    expect(clicks).toBe(1);
  });
});
