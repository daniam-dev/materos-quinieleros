import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SeasonSnapshot } from '../../domain/models';
import { QuinielaRepository } from './quiniela-repository';

/** Respuesta pública: el servidor elimina los pronósticos antes del cierre. */
@Injectable()
export class HttpQuinielaRepository implements QuinielaRepository {
  private readonly http = inject(HttpClient);

  async loadSeason(): Promise<SeasonSnapshot> {
    const data = await firstValueFrom(this.http.get<SeasonSnapshot>('/api/season'));
    return data;
  }
}
