import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
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
    const document = inject(DOCUMENT);
    const refresh = () => {
      if (document.visibilityState === 'visible') void this.load(true);
    };
    const timer = setInterval(refresh, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', refresh);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    });
  }
  private refreshing = false;
  async load(quiet = false): Promise<void> {
    if (this.refreshing) return;
    this.refreshing = true;
    if (!quiet) this.loading.set(true);
    this.failure.set(false);
    try {
      this.data.set(await this.repository.loadSeason());
    } catch {
      this.failure.set(true);
    } finally {
      this.loading.set(false);
      this.refreshing = false;
    }
  }
}
