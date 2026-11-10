import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LanguageService, flagConnectRoutes, QUIZ_MAIN_BUTTON, SHOW_HOME_SETTINGS } from 'shared';
import { signal } from '@angular/core';
import { routes } from './app.routes';

describe('MiniApp home', () => {
  it('honors native settings while keeping browser fallback settings accessible', async () => {
    const available = signal(false);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: LanguageService, useValue: { language: signal('en') } },
        { provide: SHOW_HOME_SETTINGS, useValue: false },
        { provide: QUIZ_MAIN_BUTTON, useValue: { available } },
      ],
    });
    const component = await routes.find((route) => route.path === '')!.loadComponent!();
    const fixture = TestBed.createComponent(component as import('@angular/core').Type<unknown>);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('a[href="/settings"]')).not.toBeNull();
    available.set(true);
    fixture.detectChanges();
    expect(element.querySelector('a[href="/settings"]')).toBeNull();
    expect(element.querySelectorAll('a')).toHaveLength(3);
    available.set(false);
    fixture.detectChanges();
    expect(element.querySelector('a[href="/settings"]')).not.toBeNull();
  });

  it('replaces only the shared home with a compact bilingual menu', async () => {
    const language = signal<'en' | 'ru'>('en');
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), { provide: LanguageService, useValue: { language } }],
    });
    const home = routes.find((route) => route.path === '')!;
    expect(home.loadComponent).not.toBe(flagConnectRoutes[0].loadComponent);
    const component = await home.loadComponent!();
    const fixture = TestBed.createComponent(component as import('@angular/core').Type<unknown>);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(Array.from(element.querySelectorAll('a')).map((a) => a.getAttribute('href'))).toEqual([
      '/quiz/flag',
      '/quiz/country',
      '/list',
      '/settings',
    ]);
    expect(element.textContent).toContain('Choose a quiz');
    expect(element.querySelector('.hero')).toBeNull();
    language.set('ru');
    fixture.detectChanges();
    expect(element.textContent).toContain('Выберите викторину');
    expect(element.textContent).toContain('Настройки');
    expect(routes.filter((route) => route.path !== '')).toEqual(
      flagConnectRoutes.filter((route) => route.path !== ''),
    );
  });
});
