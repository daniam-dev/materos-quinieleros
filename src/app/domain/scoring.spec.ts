import { DEMO_SNAPSHOT } from '../core/data/demo-data';
import { Journey, SeasonSnapshot } from './models';
import {
  compareRanking,
  evaluatePleno,
  evaluatePrediction,
  isPublished,
  journeyRanking,
  journeyState,
  percentage,
  publishedResults,
  seasonRanking,
} from './scoring';

const snapshot = DEMO_SNAPSHOT;
const asOf = snapshot.asOf;
function journey(id = 'j12'): Journey {
  const value = snapshot.journeys.find((j) => j.id === id);
  if (!value) throw new Error(`Missing test fixture ${id}`);
  return value;
}
describe('Publicación y resultados oficiales', () => {
  it('distingue abierta, cerrada, parcial y finalizada', () => {
    expect(journeyState(journey('j13'), asOf)).toBe('open');
    expect(journeyState(journey('j10'), asOf)).toBe('closed');
    expect(journeyState(journey(), asOf)).toBe('partial');
    expect(journeyState(journey('j11'), asOf)).toBe('complete');
  });
  it('publica en el instante exacto del cierre', () => {
    const j = journey('j13');
    expect(isPublished(j, new Date(Date.parse(j.closesAt) - 1).toISOString())).toBe(false);
    expect(isPublished(j, j.closesAt)).toBe(true);
  });
  it('oculta pronósticos y rankings de jornadas abiertas', () => {
    const j = journey('j13');
    expect(evaluatePrediction(j, j.predictions[0], asOf)).toBe('hidden');
    expect(evaluatePleno(j, j.pleno.predictions[0], asOf)).toBe('hidden');
    expect(journeyRanking(j, snapshot.participants, asOf)).toEqual([]);
  });
  it('no usa resultados oficiales publicados en el futuro', () => {
    expect(publishedResults(journey(), '2026-10-25T10:00:00Z')).toHaveLength(0);
  });
  it('un marcador en juego no determina el acierto', () => {
    const j = journey();
    expect(j.fixtures[8].score).toEqual({ home: 1, away: 0 });
    expect(
      evaluatePrediction(
        j,
        j.predictions.find((p) => p.fixtureId === 'j12-9'),
        asOf,
      ),
    ).toBe('pending');
  });
  it('un partido finalizado sin signo oficial sigue pendiente', () => {
    const j = journey('j10');
    expect(j.fixtures[0].status).toBe('finished');
    expect(evaluatePrediction(j, j.predictions[0], asOf)).toBe('pending');
  });
  it('evalúa aciertos, fallos y ausencias', () => {
    const j = journey();
    expect(
      evaluatePrediction(j, { participantId: 'dani', fixtureId: 'j12-1', sign: '1' }, asOf),
    ).toBe('hit');
    expect(
      evaluatePrediction(j, { participantId: 'dani', fixtureId: 'j12-1', sign: '2' }, asOf),
    ).toBe('miss');
    expect(evaluatePrediction(j, undefined, asOf)).toBe('missing');
  });
  it('la X administrativa cuenta sin inventar un empate deportivo', () => {
    const j = journey();
    expect(j.fixtures[7].score).toBeUndefined();
    expect(j.officialResults[7].source).toBe('administrative');
    expect(
      evaluatePrediction(j, { participantId: 'dani', fixtureId: 'j12-8', sign: 'X' }, asOf),
    ).toBe('hit');
  });
});
describe('Clasificación', () => {
  it('calcula los ocho resultados parciales y el Top 3', () => {
    const rows = journeyRanking(journey(), snapshot.participants, asOf);
    expect(rows.slice(0, 3).map((r) => [r.participant.name, r.hits, r.evaluable])).toEqual([
      ['Lucía', 7, 8],
      ['Dani', 6, 8],
      ['Pablo', 5, 8],
    ]);
    expect(rows[0].percentage).toBe(87.5);
  });
  it('excluye apuestas ausentes del denominador y mantiene inactivos', () => {
    const nico = journeyRanking(journey(), snapshot.participants, asOf).find(
      (r) => r.participant.id === 'nico',
    );
    expect(nico?.evaluable).toBe(7);
    expect(nico?.participant.active).toBe(false);
  });
  it('muestra ausencia de datos cuando no hay evaluables', () => {
    expect(percentage(0, 0)).toBeNull();
    expect(percentage(0, 8)).toBe(0);
    expect(percentage(6, 8)).toBe(75);
  });
  it('suma participaciones reales, excluye abiertas y conserva inactivos', () => {
    const rows = seasonRanking(snapshot);
    expect(rows.find((r) => r.participant.id === 'alex')?.played).toBe(2);
    expect(rows.find((r) => r.participant.id === 'dani')?.played).toBe(3);
    expect(rows.find((r) => r.participant.id === 'nico')?.played).toBe(2);
    expect(rows.find((r) => r.participant.id === 'lucia')?.evaluable).toBe(22);
  });
  it('desempata por porcentaje, nombre e identificador sin mutar la entrada', () => {
    const a = journeyRanking(journey(), snapshot.participants, asOf)[0];
    expect(compareRanking({ ...a, percentage: 90 }, a)).toBeLessThan(0);
    expect(
      compareRanking({ ...a, participant: { ...a.participant, name: 'Ana' } }, a),
    ).toBeLessThan(0);
    expect(compareRanking({ ...a, participant: { ...a.participant, id: 'aaa' } }, a)).toBeLessThan(
      0,
    );
    expect(journey().participantIds[0]).toBe('dani');
  });
  it('no concede victorias por resultados parciales', () => {
    expect(seasonRanking({ ...snapshot, journeys: [journey()] }).every((r) => r.wins === 0)).toBe(
      true,
    );
  });
  it('comparte la victoria al empatar en aciertos en una jornada liquidada', () => {
    const j = journey('j11');
    const tied: Journey = {
      ...j,
      participantIds: ['dani', 'lucia'],
      predictions: j.officialResults.flatMap((result) =>
        ['dani', 'lucia'].map((participantId) => ({
          participantId,
          fixtureId: result.fixtureId,
          sign: result.sign,
        })),
      ),
    };
    const data: SeasonSnapshot = { ...snapshot, journeys: [tied] };
    expect(
      seasonRanking(data)
        .filter((r) => r.wins === 1)
        .map((r) => r.participant.id),
    ).toEqual(['dani', 'lucia']);
  });
  it('ignora jornadas de otra temporada', () => {
    expect(
      seasonRanking({ ...snapshot, journeys: [{ ...journey(), seasonId: 'old' }] }).every(
        (r) => r.evaluable === 0,
      ),
    ).toBe(true);
  });
  it('no revela la jornada abierta al variar todos sus pronósticos', () => {
    const altered = {
      ...snapshot,
      journeys: snapshot.journeys.map((j) => (j.id === 'j13' ? { ...j, predictions: [] } : j)),
    };
    expect(seasonRanking(altered)).toEqual(seasonRanking(snapshot));
  });
});
describe('Pleno al 15', () => {
  it('exige acertar los dos valores y admite M', () => {
    const j = journey('j11');
    expect(evaluatePleno(j, { participantId: 'dani', home: 'M', away: '1' }, asOf)).toBe('hit');
    expect(evaluatePleno(j, { participantId: 'dani', home: '2', away: '1' }, asOf)).toBe('miss');
    expect(evaluatePleno(j, undefined, asOf)).toBe('missing');
    expect(evaluatePleno(journey(), journey().pleno.predictions[0], asOf)).toBe('pending');
  });
  it('no evalúa un pleno oficial futuro', () => {
    const j = journey('j11');
    expect(evaluatePleno(j, j.pleno.predictions[0], '2026-10-18T15:00:00Z')).toBe('pending');
  });
  it('no altera la clasificación de los primeros 14', () => {
    const withoutPleno = {
      ...snapshot,
      journeys: snapshot.journeys.map((j) => ({
        ...j,
        pleno: { fixture: j.pleno.fixture, predictions: [] },
      })),
    };
    expect(seasonRanking(withoutPleno)).toEqual(seasonRanking(snapshot));
  });
});
describe('Integridad de los mocks', () => {
  it('tiene nueve personas, 14 partidos y referencias únicas y válidas', () => {
    expect(snapshot.participants).toHaveLength(9);
    for (const j of snapshot.journeys) {
      expect(j.fixtures).toHaveLength(14);
      expect(new Set(j.predictions.map((p) => `${p.fixtureId}:${p.participantId}`)).size).toBe(
        j.predictions.length,
      );
      expect(new Set(j.officialResults.map((r) => r.fixtureId)).size).toBe(
        j.officialResults.length,
      );
      for (const prediction of j.predictions) {
        expect(j.participantIds).toContain(prediction.participantId);
        expect(j.fixtures.some((f) => f.id === prediction.fixtureId)).toBe(true);
      }
      for (const result of j.officialResults.filter((r) => r.source === 'sporting')) {
        const score = j.fixtures.find((f) => f.id === result.fixtureId)?.score;
        expect(score).toBeDefined();
        if (score)
          expect(result.sign).toBe(
            score.home > score.away ? '1' : score.home < score.away ? '2' : 'X',
          );
      }
    }
  });
});
