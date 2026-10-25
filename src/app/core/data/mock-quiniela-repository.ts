import { Injectable } from '@angular/core';
import { DEMO_SNAPSHOT } from './demo-data';
import { QuinielaRepository } from './quiniela-repository';

@Injectable()
export class MockQuinielaRepository implements QuinielaRepository {
  async loadSeason() {
    return structuredClone(DEMO_SNAPSHOT);
  }
}
