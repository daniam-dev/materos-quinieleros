import { createHash } from 'node:crypto';

// This is a selection catalogue, not a promise of live-score provider coverage.
export const competitionCatalog = [
  { id: 'primera', label: 'Primera División', names: ['LaLiga', 'La Liga'] },
  {
    id: 'segunda',
    label: 'Segunda División',
    names: ['LaLiga 2', 'La Liga 2', 'Segunda Division'],
  },
  { id: 'liga-f', label: 'Liga F', names: ['Liga F'] },
  { id: 'copa-rey', label: 'Copa del Rey', names: ['Copa del Rey'] },
  { id: 'champions', label: 'Champions League', names: ['UEFA Champions League'] },
  { id: 'europa', label: 'Europa League', names: ['UEFA Europa League'] },
  { id: 'conference', label: 'Conference League', names: ['UEFA Conference League'] },
  { id: 'other', label: 'Otras competiciones', names: [] },
];
export const competitionOptions = competitionCatalog.map(({ id, label }) => ({ id, label }));
export const competitionIds = competitionOptions.map((c) => c.id);
const fixtures = (journey) => [...(journey.fixtures ?? []), journey.pleno.fixture].filter(Boolean);

export function fixtureSignature(journey) {
  return createHash('sha256')
    .update(JSON.stringify(fixtures(journey).map((f) => [f.id, f.home, f.away, f.sourceIdentity])))
    .digest('hex');
}

export function identifiedCompetitions(journey, assignments = {}) {
  const assignment = assignments[journey.id];
  if (assignment && assignment.fixtureSignature === fixtureSignature(journey))
    return { ids: assignment.competitionIds, source: 'admin' };
  const ids = fixtures(journey).map(
    (f) => competitionCatalog.find((c) => c.names.includes(f.competitionName))?.id,
  );
  // Every fixture, including the Pleno, must be identified. Never infer from team/day.
  return ids.length === 15 && ids.every(Boolean)
    ? { ids: [...new Set(ids)], source: 'provider' }
    : { ids: [], source: 'unknown' };
}

export function participation(journey, settings, assignments) {
  const classification = identifiedCompetitions(journey, assignments);
  const base = { competitionIds: classification.ids, source: classification.source };
  if (journey.origin === 'admin' && journey.resultPolicy === 'sporting')
    return { ...base, state: 'enabled', reason: 'Boleto elegido y revisado por el administrador.' };
  if (!settings?.enabled)
    return { ...base, state: 'enabled', reason: 'Filtro de competiciones desactivado.' };
  if (
    settings.protectedJourneyIds?.includes(journey.id) ||
    journey.predictions?.length ||
    journey.pleno.predictions?.length
  )
    return {
      ...base,
      state: 'preserved',
      reason: 'Conservada por histórico o quinielas cargadas.',
    };
  if (!classification.ids.length)
    return { ...base, state: 'pending', reason: 'Pendiente de identificar los 15 encuentros.' };
  if (classification.ids.some((id) => !settings.enabledIds.includes(id)))
    return { ...base, state: 'excluded', reason: 'Contiene alguna competición deshabilitada.' };
  return { ...base, state: 'enabled', reason: 'Todas sus competiciones están habilitadas.' };
}

export const playable = (journey) =>
  !['excluded', 'pending'].includes(journey.participation?.state);

export function withParticipation(snapshot) {
  return {
    ...snapshot,
    journeys: snapshot.journeys.map((journey) => ({
      ...journey,
      participation: participation(
        journey,
        snapshot.competitionSettings,
        snapshot.journeyCompetitions,
      ),
    })),
  };
}
