import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { QUIZ_MAIN_BUTTON, SHOW_HOME_SETTINGS } from '../../services/quiz-main-button';
import { HomePageComponent } from './home-page.component';

describe('HomePageComponent settings fallback', () => {
  it('offers settings outside Telegram and hides them when Telegram is available', () => {
    const available = signal(false);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SHOW_HOME_SETTINGS, useValue: false },
        { provide: QUIZ_MAIN_BUTTON, useValue: { available, set: () => {}, hide: () => {} } },
      ],
    });
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-button[routerlink="settings"]')).not.toBeNull();
    available.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-button[routerlink="settings"]')).toBeNull();
  });
});
