import { randomUUID } from 'node:crypto';
import { allFixtures, emptySports, settled } from './sports-data.mjs';
import { drawIdentity, parseDraw, selaeDiagnostic } from './providers/selae.mjs';
import { participation, playable } from './competitions.mjs';
import {
  accountQuota,
  reconcileQuota,
  fixtureRows,
  mapFixture,
  parseScores,
} from './providers/oddspapi.mjs';

const iso = (now) => new Date(now).toISOString();
const hour = 3600000;
const safeFailure = (source) =>
  `${source}: no se pudo actualizar. Se conservan los datos anteriores.`;

export function updateJourney(previous, incoming, participants, now) {
  if (!previous)
    return { ...incoming, participantIds: participants.filter((p) => p.active).map((p) => p.id) };
  if (
    ['drawId', 'season', 'number', 'drawDate'].some(
      (key) => previous.source[key] !== incoming.source[key],
    )
  )
    throw new Error('Identidad oficial modificada.');
  const old = allFixtures(previous);
  const fresh = allFixtures(incoming);
  if (fresh.some((f, i) => f.sourceIdentity !== old[i].sourceIdentity))
    throw new Error('SELAE ha cambiado el cruce o el orden; se conserva la jornada para revisión.');
  const merged = fresh.map((f, i) => {
    const result = { ...old[i], ...f, id: old[i].id };
    if (!f.kickoff && old[i].kickoff) result.kickoff = old[i].kickoff;
    if (!f.competitionName && old[i].competitionName)
      result.competitionName = old[i].competitionName;
    // A calendar refresh alone is not evidence that a suspended match resumed.
    if (
      old[i].kickoff === f.kickoff &&
      ['postponed', 'suspended', 'cancelled'].includes(old[i].status)
    )
      result.status = old[i].status;
    if (!f.score && old[i].score) {
      result.score = old[i].score;
      result.scoreUpdatedAt = old[i].scoreUpdatedAt;
      result.scoreSource = old[i].scoreSource;
      result.scoreScope = old[i].scoreScope;
    }
    return result;
  });
  const officialResults = incoming.officialResults.map((r) => {
    const oldResult = previous.officialResults.find((o) => o.fixtureId === r.fixtureId);
    return oldResult?.sign === r.sign ? oldResult : r;
  });
  // A complete valid official response can correct or retract a previous sign.
  const knownTimes = merged.filter((f) => f.kickoff).map((f) => Date.parse(f.kickoff));
  const salesCloseAt = incoming.salesCloseAt ?? previous.salesCloseAt;
  const closing = salesCloseAt
    ? new Date(Math.min(Date.parse(salesCloseAt), ...knownTimes)).toISOString()
    : knownTimes.length === 15
      ? new Date(Math.min(...knownTimes)).toISOString()
      : null;
  return {
    ...incoming,
    participantIds: previous.participantIds,
    fixtures: merged.slice(0, 14),
    startsAt: knownTimes.length
      ? new Date(Math.min(...knownTimes)).toISOString()
      : incoming.startsAt,
    endsAt: knownTimes.length ? new Date(Math.max(...knownTimes)).toISOString() : incoming.endsAt,
    salesCloseAt,
    closesAt:
      previous.closesAt && Date.parse(previous.closesAt) <= now ? previous.closesAt : closing,
    officialResults,
    importedAt: previous.importedAt,
    pleno: {
      ...incoming.pleno,
      fixture: merged[14],
      ...(previous.pleno.official &&
      incoming.pleno.official &&
      previous.pleno.official.home === incoming.pleno.official.home &&
      previous.pleno.official.away === incoming.pleno.official.away
        ? { official: previous.pleno.official }
        : {}),
    },
  };
}

export function scoreTasks(data, now) {
  return data.journeys
    .flatMap((j) =>
      allFixtures(j).flatMap((f) => {
        if (
          !f.kickoff ||
          ['postponed', 'suspended', 'cancelled'].includes(f.status) ||
          (f.number === 15 ? j.pleno.official : j.officialResults.some((r) => r.fixtureId === f.id))
        )
          return [];
        const elapsed = now - Date.parse(f.kickoff);
        if (elapsed < hour) return [];
        const stage = elapsed >= 2 * hour ? 'after' : 'during';
        if (data.jobs[`score:${f.id}:${stage}`]) return [];
        return [
          {
            journey: j,
            fixture: f,
            stage,
            due: Date.parse(f.kickoff) + (stage === 'after' ? 2 : 1) * hour,
          },
        ];
      }),
    )
    .sort(
      (a, b) =>
        (a.stage === 'after' ? 0 : 1) - (b.stage === 'after' ? 0 : 1) ||
        a.due - b.due ||
        a.fixture.id.localeCompare(b.fixture.id),
    );
}

/** All external calls run here, never in GET /season or a public component. */
export async function synchronize({
  sportsStore,
  privateStore,
  seed,
  selae,
  odds,
  clock = Date.now,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  force = false,
}) {
  const started = clock();
  const token = randomUUID();
  const entry = await sportsStore.read();
  let data = entry?.data ?? emptySports();
  if (data.lease?.until > started) return { skipped: 'running' };
  // Manual retry observes the same cooldown and never resets billable attempts.
  if (started - (data.lastRun ?? 0) < 60000) return { skipped: 'cooldown' };
  data = structuredClone(data);
  data.lease = { token, until: started + 120000 };
  data.lastRun = started;
  if (!(await sportsStore.write(data, entry?.etag ?? null))) return { skipped: 'conflict' };
  async function save() {
    const latest = await sportsStore.read();
    if (latest?.data.lease?.token !== token || latest.data.lease.until <= clock())
      throw new Error('Sincronización reemplazada por otra ejecución.');
    if (!(await sportsStore.write(data, latest.etag)))
      throw new Error('Conflicto de sincronización.');
  }
  // Scheduled Functions allow 30s. Leave room for one bounded request and CAS writes.
  const withinTime = () => clock() - started < 18000;
  let privateData;
  try {
    privateData = (await privateStore.read())?.data ?? seed;
    delete data.sync.system;
    const now = clock();
    const candidates = new Map(Object.entries(data.pendingDraws ?? {}));
    let discoveryFailed = false;
    const diagnostics = [];
    const diagnose = (error) => {
      const detail = selaeDiagnostic(error);
      if (
        diagnostics.length < 4 &&
        !diagnostics.some((d) => JSON.stringify(d) === JSON.stringify(detail))
      )
        diagnostics.push(detail);
    };
    if (force || !data.discoveredAt || now - Date.parse(data.discoveredAt) >= 6 * hour) {
      try {
        for (const row of await selae.discover()) {
          const identity = drawIdentity(row);
          candidates.set(identity.drawId, identity);
        }
        data.discoveredAt = iso(clock());
      } catch (error) {
        discoveryFailed = true;
        diagnose(error);
      }
    }
    // Rotating seven-day recovery discovers a currently playing coupon on first setup,
    // and coupons missed during a short outage, including midweek draws.
    if (selae.recent && withinTime()) {
      data.recentChecks ??= {};
      const days = Array.from({ length: 8 }, (_, i) =>
        new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(now - i * 24 * hour),
      );
      const day = days.find(
        (day) => !data.recentChecks[day] || now - data.recentChecks[day] >= 24 * hour,
      );
      if (day) {
        data.recentChecks[day] = now;
        try {
          for (const row of await selae.recent(day)) {
            const identity = drawIdentity(row);
            candidates.set(identity.drawId, identity);
          }
        } catch (error) {
          discoveryFailed = true;
          diagnose(error);
        }
      }
    }
    data.pendingDraws = Object.fromEntries(candidates);
    const existing = data.journeys
      .filter(
        (j) =>
          force || !j.checkedAt || now - Date.parse(j.checkedAt) >= (settled(j) ? 24 * hour : 0),
      )
      .sort((a, b) => (Date.parse(a.checkedAt ?? '') || 0) - (Date.parse(b.checkedAt ?? '') || 0));
    for (const j of existing)
      if (!candidates.has(j.officialId)) candidates.set(j.officialId, j.source);
    let errors = discoveryFailed ? 1 : 0;
    let processed = 0;
    for (const identity of candidates.values()) {
      if (!withinTime() || processed++ >= 4) break;
      const index = data.journeys.findIndex((j) => j.officialId === identity.drawId);
      try {
        const incoming = parseDraw(await selae.draw(identity), identity, iso(clock()));
        // Existing app season IDs are preserved when they represent the same published season.
        const seasonLabel = privateData.season.label.replace('/', '-');
        if (seasonLabel === incoming.seasonId || privateData.season.id === incoming.seasonId)
          incoming.seasonId = privateData.season.id;
        const next = updateJourney(
          index < 0 ? null : data.journeys[index],
          incoming,
          privateData.participants,
          clock(),
        );
        next.checkedAt = iso(clock());
        if (index < 0) data.journeys.push(next);
        else data.journeys[index] = next;
        delete data.pendingDraws[identity.drawId];
      } catch (error) {
        errors++;
        diagnose(error);
        if (index >= 0) {
          data.journeys[index].syncStatus = 'error';
          data.journeys[index].checkedAt = iso(clock());
          for (const f of allFixtures(data.journeys[index])) f.stale = true;
        }
      }
    }
    data.sync.selae = {
      state: errors || data.journeys.some((j) => j.syncStatus === 'error') ? 'error' : 'ok',
      checkedAt: iso(clock()),
      ...(diagnostics.length ? { diagnostics } : {}),
      ...(errors || data.journeys.some((j) => j.syncStatus === 'error')
        ? { message: safeFailure('SELAE') }
        : { message: 'Jornadas y signos oficiales actualizados.' }),
    };
    await save();
    if (!odds?.configured) {
      data.sync.odds = {
        state: 'unconfigured',
        message: 'Marcadores OddsPapi pendientes de configuración.',
      };
    } else if (withinTime()) {
      await syncOdds();
    }
    data.lease = null;
    await save();
    return { synchronized: true, status: data.sync };
  } catch {
    // A crashed/expired worker cannot overwrite another worker. Durable attempts stay spent.
    const latest = await sportsStore.read();
    if (latest?.data.lease?.token === token) {
      const failed = latest.data;
      failed.lease = null;
      failed.sync.system = {
        state: 'error',
        message: 'Sincronización interrumpida; se conserva la última copia.',
      };
      await sportsStore.write(failed, latest.etag);
    }
    return { synchronized: false };
  }

  async function syncOdds() {
    let calls = 0;
    const now = clock();
    const selected = (j) => {
      const saved = privateData.journeys.find((s) => s.id === j.id);
      return playable({
        participation: participation(
          {
            ...j,
            predictions: saved?.predictions,
            pleno: { ...j.pleno, predictions: saved?.pleno.predictions },
          },
          privateData.competitionSettings,
          privateData.journeyCompetitions,
        ),
      });
    };
    if (!data.journeys.some((j) => selected(j) && !settled(j))) {
      data.sync.odds = {
        state: 'idle',
        message: 'Sin boletos habilitados pendientes de marcadores.',
      };
      return;
    }
    try {
      // No billable work without a fresh account reconciliation.
      data.quota = reconcileQuota(data.quota, accountQuota(await odds.request('account')), clock());
      await save();
      data.sync.odds = {
        state: 'ok',
        checkedAt: iso(clock()),
        message: 'Plan de marcadores actualizado.',
      };
      async function billable(key, endpoint, params) {
        if (data.jobs[key]) return null;
        if (!withinTime() || calls >= 12) return null;
        if (data.quota.used >= data.quota.operational || data.quota.used >= data.quota.hard) {
          data.sync.odds = {
            state: 'budget',
            checkedAt: iso(clock()),
            message:
              'Presupuesto operativo agotado; reserva protegida. Continúa la confirmación SELAE.',
          };
          return null;
        }
        // Persist BEFORE the request: timeout, failure or process death still consumes a slot.
        data.quota.used++;
        data.jobs[key] = { attemptedAt: iso(clock()), endpoint, state: 'attempted' };
        await save();
        calls++;
        await sleep(1100);
        try {
          const response = await odds.request(endpoint, params);
          data.jobs[key].state = 'received';
          return response;
        } catch {
          data.jobs[key].state = 'failed';
          throw new Error(safeFailure('OddsPapi'));
        }
      }
      for (const j of data.journeys) {
        if (!withinTime()) break;
        if (!selected(j)) continue;
        const fixtures = allFixtures(j);
        if (
          settled(j) ||
          !fixtures.some((f) => f.kickoff && Date.parse(f.kickoff) < now + 48 * hour)
        )
          continue;
        const times = fixtures
          .map((f) => f.kickoff)
          .filter(Boolean)
          .map(Date.parse);
        if (!times.length || Math.max(...times) - Math.min(...times) >= 9 * 24 * hour) continue;
        // One discovery per coupon; a real schedule change permits one new range discovery.
        const signature = `${j.id}:${Math.min(...times)}:${Math.max(...times)}`;
        const key = `discovery:${signature}`;
        if (data.jobs[key]) continue;
        const raw = await billable(key, 'fixtures', {
          sportId: '10',
          language: 'en',
          from: iso(Math.min(...times) - hour),
          to: iso(Math.max(...times) + hour),
        });
        if (!raw) continue;
        let participants = data.metadata?.participants?.value ?? {};
        let tournaments = data.metadata?.tournaments?.value ?? [];
        data.metadata ??= {};
        for (const endpoint of ['participants', 'tournaments']) {
          const needs =
            endpoint === 'participants'
              ? raw.some((r) => !r.participant1Name || !r.participant2Name)
              : raw.some((r) => !r.tournamentName || !r.categorySlug);
          if (
            needs &&
            (!data.metadata[endpoint] || now - data.metadata[endpoint].at > 30 * 24 * hour)
          ) {
            const value = await billable(`metadata:${endpoint}:${data.quota.period}`, endpoint, {
              sportId: '10',
              language: 'en',
            });
            if (value) data.metadata[endpoint] = { value, at: clock() };
          }
        }
        participants = data.metadata.participants?.value ?? participants;
        tournaments = data.metadata.tournaments?.value ?? tournaments;
        const rows = fixtureRows(raw, participants, tournaments);
        for (const f of fixtures) {
          const match = mapFixture(f, rows);
          if (match) {
            f.oddsId = match.fixtureId;
            f.competitionName = match.tournamentName;
            f.coverage = 'matched';
            if (match.statusId === 3) f.status = 'cancelled';
            if (match.statusName === 'Postponed') f.status = 'postponed';
            if (match.statusName === 'Suspended') f.status = 'suspended';
          } else {
            f.coverage = 'unmatched';
            delete f.oddsId;
          }
        }
        await save();
      }
      // Forecast final calls for known coupons plus two coupons/week until renewal (31 days if unknown).
      const days = data.quota.until
        ? Math.max(1, (Date.parse(data.quota.until) - now) / (24 * hour))
        : 31;
      const remainingFinals = data.journeys
        .filter((j) => selected(j) && !settled(j))
        .flatMap(allFixtures)
        .filter((f) => !data.jobs[`score:${f.id}:after`]).length;
      const forecast = Math.max(remainingFinals, Math.ceil(days / 7) * 30) + 4;
      for (const task of scoreTasks(data, clock())) {
        if (!withinTime() || calls >= 12) break;
        if (!selected(task.journey)) continue;
        const { fixture: f, stage } = task;
        if (!f.oddsId) continue;
        if (stage === 'during' && data.quota.operational - data.quota.used <= forecast) continue;
        const key = `score:${f.id}:${stage}`;
        try {
          // If the process dies after reserving, the persisted previous score is explicitly stale.
          f.stale = true;
          const raw = await billable(key, 'scores', { fixtureId: f.oddsId });
          if (!raw) continue;
          Object.assign(f, parseScores(raw, f.oddsId, clock()));
          data.jobs[key].state = 'ok';
        } catch {
          f.stale = true;
          if (data.jobs[key]) data.jobs[key].state = 'failed';
          data.sync.odds = {
            state: 'error',
            checkedAt: iso(clock()),
            message: safeFailure('OddsPapi'),
          };
        }
        await save();
      }
      data.sync.odds.coverage = data.journeys
        .filter(selected)
        .flatMap(allFixtures)
        .filter((f) => f.oddsId).length;
      const pending = data.journeys.filter((j) => selected(j) && !settled(j)).flatMap(allFixtures);
      const missing = pending.filter((f) => !f.oddsId).length;
      const failed = pending.some((f) =>
        ['during', 'after'].some((stage) =>
          ['attempted', 'failed'].includes(data.jobs[`score:${f.id}:${stage}`]?.state),
        ),
      );
      if (data.sync.odds.state === 'ok' && (missing || failed)) {
        data.sync.odds.state = 'partial';
        data.sync.odds.message = `${missing} encuentros sin correspondencia deportiva; ${failed ? 'hay intentos fallidos o interrumpidos' : 'cobertura parcial'}. SELAE sigue confirmando los resultados.`;
      }
      data.sync.odds.used = data.quota.used;
      data.sync.odds.operational = data.quota.operational;
    } catch {
      data.sync.odds = {
        state: 'error',
        checkedAt: iso(clock()),
        message: safeFailure('OddsPapi'),
      };
    }
  }
}
