import { TestBed } from '@angular/core/testing';
import { QuinielaStore } from './quiniela-store';
import { QUINIELA_REPOSITORY } from './quiniela-repository';
import { DEMO_SNAPSHOT } from './demo-data';
describe('QuinielaStore', () => {
  it('permite recuperar un fallo del adaptador', async () => {
    const loadSeason = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(DEMO_SNAPSHOT);
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
    expect(store.snapshot()).toEqual(DEMO_SNAPSHOT);
  });
});
