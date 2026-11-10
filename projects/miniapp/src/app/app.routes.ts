import type { Routes } from '@angular/router';
import { flagConnectRoutes } from 'shared';

export const routes: Routes = flagConnectRoutes.map((route) =>
  route.path === ''
    ? {
        path: '',
        loadComponent: () =>
          import('./miniapp-home.component').then((module) => module.MiniappHomeComponent),
      }
    : route,
);
