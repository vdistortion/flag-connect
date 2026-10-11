import type { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { ListPageComponent } from './pages/list-page/list-page.component';
import { QuizCountryPageComponent } from './pages/quiz-country-page/quiz-country-page.component';
import { QuizFlagPageComponent } from './pages/quiz-flag-page/quiz-flag-page.component';
import { SettingsPageComponent } from './pages/settings-page/settings-page.component';

export const flagConnectRoutes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'list', component: ListPageComponent },
  { path: 'quiz/flag', component: QuizFlagPageComponent },
  { path: 'quiz/country', component: QuizCountryPageComponent },
  { path: 'settings', component: SettingsPageComponent },
];
