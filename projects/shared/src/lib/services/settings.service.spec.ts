import { TestBed } from '@angular/core/testing';
import { SettingsService } from './settings.service';
import { WebStorageService } from './webstorage.service';
import { provideTestStorage } from '../testing/provide-test-storage';

describe('SettingsService sessions', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideTestStorage()] }));
  afterEach(() => TestBed.resetTestingModule());

  it('defaults round length to ten and persists only allowed lengths', () => {
    const settings = TestBed.inject(SettingsService);
    const storage = TestBed.inject(WebStorageService);
    expect(settings.roundLength()).toBe(10);
    for (const length of [10, 15, 20, 25, 30, 35, 40, 10]) {
      settings.setRoundLength(length);
      expect(settings.roundLength()).toBe(length);
      expect(storage.get('fc-round-length')).toBe(length);
    }
    for (const length of [0, 5, 6, 41, 10.5, NaN, Infinity]) settings.setRoundLength(length);
    expect(settings.roundLength()).toBe(10);
  });

  it('restores valid settings and falls back for malformed storage', () => {
    const storage = TestBed.inject(WebStorageService);
    storage.set('fc-session-mode', 'round');
    storage.set('fc-round-length', 20);
    const restored = TestBed.runInInjectionContext(() => new SettingsService());
    expect(restored.sessionMode()).toBe('round');
    expect(restored.roundLength()).toBe(20);
    storage.set('fc-session-mode', false);
    storage.set('fc-round-length', '5');
    const invalid = TestBed.runInInjectionContext(() => new SettingsService());
    expect(invalid.sessionMode()).toBe('zen');
    expect(invalid.roundLength()).toBe(10);
  });

  it('defaults to zen and validates persisted session mode changes', () => {
    const settings = TestBed.inject(SettingsService);
    const storage = TestBed.inject(WebStorageService);
    expect(settings.sessionMode()).toBe('zen');
    settings.setSessionMode('round');
    expect(settings.sessionMode()).toBe('round');
    expect(storage.get('fc-session-mode')).toBe('round');
    settings.setSessionMode('invalid' as 'zen');
    expect(settings.sessionMode()).toBe('round');
    settings.setSessionMode('zen');
    expect(settings.sessionMode()).toBe('zen');
    expect(storage.get('fc-session-mode')).toBe('zen');
  });
});
