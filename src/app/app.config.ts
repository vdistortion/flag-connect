import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTelegramApi } from '@verse-bot/miniapp/angular';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(),
    provideTelegramApi({
      onBack: () => window.history.back(),
      onSettings: () => {
        // router.push('/settings');
      },
    }),
  ],
};
