import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { providePrimeNG } from 'primeng/config';
import { MaterosPreset } from './core/theme/materos-preset';
import { QUINIELA_REPOSITORY } from './core/data/quiniela-repository';
import { MockQuinielaRepository } from './core/data/mock-quiniela-repository';
import { ES_TRANSLATION } from './core/theme/es-translation';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    providePrimeNG({
      translation: ES_TRANSLATION,
      theme: {
        preset: MaterosPreset,
        options: {
          darkModeSelector: '.mq-dark',
          cssLayer: { name: 'primeng', order: 'theme, base, primeng, components, utilities' },
        },
      },
    }),
    { provide: QUINIELA_REPOSITORY, useClass: MockQuinielaRepository },
  ],
};
