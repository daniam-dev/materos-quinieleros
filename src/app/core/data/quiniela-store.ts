import { Injectable, inject, signal } from '@angular/core';
import { SeasonSnapshot } from '../../domain/models';
import { QUINIELA_REPOSITORY } from './quiniela-repository';

@Injectable({ providedIn: 'root' })
export class QuinielaStore {
  private readonly repository = inject(QUINIELA_REPOSITORY);
  private readonly data = signal<SeasonSnapshot | null>(null);
  private readonly loading = signal(false);
  private readonly failure = signal(false);
  readonly snapshot = this.data.asReadonly();
  readonly isLoading = this.loading.asReadonly();
  readonly hasError = this.failure.asReadonly();
  constructor() {
    void this.load();
  }
  async load(): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.failure.set(false);
    try {
      this.data.set(await this.repository.loadSeason());
    } catch {
      this.failure.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
