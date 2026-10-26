import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { providePrimeNG } from 'primeng/config';
import { MaterosPreset } from './core/theme/materos-preset';
import { QUINIELA_REPOSITORY } from './core/data/quiniela-repository';
import { FileQuinielaRepository } from './core/data/file-quiniela-repository';
import { ES_TRANSLATION } from './core/theme/es-translation';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
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
    { provide: QUINIELA_REPOSITORY, useClass: FileQuinielaRepository },
  ],
};
