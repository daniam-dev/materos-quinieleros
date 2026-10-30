const base = 'https://api.oddspapi.io/v4/';
const zoned = (v) =>
  typeof v === 'string' && /(?:Z|[+-]\d\d:\d\d)$/.test(v) && Number.isFinite(Date.parse(v));
const invalid = () => {
  throw new Error('OddsPapi: respuesta no compatible; se conserva el último dato.');
};

export function accountQuota(data) {
  const active = data?.subscriptions?.filter(
    (s) => s.is_active === true && s.subscription_id === data.current_subscription_id,
  );
  if (active?.length !== 1) return invalid();
  const s = active[0];
  if (
    !Number.isSafeInteger(s.request_count) ||
    s.request_count < 0 ||
    !Number.isSafeInteger(s.request_limit) ||
    s.request_limit < 0 ||
    !zoned(s.valid_from) ||
    (s.valid_until !== null && !zoned(s.valid_until)) ||
    !s.sport_ids?.includes(10)
  )
    return invalid();
  // Never store the raw account response (it includes api_key).
  return {
    period: JSON.stringify([s.subscription_id, s.valid_from, s.valid_until]),
    used: s.request_count,
    limit: s.request_limit,
    until: s.valid_until,
  };
}
export function reconcileQuota(old, account, now) {
  if (account.until && Date.parse(account.until) <= now) return invalid();
  return {
    ...account,
    used: old?.period === account.period ? Math.max(old.used, account.used) : account.used,
    checkedAt: new Date(now).toISOString(),
    hard: Math.min(250, account.limit),
    operational: Math.min(200, Math.max(0, account.limit - 50)),
  };
}

export function oddspapiProvider(key, fetcher = fetch) {
  return {
    configured: !!key,
    async request(endpoint, params = {}) {
      if (
        !key ||
        !['account', 'fixtures', 'fixture', 'participants', 'tournaments', 'scores'].includes(
          endpoint,
        )
      )
        return invalid();
      const url = new URL(endpoint, base);
      url.search = new URLSearchParams({ ...params, apiKey: key });
      try {
        const response = await fetcher(url, {
          redirect: 'error',
          signal: AbortSignal.timeout(3000),
        });
        if (!response.ok) throw new Error();
        return await response.json();
      } catch {
        // Neither URL, provider body nor underlying exception may expose the private key.
        throw new Error('OddsPapi no disponible. Intento registrado, sin reintento automático.');
      }
    },
  };
}

const normalize = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\([mf]\)/g, '')
    .replace(/[^a-z0-9]/g, '');
// Explicit reviewed aliases only. Never fuzzy-match a team or infer its league.
const aliases = {
  atmadrid: 'atleticomadrid',
  athleticbilbao: 'athleticclub',
  rvalladolid: 'realvalladolid',
  realvalladolidcf: 'realvalladolid',
  fcbarcelona: 'barcelona',
  realmadridcf: 'realmadrid',
  sporting: 'sportinggijon',
  realsportingdegijon: 'sportinggijon',
  almeria: 'udalmeria',
  cadiz: 'cadizcf',
  eibar: 'sdeibar',
  albacete: 'albacetebalompie',
  granada: 'granadacf',
  laspalmas: 'udlaspalmas',
  leganes: 'cdleganes',
  mallorca: 'rcdmallorca',
  girona: 'gironafc',
  badalonaw: 'badalonawomen',
  fcbadalonawomen: 'badalonawomen',
};
const canonical = (name) => aliases[normalize(name)] ?? normalize(name);
const tournaments = new Map([
  ['LaLiga', ['spain', 'men']],
  ['La Liga', ['spain', 'men']],
  ['LaLiga 2', ['spain', 'men']],
  ['La Liga 2', ['spain', 'men']],
  ['Segunda Division', ['spain', 'men']],
  ['Liga F', ['spain', 'women']],
  ['Copa del Rey', ['spain', 'men']],
  ['UEFA Champions League', ['international-clubs', 'men']],
  ['UEFA Europa League', ['international-clubs', 'men']],
  ['UEFA Conference League', ['international-clubs', 'men']],
]);
export function fixtureRows(data, participants = {}, metadata = []) {
  if (!Array.isArray(data) || data.length >= 10000 || !Array.isArray(metadata)) return invalid();
  if (new Set(data.map((f) => f.fixtureId)).size !== data.length) return invalid();
  return data.map((f) => {
    const t = metadata.find((t) => t.tournamentId === f.tournamentId);
    return {
      ...t,
      ...f,
      participant1Name: f.participant1Name ?? participants[String(f.participant1Id)],
      participant2Name: f.participant2Name ?? participants[String(f.participant2Id)],
    };
  });
}
export function mapFixture(fixture, rows) {
  if (!fixture.kickoff || fixture.category === 'unknown') return null;
  const matches = rows.filter((r) => {
    const domain = tournaments.get(r.tournamentName);
    return (
      domain &&
      domain[0] === r.categorySlug &&
      domain[1] === fixture.category &&
      r.sportId === 10 &&
      typeof r.fixtureId === 'string' &&
      zoned(r.startTime) &&
      Math.abs(Date.parse(r.startTime) - Date.parse(fixture.kickoff)) <= 3600000 &&
      canonical(r.participant1Name) === canonical(fixture.home) &&
      canonical(r.participant2Name) === canonical(fixture.away)
    );
  });
  return matches.length === 1 ? matches[0] : null;
}

// A photographed coupon supplies a date window and explicit M/F, never a guessed kickoff.
export function mapPlayedFixture(fixture, rows, drawDate) {
  if (!['men', 'women'].includes(fixture.category)) return null;
  const anchor = Date.parse(`${drawDate}T12:00:00Z`);
  const matches = rows.filter((r) => {
    const domain = tournaments.get(r.tournamentName);
    return (
      domain &&
      domain[0] === r.categorySlug &&
      domain[1] === fixture.category &&
      r.sportId === 10 &&
      typeof r.fixtureId === 'string' &&
      zoned(r.startTime) &&
      Math.abs(Date.parse(r.startTime) - anchor) <= 3.5 * 86400000 &&
      (!fixture.kickoff ||
        Math.abs(Date.parse(r.startTime) - Date.parse(fixture.kickoff)) <= 3600000) &&
      canonical(r.participant1Name) === canonical(fixture.home) &&
      canonical(r.participant2Name) === canonical(fixture.away)
    );
  });
  return matches.length === 1 ? matches[0] : null;
}

export function applySportingFinal(journey, fixture, raw, status, now) {
  // Require explicit provider finality; +120 minutes or a score alone never settles a fixture.
  if (
    journey.resultPolicy !== 'sporting' ||
    status.fixtureId !== fixture.oddsId ||
    status.statusId !== 2
  )
    return false;
  const result = raw?.scores?.periods?.result ?? raw?.scores?.periods?.fulltime;
  if (
    !result ||
    ![result.participant1Score, result.participant2Score].every(
      (n) => Number.isSafeInteger(n) && n >= 0,
    ) ||
    (result.updatedAt !== undefined &&
      (!zoned(result.updatedAt) || Date.parse(result.updatedAt) > now))
  )
    return invalid();
  if (raw.fixtureId !== fixture.oddsId) return invalid();
  const home = result.participant1Score,
    away = result.participant2Score;
  fixture.status = 'finished';
  fixture.score = { home, away };
  fixture.scoreScope = 'final';
  fixture.scoreSource = 'OddsPapi';
  fixture.scoreUpdatedAt = result.updatedAt ?? new Date(now).toISOString();
  if (fixture.number === 15) {
    journey.pleno.official = {
      home: home >= 3 ? 'M' : String(home),
      away: away >= 3 ? 'M' : String(away),
      publishedAt: new Date(now).toISOString(),
    };
  } else {
    const sign = home > away ? '1' : home < away ? '2' : 'X';
    journey.officialResults = [
      ...journey.officialResults.filter((r) => r.fixtureId !== fixture.id),
      {
        fixtureId: fixture.id,
        sign,
        source: 'sporting',
        publishedAt: new Date(now).toISOString(),
        note: 'Resultado deportivo final de OddsPapi.',
      },
    ];
  }
  return true;
}

export function parseScores(data, fixtureId, now) {
  if (data?.fixtureId !== fixtureId || !data.scores || typeof data.scores !== 'object')
    return invalid();
  // Current provider guides use named periods. Numeric legacy periods are ambiguous.
  const periods = data.scores.periods;
  if (!periods || typeof periods !== 'object') return invalid();
  const result = {};
  for (const key of ['p1', 'p2', 'fulltime', 'overtime', 'penalties', 'result']) {
    const score = periods[key];
    if (!score) continue;
    if (
      ![score.participant1Score, score.participant2Score].every(
        (n) => Number.isSafeInteger(n) && n >= 0,
      ) ||
      (score.updatedAt !== undefined &&
        (!zoned(score.updatedAt) || Date.parse(score.updatedAt) > now))
    )
      return invalid();
    result[key] = {
      home: score.participant1Score,
      away: score.participant2Score,
      updatedAt: score.updatedAt ?? new Date(now).toISOString(),
    };
  }
  // Never combine extra time or shootout totals with regulation scores.
  const score = result.fulltime ?? result.result;
  if (!score) return invalid();
  return {
    score: { home: score.home, away: score.away },
    scoreUpdatedAt: score.updatedAt,
    scoreSource: 'OddsPapi',
    scoreScope: result.fulltime ? 'regulation' : 'final',
    scorePeriods: result,
    stale: false,
  };
}
