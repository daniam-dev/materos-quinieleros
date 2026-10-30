import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  inject,
  Injector,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { QuinielaStore } from './core/data/quiniela-store';
import { MqButton } from './shared/ui/button';
import { MqLoadingState } from './shared/ui/loading-state';
import { MqEmptyState } from './shared/ui/empty-state';
import { AuthService } from './core/auth/auth-service';
@Component({
  selector: 'mq-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MqButton, MqLoadingState, MqEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<a href="#main-content" class="skip-link">Saltar al contenido</a>
    <header class="site-header">
      <div class="nav-container">
        <a routerLink="/jornadas" class="brand" aria-label="Materos Quinieleros, Jornadas"
          ><svg class="brand-symbol" viewBox="0 0 36 36" aria-hidden="true">
            <path d="M5 27V9l13 14L31 9v18M5 9l13 14L31 9M18 23v7" /></svg
          ><span>materos <span class="brand-subtitle">QUINIELEROS</span></span></a
        >
        <nav aria-label="Navegación principal">
          <a routerLink="/jornadas" routerLinkActive="active" ariaCurrentWhenActive="page"
            >Jornadas</a
          ><a routerLink="/clasificacion" routerLinkActive="active" ariaCurrentWhenActive="page"
            >Clasificación</a
          >
          @if (auth.isAdmin()) {
            <a routerLink="/administracion" routerLinkActive="active" ariaCurrentWhenActive="page"
              >Administración</a
            >
          }
        </nav>
      </div>
    </header>
    <main id="main-content" class="page-container" tabindex="-1">
      @if (store.isLoading() && !store.snapshot()) {
        <mq-loading-state />
      } @else if (store.hasError() && !store.snapshot()) {
        <mq-empty-state
          title="No hemos podido cargar las quinielas"
          message="Vuelve a intentarlo para recuperar la temporada."
          ><mq-button (activated)="store.load()">Reintentar</mq-button></mq-empty-state
        >
      } @else {
        <router-outlet />
      }
    </main>
    <footer class="site-footer">
      <span>Materos Quinieleros</span>
      @if (!auth.isAdmin()) {
        <a routerLink="/acceso">Acceder</a>
      }
    </footer>`,
})
export class App {
  readonly auth = inject(AuthService);
  readonly store = inject(QuinielaStore);
  constructor() {
    const document = inject(DOCUMENT);
    const injector = inject(Injector);
    let initialNavigation = true;
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        if (initialNavigation) {
          initialNavigation = false;
          return;
        }
        afterNextRender(
          () => document.getElementById('main-content')?.focus({ preventScroll: true }),
          { injector },
        );
      });
  }
}
