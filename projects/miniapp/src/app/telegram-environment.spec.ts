import { readFileSync } from 'node:fs';

const html = readFileSync('projects/miniapp/src/index.html', 'utf8');
const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)![1];

function run(webApp?: Record<string, unknown>) {
  document.documentElement.className = '';
  document.documentElement.removeAttribute('style');
  const host = { Telegram: webApp ? { WebApp: webApp } : undefined };
  new Function('window', 'document', 'navigator', bootstrap)(host, document, {
    languages: ['en'],
    language: 'en',
  });
  return host as typeof host & {
    initTelegramEnvironment?: () => void;
    cleanupTelegramEnvironment?: () => void;
  };
}

describe('MiniApp environment bootstrap', () => {
  it('hides browser navigation from launch evidence before the SDK signal initializes', () => {
    const style = document.createElement('style');
    style.textContent =
      html.match(/<style>([\s\S]*?)<\/style>/)![1] +
      readFileSync('projects/miniapp/src/theme.scss', 'utf8');
    const nav = document.createElement('nav');
    nav.className = 'miniapp-browser-nav';
    document.head.append(style);
    document.body.append(nav);
    try {
      run({ initData: 'launch-data', themeParams: {}, onEvent: vi.fn() });
      expect(getComputedStyle(nav).display).toBe('none');
      run({ initData: '', platform: 'unknown' });
      expect(getComputedStyle(nav).display).toBe('flex');
    } finally {
      style.remove();
      nav.remove();
    }
  });

  it('keeps the fixed popup inside asymmetric horizontal safe insets', () => {
    const style = document.createElement('style');
    style.textContent = readFileSync('projects/miniapp/src/theme.scss', 'utf8');
    const main = document.createElement('main');
    main.id = 'main-content';
    main.innerHTML = '<div class="popup"><div class="popup__content"></div></div>';
    document.head.append(style);
    document.body.append(main);
    try {
      const popupStyle = getComputedStyle(main.querySelector('.popup')!);
      expect(popupStyle.left).toBe('var(--miniapp-inset-left)');
      expect(popupStyle.right).toBe('var(--miniapp-inset-right)');
      const rootStyle = getComputedStyle(document.documentElement);
      expect(rootStyle.getPropertyValue('--miniapp-inset-left')).toContain(
        '--miniapp-content-safe-left',
      );
      expect(rootStyle.getPropertyValue('--miniapp-inset-right')).toContain(
        '--miniapp-content-safe-right',
      );
    } finally {
      style.remove();
      main.remove();
    }
  });

  it('updates theme and viewport insets and releases every event listener', () => {
    const listeners = new Map<string, () => void>();
    const webApp = {
      initData: 'launch-data',
      colorScheme: 'dark',
      themeParams: { bg_color: '#17212b' },
      viewportHeight: 640,
      viewportStableHeight: 680,
      safeAreaInset: { top: 24, bottom: 16, left: 0, right: 0 },
      contentSafeAreaInset: { top: 32, bottom: 8, left: 0, right: 0 },
      onEvent: vi.fn((event: string, listener: () => void) => listeners.set(event, listener)),
      offEvent: vi.fn((event: string) => listeners.delete(event)),
    };
    const host = run(webApp);
    expect(document.documentElement.style.getPropertyValue('--miniapp-viewport-height')).toBe(
      '640px',
    );
    expect(document.documentElement.style.getPropertyValue('--miniapp-content-safe-top')).toBe(
      '32px',
    );
    webApp.viewportHeight = 520;
    listeners.get('viewportChanged')?.();
    expect(document.documentElement.style.getPropertyValue('--miniapp-viewport-height')).toBe(
      '520px',
    );
    webApp.themeParams.bg_color = '#ffffff';
    listeners.get('themeChanged')?.();
    expect(document.documentElement.style.getPropertyValue('--miniapp-theme-bg-color')).toBe(
      '#ffffff',
    );
    host.cleanupTelegramEnvironment?.();
    expect(webApp.offEvent).toHaveBeenCalledTimes(4);
    expect(listeners.size).toBe(0);
  });

  it('replaces removed theme colors without touching SDK-owned variables', () => {
    const listeners = new Map<string, () => void>();
    const webApp = {
      initData: 'launch-data',
      colorScheme: 'dark',
      themeParams: { bg_color: '#17212b', button_color: '#ff0000' } as Record<string, string>,
      onEvent: (event: string, listener: () => void) => listeners.set(event, listener),
      offEvent: (event: string) => listeners.delete(event),
    };
    const host = run(webApp);
    expect(document.documentElement.style.getPropertyValue('--miniapp-theme-button-color')).toBe(
      '#ff0000',
    );
    document.documentElement.style.setProperty('--tg-theme-button-color', '#sdk-owned');
    webApp.themeParams = { bg_color: '#ffffff' };
    listeners.get('themeChanged')?.();
    expect(document.documentElement.style.getPropertyValue('--miniapp-theme-button-color')).toBe(
      '',
    );
    expect(document.documentElement.style.getPropertyValue('--miniapp-theme-bg-color')).toBe(
      '#ffffff',
    );
    expect(document.documentElement.style.getPropertyValue('--tg-theme-button-color')).toBe(
      '#sdk-owned',
    );
    host.cleanupTelegramEnvironment?.();
  });

  it('can restart environment listeners after repeated cleanup without duplicates', () => {
    const listeners = new Map<string, () => void>();
    const webApp = {
      initData: 'launch-data',
      colorScheme: 'dark',
      themeParams: { bg_color: '#17212b' },
      onEvent: vi.fn((event: string, listener: () => void) => listeners.set(event, listener)),
      offEvent: vi.fn((event: string) => listeners.delete(event)),
    };
    const host = run(webApp);
    host.initTelegramEnvironment?.();
    expect(webApp.onEvent).toHaveBeenCalledTimes(4);
    host.cleanupTelegramEnvironment?.();
    host.cleanupTelegramEnvironment?.();
    expect(webApp.offEvent).toHaveBeenCalledTimes(4);
    webApp.themeParams.bg_color = '#ffffff';
    host.initTelegramEnvironment?.();
    expect(listeners.size).toBe(4);
    expect(webApp.onEvent).toHaveBeenCalledTimes(8);
    expect(document.documentElement.style.getPropertyValue('--miniapp-theme-bg-color')).toBe(
      '#ffffff',
    );
    host.cleanupTelegramEnvironment?.();
  });

  it('does not mistake the SDK alone for a Telegram launch', () => {
    run({
      initData: '',
      platform: 'unknown',
      themeParams: { bg_color: '#ff0000' },
      onEvent: vi.fn(),
    });
    expect(document.documentElement.classList.contains('telegram-miniapp')).toBe(false);
    expect(document.documentElement.classList.contains('miniapp')).toBe(true);
    expect(document.documentElement.style.getPropertyValue('--tg-theme-bg-color')).toBe('');
  });
});
