import type { Routes } from '@angular/router';

export const flagConnectRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home-page/home-page.component').then((module) => module.HomePageComponent),
  },
  {
    path: 'list',
    loadComponent: () =>
      import('./pages/list-page/list-page.component').then((module) => module.ListPageComponent),
  },
  {
    path: 'quiz/flag',
    loadComponent: () =>
      import('./pages/quiz-flag-page/quiz-flag-page.component').then(
        (module) => module.QuizFlagPageComponent,
      ),
  },
  {
    path: 'quiz/country',
    loadComponent: () =>
      import('./pages/quiz-country-page/quiz-country-page.component').then(
        (module) => module.QuizCountryPageComponent,
      ),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/settings-page/settings-page.component').then(
        (module) => module.SettingsPageComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
