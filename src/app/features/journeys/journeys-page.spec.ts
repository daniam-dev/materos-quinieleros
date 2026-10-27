import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { QuinielaStore } from '../../core/data/quiniela-store';
import { Journey, SeasonSnapshot } from '../../domain/models';
import { JourneysPage } from './journeys-page';

describe('Selección de jornadas', () => {
  function create(journeys: readonly Journey[] = [], currentJourneyId: string | null = null) {
    const snapshot: SeasonSnapshot = {
      season: { id: 'season', label: '' },
      participants: [],
      journeys,
      currentJourneyId,
      asOf: '2026-01-01T12:00:00Z',
    };
    TestBed.configureTestingModule({
      providers: [{ provide: QuinielaStore, useValue: { snapshot: signal(snapshot) } }],
    });
    return TestBed.runInInjectionContext(() => new JourneysPage());
  }

  function journey(id: string, overrides: Partial<Journey> = {}): Journey {
    return {
      id,
      seasonId: 'season',
      number: 1,
      competition: 'league',
      startsAt: '2026-01-01T12:00:00Z',
      endsAt: '2026-01-01T14:00:00Z',
      closesAt: '2026-01-01T11:00:00Z',
      participantIds: [],
      fixtures: [],
      predictions: [],
      officialResults: [],
      pleno: {
        fixture: { id: 'pleno', number: 15, home: '', away: '', kickoff: '', status: 'scheduled' },
        predictions: [],
      },
      ...overrides,
    };
  }

  it('muestra jornada actual aunque no haya jornadas cargadas', () => {
    const page = create();
    expect(page.options()).toEqual([{ id: 'current', label: 'Jornada actual' }]);
    expect(page.journey()).toBeUndefined();
    expect(page.published()).toBe(false);
  });

  it('respeta la jornada actual explícita en vez de elegir la primera o la última', () => {
    const page = create([journey('next'), journey('active'), journey('previous')], 'active');
    expect(page.journey()?.id).toBe('active');
    page.selectJourney('previous');
    expect(page.journey()?.id).toBe('previous');
    page.selectJourney('current');
    expect(page.journey()?.id).toBe('active');
  });

  it('conserva el histórico sin asignar una jornada actual automáticamente', () => {
    const page = create([journey('previous')]);
    expect(page.journey()).toBeUndefined();
    expect(page.options()).toHaveLength(2);
    page.selectJourney('previous');
    expect(page.journey()?.id).toBe('previous');
    page.selectJourney('current');
    expect(page.journey()).toBeUndefined();
  });

  it('distingue Liga y Europa con el mismo número y conserva otras temporadas', () => {
    const league = journey('league');
    const europe = journey('europe', { competition: 'europe' });
    const page = create([league, europe, journey('old', { seasonId: 'old' })], europe.id);
    expect(page.journey()).toEqual(europe);
    expect(page.options().map((option) => option.label)).toEqual([
      'Jornada actual',
      'Jornada 1 · Liga · season',
      'Jornada 1 · Champions / Europa League · season',
      'Jornada 1 · Liga · old',
    ]);
    page.filter.set('resolved');
    page.selectJourney(league.id);
    expect(page.journey()).toEqual(league);
    expect(page.filter()).toBe('all');
  });
});
