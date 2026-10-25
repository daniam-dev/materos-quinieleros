import { Routes } from '@angular/router';

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
  { path: '**', loadComponent: () => import('./shared/not-found').then((m) => m.NotFound) },
];
