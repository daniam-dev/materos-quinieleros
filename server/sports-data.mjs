// Sports and private entries deliberately have independent revisions and writers.
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
  if (!sports) return privateData;
  const journeys = new Map(privateData.journeys.map((j) => [j.id, j]));
  for (const j of sports.journeys) {
    const saved = journeys.get(j.id);
    journeys.set(j.id, {
      ...j,
      participantIds: [...new Set([...j.participantIds, ...(saved?.participantIds ?? [])])],
      predictions: saved?.predictions ?? [],
      pleno: { ...j.pleno, predictions: saved?.pleno.predictions ?? [] },
    });
  }
  const result = [...journeys.values()];
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
  } else if (command.type === 'create-journey' || command.type === 'set-current') {
    // Compatibility for old clients/data. The normal UI only imports coupons.
    return changed;
  }
  delete next.synchronization;
  delete next.asOf;
  return next;
}
