import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SeasonSnapshot } from '../../domain/models';
import { AuthService } from '../auth/auth-service';

export interface AdminSnapshot {
  readonly snapshot: SeasonSnapshot;
  readonly revision: string;
}
export type AdminCommand =
  | { type: 'sync' }
  | { type: 'add-participant'; name: string; surname: string }
  | { type: 'set-active'; participantId: string; active: boolean }
  | { type: 'set-current'; journeyId: string | null }
  | {
      type: 'create-journey';
      number: number;
      competition: 'league' | 'europe';
      closesAt: string;
      fixtures: { home: string; away: string; kickoff: string }[];
    }
  | {
      type: 'save-predictions';
      journeyId: string;
      participantId: string;
      signs: string[];
      pleno: { home: string; away: string };
    };

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  load(): Promise<AdminSnapshot> {
    return firstValueFrom(this.http.get<AdminSnapshot>('/api/admin'));
  }
  async save(command: AdminCommand, revision: string): Promise<void> {
    await firstValueFrom(
      this.http.post('/api/admin', command, { headers: { 'If-Match': revision } }),
    );
  }
  message(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 403 && error.error?.code === 'SESSION_REQUIRED') {
        this.auth.expire();
        void this.router.navigateByUrl('/acceso');
        return 'La sesión ha caducado. Vuelve a acceder.';
      }
      if (error.status === 429)
        return 'Demasiados intentos. Espera un minuto y vuelve a intentarlo.';
      if (typeof error.error?.message === 'string') return error.error.message;
    }
    return 'No se ha podido completar la operación. Vuelve a intentarlo.';
  }
}
