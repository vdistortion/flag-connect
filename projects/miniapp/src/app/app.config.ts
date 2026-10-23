import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTelegramApi } from '@verse-bot/miniapp/angular';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { QUIZ_MAIN_BUTTON, SHOW_HOME_SETTINGS } from 'shared';
import { TelegramQuizMainButtonService } from './telegram-quiz-main-button.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(withFetch()),
    provideTelegramApi(),
    TelegramQuizMainButtonService,
    { provide: QUIZ_MAIN_BUTTON, useExisting: TelegramQuizMainButtonService },
    { provide: SHOW_HOME_SETTINGS, useValue: false },
  ],
};
