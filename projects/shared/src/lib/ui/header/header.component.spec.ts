import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HeaderComponent } from './header.component';

describe('Header navigation', () => {
  it('exposes a skip link and labeled native navigation without a page heading', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a[href="#main-content"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('nav[aria-label]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/list"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/settings"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('h1')).toBeNull();
  });
});
