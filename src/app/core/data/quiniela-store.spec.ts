import { TestBed } from '@angular/core/testing';
import { QuinielaStore } from './quiniela-store';
import { QUINIELA_REPOSITORY } from './quiniela-repository';
import { SeasonSnapshot } from '../../domain/models';
describe('QuinielaStore', () => {
  it('permite recuperar un fallo del adaptador', async () => {
    const season: SeasonSnapshot = {
      season: { id: 'season', label: '' },
      participants: [],
      journeys: [],
      currentJourneyId: null,
      asOf: '2026-01-01T12:00:00Z',
    };
    const loadSeason = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(season);
    TestBed.configureTestingModule({
      providers: [{ provide: QUINIELA_REPOSITORY, useValue: { loadSeason } }],
    });
    const store = TestBed.inject(QuinielaStore);
    expect(store.isLoading()).toBe(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(store.hasError()).toBe(true);
    await store.load();
    expect(store.hasError()).toBe(false);
    expect(store.snapshot()).toEqual(season);
  });
});
