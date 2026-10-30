// Sports and private entries deliberately have independent revisions and writers.
import { withResultOverrides } from './played-journeys.mjs';
export const emptySports = () => ({ journeys: [], jobs: {}, quota: null, sync: {} });
export const allFixtures = (j) => [...j.fixtures, j.pleno.fixture];
export const settled = (j) => j.officialResults.length === 14 && !!j.pleno.official;

export function currentJourney(journeys, now) {
  const ordered = [...journeys].sort(
    (a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.id.localeCompare(b.id),
  );
  // An unresolved started coupon stays current, even when the next is published.
  return (
    (
      ordered.find((j) => Date.parse(j.startsAt) <= now && !settled(j)) ??
      ordered.find((j) => Date.parse(j.startsAt) > now) ??
      ordered.at(-1)
    )?.id ?? null
  );
}

export function mergeSports(privateData, sports, now) {
  if (!sports)
    return { ...privateData, journeys: privateData.journeys.map((j) => withResultOverrides(j)) };
  const journeys = new Map(privateData.journeys.map((j) => [j.id, j]));
  for (const j of sports.journeys) {
    const saved = journeys.get(j.id);
    journeys.set(
      j.id,
      withResultOverrides(
        {
          ...j,
          participantIds: [...new Set([...j.participantIds, ...(saved?.participantIds ?? [])])],
          predictions: saved?.predictions ?? [],
          pleno: { ...j.pleno, predictions: saved?.pleno.predictions ?? [] },
        },
        saved?.resultOverrides,
      ),
    );
  }
  const result = [...journeys.values()].map((j) => withResultOverrides(j));
  const currentJourneyId = currentJourney(result, now);
  const current = result.find((j) => j.id === currentJourneyId);
  return {
    ...privateData,
    journeys: result,
    season: current?.source
      ? { id: current.seasonId, label: current.source.season.replace('-', ' / ') }
      : privateData.season,
    currentJourneyId,
    synchronization: sports.sync,
  };
}

export function privateUpdate(original, changed, command) {
  const next = structuredClone(original);
  next.participants = changed.participants;
  if (command.type === 'set-competitions') next.competitionSettings = changed.competitionSettings;
  if (command.type === 'classify-journey') next.journeyCompetitions = changed.journeyCompetitions;
  if (command.type === 'create-played-journey') {
    const ids = new Set(original.journeys.map((j) => j.id));
    next.journeys.push(
      ...changed.journeys
        .filter((j) => !ids.has(j.id) && j.origin === 'admin')
        .map((j) => structuredClone(j)),
    );
    next.currentJourneyId = changed.currentJourneyId;
  }
  if (command.type === 'correct-results') {
    const journey = next.journeys.find((j) => j.id === command.journeyId);
    if (journey)
      journey.resultOverrides = changed.journeys.find(
        (j) => j.id === command.journeyId,
      ).resultOverrides;
  }
  if (command.type === 'save-predictions') {
    const updated = changed.journeys.find((j) => j.id === command.journeyId);
    const old = next.journeys.find((j) => j.id === updated.id);
    // Keep a compatible fallback snapshot; refreshes never write this private copy.
    const saved = {
      ...(old ?? updated),
      participantIds: updated.participantIds,
      predictions: updated.predictions,
      pleno: { ...(old?.pleno ?? updated.pleno), predictions: updated.pleno.predictions },
    };
    next.journeys = [...next.journeys.filter((j) => j.id !== saved.id), saved];
  } else if (['create-journey', 'set-current'].includes(command.type)) {
    // Compatibility for old clients/data. The normal UI only imports coupons.
    const result = structuredClone(changed);
    delete result.synchronization;
    delete result.asOf;
    return result;
  }
  delete next.synchronization;
  delete next.asOf;
  return next;
}
