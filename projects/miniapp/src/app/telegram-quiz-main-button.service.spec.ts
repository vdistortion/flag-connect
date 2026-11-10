import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TelegramApiService } from '@verse-bot/miniapp/angular';
import { TelegramQuizMainButtonService } from './telegram-quiz-main-button.service';

function nativeMainButton() {
  const listeners = new Set<() => void>();
  return {
    setText: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    onClick: vi.fn((listener: () => void) => listeners.add(listener)),
    offClick: vi.fn((listener: () => void) => listeners.delete(listener)),
    listeners,
  };
}

describe('TelegramQuizMainButtonService', () => {
  let button: ReturnType<typeof nativeMainButton>;
  let service: TelegramQuizMainButtonService;
  let telegram: {
    isApp: ReturnType<typeof signal<boolean>>;
    mainButton: {
      show: ReturnType<typeof vi.fn>;
      hide: ReturnType<typeof vi.fn>;
      onClick: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    button = nativeMainButton();
    vi.stubGlobal('Telegram', { WebApp: { MainButton: button } });
    telegram = {
      isApp: signal(true),
      mainButton: { show: vi.fn(), hide: vi.fn(), onClick: vi.fn(() => vi.fn()) },
    };
    TestBed.configureTestingModule({
      providers: [
        TelegramQuizMainButtonService,
        { provide: TelegramApiService, useValue: telegram },
      ],
    });
    service = TestBed.inject(TelegramQuizMainButtonService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  it('stays unavailable during server rendering without window', () => {
    vi.stubGlobal('window', undefined);
    expect(() => service.activate()).not.toThrow();
    expect(service.available()).toBe(false);
  });

  it('rejects a queued Next listener after results or a new round replaces its state', () => {
    const next = vi.fn();
    const restart = vi.fn();
    const answer = vi.fn();
    service.activate();
    service.set('Next', true, next);
    const staleNext = [...button.listeners][0];
    service.set('Play again', true, restart);

    expect(button.offClick).toHaveBeenCalledWith(staleNext);
    expect(button.listeners.size).toBe(1);
    staleNext();
    expect(next).not.toHaveBeenCalled();
    expect(restart).not.toHaveBeenCalled();

    const playAgain = [...button.listeners][0];
    playAgain();
    expect(restart).toHaveBeenCalledOnce();
    service.set('Answer', true, answer);
    staleNext();
    playAgain();
    expect(answer).not.toHaveBeenCalled();
    expect(restart).toHaveBeenCalledOnce();
  });

  it('disables the native action and ignores even a directly delivered click', () => {
    const action = vi.fn();
    service.activate();
    service.set('Choose an answer', false, action);
    expect(button.disable).toHaveBeenCalledOnce();
    [...button.listeners][0]();
    expect(action).not.toHaveBeenCalled();

    service.set('Next', true, action);
    expect(button.enable).toHaveBeenCalledOnce();
    [...button.listeners][0]();
    expect(action).toHaveBeenCalledOnce();
  });

  it.each([undefined, {}, { WebApp: {} }])(
    'stays unavailable without a native MainButton: %s',
    (native) => {
      vi.stubGlobal('Telegram', native);
      service.set('Next', true, vi.fn());
      expect(() => service.activate()).not.toThrow();
      expect(service.available()).toBe(false);
      service.hide();
      expect(button.show).not.toHaveBeenCalled();
      expect(telegram.mainButton.show).not.toHaveBeenCalled();
      expect(telegram.mainButton.hide).not.toHaveBeenCalled();
    },
  );

  it('retains Verse launch detection even when the official SDK is loaded', () => {
    telegram.isApp.set(false);
    service.activate();
    service.set('Next', true, vi.fn());
    expect(service.available()).toBe(false);
    expect(button.show).not.toHaveBeenCalled();
    expect(button.onClick).not.toHaveBeenCalled();
  });

  it('applies only the latest state set before activation', () => {
    const oldAction = vi.fn();
    const action = vi.fn();
    service.set('Old', true, oldAction);
    service.set('Next', true, action);
    expect(button.setText).not.toHaveBeenCalled();
    expect(button.onClick).not.toHaveBeenCalled();
    service.activate();
    expect(button.setText).toHaveBeenCalledExactlyOnceWith('Next');
    [...button.listeners][0]();
    expect(action).toHaveBeenCalledOnce();
    expect(oldAction).not.toHaveBeenCalled();
  });

  it('hides and unregisters the exact listener without allowing it to fire on later state', () => {
    const action = vi.fn();
    service.activate();
    service.set('Next', true, action);
    const stale = [...button.listeners][0];
    button.hide.mockClear();
    service.hide();
    expect(button.hide).toHaveBeenCalledOnce();
    expect(button.offClick).toHaveBeenCalledWith(stale);
    expect(button.listeners.size).toBe(0);
    stale();
    service.set('Play again', true, action);
    stale();
    expect(action).not.toHaveBeenCalled();
  });

  it('clears a preactivation state when hidden', () => {
    service.set('Next', true, vi.fn());
    service.hide();
    service.activate();
    expect(button.hide).toHaveBeenCalledOnce();
    expect(button.show).not.toHaveBeenCalled();
    expect(button.onClick).not.toHaveBeenCalled();
  });

  it('destroys the visible native button and rejects queued callbacks', () => {
    const action = vi.fn();
    service.activate();
    service.set('Next', true, action);
    const stale = [...button.listeners][0];
    button.hide.mockClear();
    service.ngOnDestroy();
    expect(service.available()).toBe(false);
    expect(button.hide).toHaveBeenCalledOnce();
    expect(button.offClick).toHaveBeenCalledWith(stale);
    expect(button.listeners.size).toBe(0);
    stale();
    service.set('Play again', true, action);
    stale();
    expect(action).not.toHaveBeenCalled();
    expect(button.onClick).toHaveBeenCalledOnce();
  });

  it('uses only the official native controller for an enabled action', () => {
    const action = vi.fn();
    service.activate();
    service.set('Next', true, action);

    expect(service.available()).toBe(true);
    expect(button.setText).toHaveBeenCalledWith('Next');
    expect(button.show).toHaveBeenCalledWith();
    expect(button.enable).toHaveBeenCalledOnce();
    expect(button.onClick).toHaveBeenCalledOnce();
    [...button.listeners][0]();
    expect(action).toHaveBeenCalledOnce();
    expect(telegram.mainButton.show).not.toHaveBeenCalled();
    expect(telegram.mainButton.hide).not.toHaveBeenCalled();
    expect(telegram.mainButton.onClick).not.toHaveBeenCalled();
  });
});
