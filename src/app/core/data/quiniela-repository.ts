import { InjectionToken } from '@angular/core';
import { SeasonSnapshot } from '../../domain/models';

/** Contrato de lectura sustituible por un adaptador HTTP a Netlify Functions. */
export interface QuinielaRepository {
  loadSeason(): Promise<SeasonSnapshot>;
}
export const QUINIELA_REPOSITORY = new InjectionToken<QuinielaRepository>('QUINIELA_REPOSITORY');
