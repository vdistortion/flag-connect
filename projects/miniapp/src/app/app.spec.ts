import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TelegramApiService } from '@verse-bot/miniapp/angular';
import { LanguageService } from 'shared';
import { App } from './app';
import { TelegramQuizMainButtonService } from './telegram-quiz-main-button.service';

describe('MiniApp shell', () => {
  it('reinitializes bootstrap environment listeners on every shell mount', async () => {
    const init = vi.fn();
    const cleanup = vi.fn();
    Object.assign(window, { initTelegramEnvironment: init, cleanupTelegramEnvironment: cleanup });
    const controller = () => ({ show: vi.fn(), hide: vi.fn(), onClick: vi.fn(() => vi.fn()) });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: TelegramApiService,
          useValue: {
            isApp: signal(false),
            init: vi.fn(async () => false),
            destroy: vi.fn(),
            settingsButton: controller(),
            backButton: controller(),
          },
        },
        { provide: TelegramQuizMainButtonService, useValue: { activate: vi.fn() } },
        { provide: LanguageService, useValue: { language: signal('en') } },
      ],
    });
    for (let mount = 0; mount < 2; mount++) {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(init).toHaveBeenCalledTimes(mount + 1);
      fixture.destroy();
      expect(cleanup).toHaveBeenCalledTimes(mount + 1);
    }
    delete (window as Window & { initTelegramEnvironment?: () => void }).initTelegramEnvironment;
    delete (window as Window & { cleanupTelegramEnvironment?: () => void })
      .cleanupTelegramEnvironment;
  });

  it('provides a skip target without a web header and cleans up Telegram events', async () => {
    const cleanup = vi.fn();
    Object.assign(window, { cleanupTelegramEnvironment: cleanup });
    const controller = () => ({ show: vi.fn(), hide: vi.fn(), onClick: vi.fn(() => vi.fn()) });
    const tg = {
      isApp: signal(true),
      init: vi.fn(async () => true),
      destroy: vi.fn(),
      settingsButton: controller(),
      backButton: controller(),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: TelegramApiService, useValue: tg },
        { provide: TelegramQuizMainButtonService, useValue: { activate: vi.fn() } },
        { provide: LanguageService, useValue: { language: signal('en') } },
      ],
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('main#main-content')).not.toBeNull();
    expect(element.querySelector('a[href="#main-content"]')).not.toBeNull();
    expect(element.querySelector('app-header')).toBeNull();
    fixture.destroy();
    expect(cleanup).toHaveBeenCalledOnce();
    expect(tg.destroy).toHaveBeenCalledOnce();
    delete (window as Window & { cleanupTelegramEnvironment?: () => void })
      .cleanupTelegramEnvironment;
  });
});
