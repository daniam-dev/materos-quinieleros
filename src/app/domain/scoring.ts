import { Journey, Participant, PlenoPrediction, Prediction, SeasonSnapshot } from './models';

export type PredictionState = 'hit' | 'miss' | 'pending' | 'missing' | 'hidden';
export type JourneyState = 'open' | 'closed' | 'partial' | 'complete';
export interface RankingEntry {
  readonly participant: Participant;
  readonly played: number;
  readonly hits: number;
  readonly evaluable: number;
  readonly percentage: number | null;
  readonly wins: number;
}
export function isPublished(journey: Journey, asOf: string): boolean {
  return Date.parse(asOf) >= Date.parse(journey.closesAt);
}
export function publishedResults(journey: Journey, asOf: string) {
  return journey.officialResults.filter(
    (result) => Date.parse(result.publishedAt) <= Date.parse(asOf),
  );
}
export function journeyState(journey: Journey, asOf: string): JourneyState {
  if (!isPublished(journey, asOf)) return 'open';
  const count = publishedResults(journey, asOf).length;
  return count === 14 ? 'complete' : count > 0 ? 'partial' : 'closed';
}
export function evaluatePrediction(
  journey: Journey,
  prediction: Prediction | undefined,
  asOf: string,
): PredictionState {
  if (!isPublished(journey, asOf)) return 'hidden';
  if (!prediction) return 'missing';
  const official = publishedResults(journey, asOf).find(
    (result) => result.fixtureId === prediction.fixtureId,
  );
  if (!official) return 'pending';
  return official.sign === prediction.sign ? 'hit' : 'miss';
}
export function percentage(hits: number, evaluable: number): number | null {
  return evaluable === 0 ? null : (hits / evaluable) * 100;
}
export function evaluatePleno(
  journey: Journey,
  prediction: PlenoPrediction | undefined,
  asOf: string,
): PredictionState {
  if (!isPublished(journey, asOf)) return 'hidden';
  if (!prediction) return 'missing';
  const official = journey.pleno.official;
  if (!official || Date.parse(official.publishedAt) > Date.parse(asOf)) return 'pending';
  return official.home === prediction.home && official.away === prediction.away ? 'hit' : 'miss';
}
/** Aciertos, porcentaje, nombre en español y finalmente id. Sin puntos adicionales. */
export function compareRanking(a: RankingEntry, b: RankingEntry): number {
  return (
    b.hits - a.hits ||
    (b.percentage ?? -1) - (a.percentage ?? -1) ||
    a.participant.name.localeCompare(b.participant.name, 'es') ||
    a.participant.id.localeCompare(b.participant.id)
  );
}
export function journeyRanking(
  journey: Journey,
  participants: readonly Participant[],
  asOf: string,
): RankingEntry[] {
  if (!isPublished(journey, asOf)) return [];
  return participants
    .filter((p) => journey.participantIds.includes(p.id))
    .map((participant) => {
      const predictions = journey.predictions.filter((p) => p.participantId === participant.id);
      const states = predictions.map((p) => evaluatePrediction(journey, p, asOf));
      const hits = states.filter((state) => state === 'hit').length;
      const evaluable = states.filter((state) => state === 'hit' || state === 'miss').length;
      return {
        participant,
        played: 1,
        hits,
        evaluable,
        percentage: percentage(hits, evaluable),
        wins: 0,
      };
    })
    .sort(compareRanking);
}
export function seasonRanking(snapshot: SeasonSnapshot): RankingEntry[] {
  const journeys = snapshot.journeys.filter(
    (j) => j.seasonId === snapshot.season.id && isPublished(j, snapshot.asOf),
  );
  const results = journeys.map((journey) => ({
    journey,
    rows: journeyRanking(journey, snapshot.participants, snapshot.asOf),
  }));
  return snapshot.participants
    .map((participant) => {
      const entries = results.flatMap(({ rows }) =>
        rows.filter((row) => row.participant.id === participant.id),
      );
      const hits = entries.reduce((total, row) => total + row.hits, 0);
      const evaluable = entries.reduce((total, row) => total + row.evaluable, 0);
      // Una victoria se adjudica al liquidar los 14 signos. Empatados en aciertos comparten victoria.
      const wins = results.filter(({ journey, rows }) => {
        const own = rows.find((row) => row.participant.id === participant.id);
        return (
          publishedResults(journey, snapshot.asOf).length === 14 &&
          own !== undefined &&
          own.evaluable > 0 &&
          own.hits === rows[0]?.hits
        );
      }).length;
      return {
        participant,
        played: entries.length,
        hits,
        evaluable,
        percentage: percentage(hits, evaluable),
        wins,
      };
    })
    .sort(compareRanking);
}
