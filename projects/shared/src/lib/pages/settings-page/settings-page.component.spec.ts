import { TestBed } from '@angular/core/testing';
import { SettingsService } from '../../services/settings.service';
import { SettingsPageComponent } from './settings-page.component';
import { provideTestStorage } from '../../testing/provide-test-storage';

describe('SettingsPageComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideTestStorage()] }));
  it('offers zen and round modes with a discrete round-length control', () => {
    const fixture = TestBed.createComponent(SettingsPageComponent);
    fixture.detectChanges();
    const modes = fixture.nativeElement.querySelectorAll('input[name="session-mode"]');
    expect(modes).toHaveLength(2);
    expect(modes[0].checked).toBe(true);
    const length = fixture.nativeElement.querySelector('#round-length');
    expect(length.disabled).toBe(true);
    modes[1].click();
    fixture.detectChanges();
    expect(length.disabled).toBe(false);
    expect(length.max).toBe('6');
    length.value = '2';
    length.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('output[for="round-length"]').textContent).toContain(
      '20',
    );
  });
  it('labels the page and explains automatically saved settings', () => {
    const fixture = TestBed.createComponent(SettingsPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('h1')).toHaveLength(1);
    const range = fixture.nativeElement.querySelector('#answer-count');
    expect(range.getAttribute('aria-describedby')).toBe('answer-count-help');
    expect(fixture.nativeElement.querySelector('#answer-count-help')).not.toBeNull();
    range.value = '6';
    range.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(TestBed.inject(SettingsService).count()).toBe(6);
    const checkbox = fixture.nativeElement.querySelector('input[type="checkbox"]');
    checkbox.click();
    fixture.detectChanges();
    expect(range.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toMatch(
      /saved|сохран/i,
    );
  });
});
