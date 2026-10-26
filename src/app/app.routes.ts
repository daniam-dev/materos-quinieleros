import { Routes } from '@angular/router';
import { adminGuard } from './core/auth/admin-guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'jornadas' },
  {
    path: 'jornadas',
    title: 'Jornadas · Materos Quinieleros',
    loadComponent: () => import('./features/journeys/journeys-page').then((m) => m.JourneysPage),
  },
  {
    path: 'clasificacion',
    title: 'Clasificación · Materos Quinieleros',
    loadComponent: () =>
      import('./features/leaderboard/leaderboard-page').then((m) => m.LeaderboardPage),
  },
  {
    path: 'acceso',
    title: 'Acceder · Materos Quinieleros',
    loadComponent: () => import('./features/admin/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'administracion',
    title: 'Administración · Materos Quinieleros',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/admin-page').then((m) => m.AdminPage),
  },
  { path: '**', loadComponent: () => import('./shared/not-found').then((m) => m.NotFound) },
];
