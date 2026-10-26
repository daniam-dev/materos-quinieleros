import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SeasonSnapshot } from '../../domain/models';
import { QuinielaRepository } from './quiniela-repository';

/** Datos públicos mantenidos en el proyecto hasta incorporar el servidor. */
@Injectable()
export class FileQuinielaRepository implements QuinielaRepository {
  private readonly http = inject(HttpClient);

  async loadSeason(): Promise<SeasonSnapshot> {
    const data = await firstValueFrom(
      this.http.get<Omit<SeasonSnapshot, 'asOf'>>('data/season.json'),
    );
    return { ...data, asOf: new Date().toISOString() };
  }
}
