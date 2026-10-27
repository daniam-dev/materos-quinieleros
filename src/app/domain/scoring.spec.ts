import { Fixture, Journey, Participant, SeasonSnapshot } from './models';
import {
  compareRanking,
  displayPrediction,
  evaluatePleno,
  evaluatePrediction,
  isPublished,
  journeyRanking,
  journeyState,
  percentage,
  publishedResults,
  seasonRanking,
} from './scoring';

const before = '2026-01-01T11:00:00Z';
const now = '2026-01-01T12:00:00Z';
const after = '2026-01-01T13:00:00Z';
const participant: Participant = {
  id: 'a',
  name: 'A',
  surname: '',
  initials: 'A',
  active: true,
  role: 'participant',
};
const fixture: Fixture = {
  id: 'fixture',
  number: 1,
  home: '',
  away: '',
  kickoff: before,
  status: 'finished',
};
const prediction = { participantId: participant.id, fixtureId: fixture.id, sign: '1' as const };
const result = {
  fixtureId: fixture.id,
  sign: '1' as const,
  source: 'sporting' as const,
  publishedAt: before,
};

// Cada caso aporta solo las entradas necesarias para la regla, sin catálogo de demostración.
function journey(overrides: Partial<Journey> = {}): Journey {
  return {
    id: 'journey',
    seasonId: 'season',
    number: 1,
    competition: 'league',
    startsAt: before,
    endsAt: after,
    closesAt: before,
    participantIds: [participant.id],
    fixtures: [fixture],
    predictions: [prediction],
    officialResults: [result],
    pleno: { fixture: { ...fixture, id: 'pleno', number: 15 }, predictions: [] },
    ...overrides,
  };
}
function snapshot(
  journeys: readonly Journey[] = [journey()],
  participants: readonly Participant[] = [participant],
): SeasonSnapshot {
  return {
    season: { id: 'season', label: '' },
    currentJourneyId: null,
    journeys,
    participants,
    asOf: now,
  };
}
function settled(): Journey {
  const fixtures = Array.from({ length: 14 }, (_, i) => ({
    ...fixture,
    id: String(i),
    number: i + 1,
  }));
  return journey({
    fixtures,
    predictions: fixtures.map((f) => ({ ...prediction, fixtureId: f.id })),
    officialResults: fixtures.map((f) => ({ ...result, fixtureId: f.id })),
  });
}

describe('Publicación y resultados oficiales', () => {
  it('dobles cuentan un acierto y los marcadores provisionales no alteran la clasificación', () => {
    const double = { ...prediction, sign: '1X' as const };
    const j = journey({ predictions: [double] });
    expect(evaluatePrediction(j, double, now)).toBe('hit');
    expect(journeyRanking(j, [participant], now)[0].hits).toBe(1);
    const live = journey({
      predictions: [double],
      officialResults: [],
      fixtures: [{ ...fixture, score: { home: 1, away: 1 }, scoreScope: 'regulation' }],
    });
    expect(displayPrediction(live, double, now)).toBe('provisional-hit');
    expect(journeyRanking(live, [participant], now)[0].hits).toBe(0);
    expect(seasonRanking(snapshot([live]))[0].wins).toBe(0);
    const corrected = { ...live, fixtures: [{ ...live.fixtures[0], score: { home: 1, away: 2 } }] };
    expect(displayPrediction(corrected, double, now)).toBe('provisional-miss');
    expect(displayPrediction({ ...live, closesAt: after }, double, now)).toBe('hidden');
  });
  it('distingue abierta, cerrada, parcial y finalizada', () => {
    expect(journeyState(journey({ closesAt: after }), now)).toBe('open');
    expect(journeyState(journey({ officialResults: [] }), now)).toBe('closed');
    expect(journeyState(journey(), now)).toBe('partial');
    expect(journeyState(settled(), now)).toBe('complete');
  });
  it('publica en el instante exacto del cierre', () => {
    expect(isPublished(journey({ closesAt: now }), before)).toBe(false);
    expect(isPublished(journey({ closesAt: now }), now)).toBe(true);
  });
  it('oculta pronósticos y rankings de jornadas abiertas', () => {
    const j = journey({ closesAt: after });
    expect(evaluatePrediction(j, prediction, now)).toBe('hidden');
    expect(evaluatePleno(j, { participantId: 'a', home: '0', away: '0' }, now)).toBe('hidden');
    expect(journeyRanking(j, [participant], now)).toEqual([]);
  });
  it('no usa resultados oficiales publicados en el futuro', () => {
    expect(
      publishedResults(journey({ officialResults: [{ ...result, publishedAt: after }] }), now),
    ).toEqual([]);
  });
  it('un marcador en juego no determina el acierto', () => {
    const j = journey({
      fixtures: [{ ...fixture, status: 'live', score: { home: 1, away: 0 } }],
      officialResults: [],
    });
    expect(evaluatePrediction(j, prediction, now)).toBe('pending');
  });
  it('un partido finalizado sin signo oficial sigue pendiente', () => {
    expect(evaluatePrediction(journey({ officialResults: [] }), prediction, now)).toBe('pending');
  });
  it('evalúa aciertos, fallos y ausencias', () => {
    expect(evaluatePrediction(journey(), prediction, now)).toBe('hit');
    expect(evaluatePrediction(journey(), { ...prediction, sign: '2' }, now)).toBe('miss');
    expect(evaluatePrediction(journey(), undefined, now)).toBe('missing');
  });
  it('la X administrativa cuenta sin inventar un empate deportivo', () => {
    const j = journey({ officialResults: [{ ...result, sign: 'X', source: 'administrative' }] });
    expect(j.fixtures[0].score).toBeUndefined();
    expect(evaluatePrediction(j, { ...prediction, sign: 'X' }, now)).toBe('hit');
  });
});

describe('Clasificación', () => {
  it('ordena por aciertos y calcula el porcentaje de los signos oficiales', () => {
    const second = { ...participant, id: 'b', name: 'B' };
    const j = journey({
      participantIds: ['a', 'b'],
      predictions: [prediction, { ...prediction, participantId: 'b', sign: '2' }],
    });
    expect(
      journeyRanking(j, [second, participant], now).map((r) => [
        r.participant.id,
        r.hits,
        r.evaluable,
        r.percentage,
      ]),
    ).toEqual([
      ['a', 1, 1, 100],
      ['b', 0, 1, 0],
    ]);
  });
  it('excluye apuestas ausentes del denominador y mantiene inactivos', () => {
    const row = journeyRanking(
      journey({ predictions: [] }),
      [{ ...participant, active: false }],
      now,
    )[0];
    expect(row.evaluable).toBe(0);
    expect(row.percentage).toBeNull();
    expect(row.participant.active).toBe(false);
  });
  it('muestra ausencia de datos cuando no hay evaluables', () => {
    expect(percentage(0, 0)).toBeNull();
    expect(percentage(0, 8)).toBe(0);
    expect(percentage(6, 8)).toBe(75);
  });
  it('suma inscripciones, excluye abiertas y conserva inactivos', () => {
    const data = snapshot(
      [
        journey(),
        journey({ id: 'second', predictions: [] }),
        journey({ id: 'unregistered', participantIds: [], predictions: [] }),
        journey({ id: 'open', closesAt: after }),
      ],
      [{ ...participant, active: false }],
    );
    const row = seasonRanking(data)[0];
    expect(row.played).toBe(2);
    expect(row.evaluable).toBe(1);
    expect(row.hits).toBe(1);
    expect(row.participant.active).toBe(false);
  });
  it('desempata por porcentaje, nombre e identificador sin mutar las inscripciones', () => {
    const j = journey();
    const row = journeyRanking(j, [participant], now)[0];
    expect(compareRanking({ ...row, percentage: 90 }, row)).toBeGreaterThan(0);
    expect(
      compareRanking(row, { ...row, participant: { ...participant, name: 'B' } }),
    ).toBeLessThan(0);
    expect(compareRanking(row, { ...row, participant: { ...participant, id: 'b' } })).toBeLessThan(
      0,
    );
    expect(j.participantIds).toEqual(['a']);
  });
  it('no concede victorias por resultados parciales', () => {
    expect(seasonRanking(snapshot())[0].wins).toBe(0);
  });
  it('comparte la victoria al empatar en aciertos en una jornada liquidada', () => {
    const j = settled();
    const second = { ...participant, id: 'b', name: 'B' };
    const tied = {
      ...j,
      participantIds: ['a', 'b'],
      predictions: j.predictions.flatMap((p) => [p, { ...p, participantId: 'b' }]),
    };
    expect(seasonRanking(snapshot([tied], [participant, second])).map((r) => r.wins)).toEqual([
      1, 1,
    ]);
  });
  it('ignora jornadas de otra temporada', () => {
    expect(seasonRanking(snapshot([journey({ seasonId: 'old' })]))[0].evaluable).toBe(0);
  });
  it('no revela la jornada abierta al variar sus pronósticos', () => {
    expect(seasonRanking(snapshot([journey({ closesAt: after })]))).toEqual(
      seasonRanking(snapshot([journey({ closesAt: after, predictions: [] })])),
    );
  });
  it('no asigna resultados ni porcentajes cuando la temporada no tiene jornadas', () => {
    expect(seasonRanking(snapshot([]))[0]).toMatchObject({
      played: 0,
      hits: 0,
      evaluable: 0,
      percentage: null,
      wins: 0,
    });
  });
});

describe('Pleno al 15', () => {
  function withPleno(publishedAt = before): Journey {
    const j = journey();
    return { ...j, pleno: { ...j.pleno, official: { home: 'M', away: '1', publishedAt } } };
  }
  it('exige acertar los dos valores y admite M', () => {
    expect(evaluatePleno(withPleno(), { participantId: 'a', home: 'M', away: '1' }, now)).toBe(
      'hit',
    );
    expect(evaluatePleno(withPleno(), { participantId: 'a', home: '2', away: '1' }, now)).toBe(
      'miss',
    );
    expect(evaluatePleno(withPleno(), undefined, now)).toBe('missing');
    expect(evaluatePleno(journey(), { participantId: 'a', home: 'M', away: '1' }, now)).toBe(
      'pending',
    );
  });
  it('no evalúa un pleno oficial futuro', () => {
    expect(evaluatePleno(withPleno(after), { participantId: 'a', home: 'M', away: '1' }, now)).toBe(
      'pending',
    );
  });
  it('no altera la clasificación de los primeros 14', () => {
    expect(seasonRanking(snapshot([withPleno()]))).toEqual(seasonRanking(snapshot()));
  });
});
