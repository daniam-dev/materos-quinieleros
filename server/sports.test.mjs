import { test } from 'node:test';
import assert from 'node:assert/strict';
import seed from './seed.json' with { type: 'json' };
import selaeSample from './testing/selae-v3-sample.json' with { type: 'json' };
import { draw, fixtures, account, memoryStore } from './testing/providers.mjs';
import {
  drawIdentity,
  parseDraw,
  madridTime,
  selaeProvider,
  normalizeDetail,
  normalizeListing,
  enrichSchedule,
} from './providers/selae.mjs';
import {
  accountQuota,
  reconcileQuota,
  oddspapiProvider,
  mapFixture,
  parseScores,
} from './providers/oddspapi.mjs';
import { emptySports, mergeSports, currentJourney } from './sports-data.mjs';
import { synchronize, updateJourney, scoreTasks } from './synchronize.mjs';
import { applyCommand, publicSeason } from './domain.mjs';
import { createApi } from './api.mjs';
import { sessionCookie, hashPassword } from './auth.mjs';

const now = Date.parse('2026-10-27T19:05:00Z');
const captured = new Date(now).toISOString();
const parsed = (d = draw()) => parseDraw(d, drawIdentity(d), captured);
const oddsScores = (id, home = 2, away = 1) => ({
  fixtureId: id,
  scores: {
    periods: {
      fulltime: { participant1Score: home, participant2Score: away, updatedAt: captured },
      penalties: { participant1Score: 5, participant2Score: 4, updatedAt: captured },
    },
  },
});
function setup({ coupon = draw(), used = 0, limit = 250, failure, active = true } = {}) {
  let time = now;
  const calls = [];
  const sportsStore = memoryStore();
  const privateStore = memoryStore(seed);
  const selae = { discover: async () => [coupon], draw: async () => coupon };
  const odds = {
    configured: active,
    async request(endpoint, params) {
      calls.push({ endpoint, params });
      if (endpoint === failure) throw new Error('PRIVATE-KEY must not escape');
      if (endpoint === 'account') return account(used, limit);
      if (endpoint === 'fixtures') return fixtures(coupon);
      if (endpoint === 'scores') return oddsScores(params.fixtureId);
      throw new Error('unexpected endpoint');
    },
  };
  const run = (extra = {}) =>
    synchronize({
      sportsStore,
      privateStore,
      seed,
      selae,
      odds,
      clock: () => time,
      sleep: async () => {},
      ...extra,
    });
  return {
    sportsStore,
    privateStore,
    selae,
    odds,
    calls,
    run,
    setTime: (t) => {
      time = t;
    },
  };
}

test('Madrid: invierno, verano, cambio horario; rechaza horas inexistentes o ambiguas', () => {
  assert.equal(madridTime('2026-10-27 18:00:00'), '2026-10-27T17:00:00.000Z');
  assert.equal(madridTime('2026-07-27 18:00:00'), '2026-07-27T16:00:00.000Z');
  assert.throws(() => madridTime('2026-03-29 02:30:00'));
  assert.throws(() => madridTime('2026-10-25 02:30:00'));
  assert.throws(() => madridTime('2026-02-30 12:30:00'));
});
test('SELAE valida identidad completa, 15 posiciones únicas, categorías y ausencia de horarios', () => {
  const coupon = draw();
  assert.equal(parsed(coupon).fixtures.length, 14);
  assert.throws(() => parseDraw(coupon, { drawId: 'wrong' }, captured));
  coupon.partidos[0].posicion = 2;
  assert.throws(() => parsed(coupon));
  coupon.partidos[0].posicion = 1;
  coupon.partidos[0].fecha_completa = null;
  assert.equal(parsed(coupon).closesAt, null);
  assert.equal(parsed(coupon).fixtures[0].kickoff, null);
  coupon.partidos[0].local = 'Local (f)';
  assert.throws(() => parsed(coupon));
  coupon.partidos[0].visitante = 'Visitante (f)';
  assert.equal(parsed(coupon).fixtures[0].category, 'women');
  assert.equal(parsed(coupon).competition, 'mixed');
});
test('servicios SELAE encapsulados, fallback por fecha y rechazo de otra jornada', async () => {
  const coupon = draw();
  const urls = [];
  const provider = selaeProvider(async (url) => {
    urls.push(String(url));
    return Response.json(url.pathname.endsWith('sorteov3') ? [] : [coupon]);
  });
  assert.equal((await provider.discover()).length, 1);
  assert.equal((await provider.draw(drawIdentity(coupon))).id_sorteo, coupon.id_sorteo);
  assert.ok(urls[2].includes('fecha_sorteo=20261027'));
  await assert.rejects(provider.draw({ ...drawIdentity(coupon), drawId: 'different' }));
});
test('importación idempotente, cambios entre semana preservan IDs, apuestas, personas y revisión privada', async () => {
  const coupon = draw();
  const s = setup({ coupon, active: false });
  await s.run();
  const sports = (await s.sportsStore.read()).data;
  const merged = mergeSports(seed, sports, now);
  const command = {
    type: 'save-predictions',
    journeyId: merged.journeys[0].id,
    participantId: seed.participants[0].id,
    signs: Array(14).fill('1'),
    pleno: { home: 'M', away: '0' },
  };
  const saved = applyCommand(merged, command);
  const oldPrivate = await s.privateStore.read();
  await s.privateStore.write(saved, oldPrivate.etag);
  const privateBefore = await s.privateStore.read();
  coupon.partidos[0].fecha_completa = '2026-10-28 19:30:00';
  s.setTime(now + 3600000);
  await s.run({ force: true });
  const next = mergeSports(
    (await s.privateStore.read()).data,
    (await s.sportsStore.read()).data,
    now,
  );
  assert.equal(next.journeys.length, 1);
  assert.equal(next.journeys[0].fixtures[0].id, merged.journeys[0].fixtures[0].id);
  assert.equal(next.journeys[0].fixtures[0].kickoff, '2026-10-28T18:30:00.000Z');
  assert.deepEqual(next.journeys[0].predictions, saved.journeys[0].predictions);
  assert.deepEqual(next.participants, seed.participants);
  assert.deepEqual(await s.privateStore.read(), privateBefore);
});
test('actual determinista conserva jornada en juego y después selecciona siguiente; no borra histórico', () => {
  const current = parsed();
  const next = parsed(draw({ id: '2', date: '2026-10-29' }));
  assert.equal(currentJourney([next, current], now), current.id);
  current.officialResults = current.fixtures.map((f) => ({ fixtureId: f.id, sign: '1' }));
  current.pleno.official = { home: 'M', away: '0' };
  assert.equal(currentJourney([next, current], now), next.id);
});
test('cambio de identidad o orden rechaza actualización sin perder datos; correcciones oficiales admitidas', () => {
  const initial = parsed(draw({ sign: '1' }));
  const corrected = parsed(draw({ sign: 'X' }));
  const next = updateJourney(initial, corrected, seed.participants, now);
  assert.equal(next.officialResults[0].sign, 'X');
  assert.equal(next.fixtures[0].score, undefined);
  corrected.fixtures[0].sourceIdentity = 'different';
  assert.throws(() => updateJourney(initial, corrected, seed.participants, now));
});
test('cero, uno y dos dobles válidos; triples y tercer doble rechazados; migración aditiva', () => {
  const snapshot = mergeSports(seed, { ...emptySports(), journeys: [parsed()] }, now);
  for (const count of [0, 1, 2, 3]) {
    const signs = Array.from({ length: 14 }, (_, i) => (i < count ? ['1X', '12', 'X2'][i] : '1'));
    const command = {
      type: 'save-predictions',
      journeyId: snapshot.journeys[0].id,
      participantId: seed.participants[0].id,
      signs,
      pleno: { home: 'M', away: '2' },
    };
    if (count < 3) assert.equal(applyCommand(snapshot, command).journeys[0].predictions.length, 14);
    else assert.throws(() => applyCommand(snapshot, command), /dos dobles/);
    command.signs[0] = '1X2';
    assert.throws(() => applyCommand(snapshot, command));
  }
});
test('privacidad antes del cierre y sin horario; no se publica por la fecha del sorteo', () => {
  const j = {
    ...parsed(),
    predictions: [{ secret: 'private' }],
    pleno: { ...parsed().pleno, predictions: [{ secret: 'private' }] },
  };
  const snapshot = { ...seed, journeys: [j] };
  assert.equal(
    JSON.stringify(publicSeason(snapshot, Date.parse(j.closesAt) - 1)).includes('private'),
    false,
  );
  j.closesAt = null;
  assert.equal(JSON.stringify(publicSeason(snapshot, now)).includes('private'), false);
});
test('identidad deportiva exige cruce, género, competición y horario inequívocos', () => {
  const f = parsed().fixtures[0];
  const rows = fixtures(draw());
  assert.equal(mapFixture(f, rows).fixtureId, 'odds-1');
  assert.equal(mapFixture({ ...f, category: 'women' }, rows), null);
  assert.equal(mapFixture(f, [...rows, rows[0]]), null);
  assert.equal(
    mapFixture(
      f,
      rows.map((r) => ({ ...r, tournamentName: 'Unknown' })),
    ),
    null,
  );
});
test('scores: un partido, correcciones, sin estado/minuto inventado; prórroga/tanda separados', () => {
  const parsedScore = parseScores(oddsScores('a'), 'a', now);
  assert.deepEqual(parsedScore.score, { home: 2, away: 1 });
  assert.equal(parsedScore.status, undefined);
  assert.equal(parsedScore.minute, undefined);
  assert.equal(parsedScore.official, undefined);
  assert.deepEqual(parseScores(oddsScores('a', 0, 1), 'a', now).score, { home: 0, away: 1 });
  assert.throws(() => parseScores(oddsScores('b'), 'a', now));
  assert.throws(() =>
    parseScores(
      { fixtureId: 'a', scores: { 0: { participant1Score: 0, participant2Score: 0 } } },
      'a',
      now,
    ),
  );
  assert.throws(() => parseScores({ fixtureId: 'a', scores: { periods: {} } }, 'a', now));
});
test('plan usa horarios vigentes, solo etapa vencida, nunca futuros, aplazados ni oficiales', () => {
  const data = { ...emptySports(), journeys: [parsed()] };
  assert.equal(scoreTasks(data, now - 3 * 3600000).length, 0);
  assert.equal(scoreTasks(data, now)[0].stage, 'after');
  data.journeys[0].officialResults.push({ fixtureId: data.journeys[0].fixtures[0].id });
  data.journeys[0].fixtures[1].status = 'postponed';
  data.journeys[0].fixtures[2].kickoff = '2026-10-28T19:00:00Z';
  assert.equal(scoreTasks(data, now).length, 12);
});
test('cuota prudente no reinicia por calendario o descenso y respeta límite real y reserva', () => {
  const old = reconcileQuota(null, accountQuota(account(190)), now);
  assert.equal(reconcileQuota(old, accountQuota(account(1)), now).used, 190);
  assert.equal(reconcileQuota(old, accountQuota(account(1, 100)), now).operational, 50);
  assert.equal(
    reconcileQuota(old, accountQuota(account(1, 250, '2026-10-27T00:00:00Z')), now).used,
    1,
  );
  assert.equal(JSON.stringify(old).includes('must-never-persist'), false);
  assert.throws(() => accountQuota({ subscriptions: [] }));
});
test('reservas antes de HTTP, concurrencia y límite 200 con errores facturables', async () => {
  const s = setup({ used: 198, failure: 'scores' });
  await Promise.all([s.run(), s.run()]);
  const stored = (await s.sportsStore.read()).data;
  assert.equal(stored.quota.used, 200);
  assert.equal(s.calls.filter((c) => c.endpoint !== 'account').length, 2);
  assert.equal(Object.values(stored.jobs).filter((j) => j.endpoint === 'scores').length, 1);
  assert.equal(JSON.stringify(stored).includes('PRIVATE-KEY'), false);
  s.setTime(now + 900000);
  await s.run();
  assert.equal(s.calls.filter((c) => c.endpoint !== 'account').length, 2);
});
test('cuenta fallida impide llamadas facturables; agotamiento y plan inferior protegen reserva', async () => {
  for (const options of [{ failure: 'account' }, { used: 250 }, { used: 51, limit: 100 }]) {
    const s = setup(options);
    await s.run();
    assert.equal(s.calls.filter((c) => c.endpoint !== 'account').length, 0);
  }
});
test('presupuesto reduce consultas durante el desarrollo, protege finales y no repite intentos', async () => {
  const s = setup({ used: 180 });
  s.setTime(now - 3600000);
  await s.run();
  assert.equal(s.calls.filter((c) => c.endpoint === 'scores').length, 0);
  s.setTime(now);
  await s.run();
  assert.ok(s.calls.some((c) => c.endpoint === 'scores'));
  const first = s.calls.filter((c) => c.endpoint === 'scores').map((c) => c.params.fixtureId);
  s.setTime(now + 900000);
  await s.run();
  const total = s.calls.filter((c) => c.endpoint === 'scores').map((c) => c.params.fixtureId);
  assert.equal(new Set(total).size, total.length);
  assert.ok(first.length > 0);
});
test('fallo SELAE conserva jornadas y comunica estado; no clave significa cero HTTP OddsPapi', async () => {
  const s = setup({ active: false });
  await s.run();
  s.selae.draw = async () => {
    throw new Error();
  };
  s.setTime(now + 900000);
  await s.run();
  const data = (await s.sportsStore.read()).data;
  assert.equal(data.journeys.length, 1);
  assert.equal(data.sync.selae.state, 'error');
  assert.equal(s.calls.length, 0);
});
test('API pública lee copia; edición concurrente de deporte no invalida revisión privada', async () => {
  const s = setup({ active: false });
  await s.run();
  const env = {
    ADMIN_SESSION_SECRET: 's'.repeat(48),
    ADMIN_PASSWORD_HASH: await hashPassword('test-password-123'),
  };
  const api = createApi({
    store: s.privateStore,
    sportsStore: s.sportsStore,
    seed,
    env,
    clock: () => now,
    sync: () => {
      throw new Error('No public sports calls');
    },
  });
  const cookie = sessionCookie(env, now, true).split(';')[0];
  const req = (path, options = {}) =>
    api(
      new Request(`https://test.local${path}`, {
        ...options,
        headers: {
          Cookie: cookie,
          Origin: 'https://test.local',
          'Content-Type': 'application/json',
          ...options.headers,
        },
      }),
    );
  const before = await (await req('/api/admin')).json();
  assert.ok(before.revision);
  for (let i = 0; i < 5; i++) assert.equal((await req('/api/season')).status, 200);
  s.setTime(now + 900000);
  await s.run();
  const result = await req('/api/admin', {
    method: 'POST',
    headers: { 'If-Match': before.revision },
    body: JSON.stringify({
      type: 'save-predictions',
      journeyId: before.snapshot.journeys[0].id,
      participantId: seed.participants[0].id,
      signs: ['1X', 'X2', ...Array(12).fill('1')],
      pleno: { home: 'M', away: '0' },
    }),
  });
  assert.equal(result.status, 200);
  assert.equal((await s.privateStore.read()).data.journeys[0].predictions.length, 14);
  assert.equal(s.calls.length, 0);
});
test('proveedor nunca registra URL/clave y rechaza redirecciones sin retries', async () => {
  let count = 0;
  const provider = oddspapiProvider('private-value', async (_url, options) => {
    count++;
    assert.equal(options.redirect, 'error');
    throw new Error('private-value');
  });
  await assert.rejects(
    provider.request('scores', { fixtureId: 'one' }),
    (e) => !e.message.includes('private-value'),
  );
  assert.equal(count, 1);
});

test('cada llamada facturable observa una reserva duradera antes de salir', async () => {
  const s = setup({ used: 196 });
  const request = s.odds.request;
  s.odds.request = async (endpoint, params) => {
    if (endpoint !== 'account') {
      const stored = (await s.sportsStore.read()).data;
      assert.ok(stored.quota.used > 196);
      assert.ok(
        Object.values(stored.jobs).some(
          (job) => job.endpoint === endpoint && job.state === 'attempted',
        ),
      );
    }
    return request(endpoint, params);
  };
  await s.run();
  assert.equal((await s.sportsStore.read()).data.quota.used, 200);
});

test('worker caducado no confirma sobre otro y el intento interrumpido no se vuelve a gastar', async () => {
  const s = setup({ used: 198 });
  let release;
  let entered;
  const pending = new Promise((resolve) => {
    entered = resolve;
  });
  const request = s.odds.request;
  s.odds.request = async (endpoint, params) => {
    if (endpoint === 'scores') {
      entered();
      await new Promise((resolve) => {
        release = resolve;
      });
    }
    return request(endpoint, params);
  };
  const first = s.run();
  await pending;
  s.setTime(now + 180000);
  await s.run();
  const replacement = await s.sportsStore.read();
  release();
  await first;
  assert.deepEqual(await s.sportsStore.read(), replacement);
  assert.equal(replacement.data.quota.used, 200);
  assert.equal(
    Object.values(replacement.data.jobs).filter((job) => job.endpoint === 'scores').length,
    1,
  );
});

test('descubrimiento y metadatos facturables se cachean; errores no disparan retries', async () => {
  const s = setup({ used: 197 });
  const request = s.odds.request;
  s.odds.request = async (endpoint, params) => {
    if (endpoint === 'fixtures') {
      s.calls.push({ endpoint });
      return fixtures(draw()).map((r, i) => ({
        ...r,
        participant1Id: i * 2 + 1,
        participant2Id: i * 2 + 2,
        participant1Name: undefined,
        participant2Name: undefined,
        tournamentName: undefined,
        categorySlug: undefined,
        tournamentId: 1,
      }));
    }
    if (endpoint === 'participants') {
      s.calls.push({ endpoint });
      return Object.fromEntries(
        draw().partidos.flatMap((p) => [
          [p.idLocal, p.local],
          [p.idVisitante, p.visitante],
        ]),
      );
    }
    if (endpoint === 'tournaments') {
      s.calls.push({ endpoint });
      return [{ tournamentId: 1, tournamentName: 'LaLiga', categorySlug: 'spain' }];
    }
    return request(endpoint, params);
  };
  await s.run();
  assert.equal((await s.sportsStore.read()).data.quota.used, 200);
  assert.deepEqual(
    s.calls.map((c) => c.endpoint),
    ['account', 'fixtures', 'participants', 'tournaments'],
  );
  s.setTime(now + 900000);
  await s.run();
  assert.equal(s.calls.filter((c) => c.endpoint === 'fixtures').length, 1);
});

test('cierre ausente sigue privado; calendario actualizado no borra suspensión conocida', () => {
  const initial = parsed();
  initial.fixtures[0].status = 'suspended';
  const next = updateJourney(initial, parsed(), seed.participants, now);
  assert.equal(next.fixtures[0].status, 'suspended');
  const changed = draw();
  changed.partidos[0].fecha_completa = '2026-10-29 18:00:00';
  assert.equal(
    updateJourney(initial, parsed(changed), seed.participants, now).fixtures[0].status,
    'scheduled',
  );
});

test('recuperación por fecha descubre una jornada en curso omitida en próximos', async () => {
  const s = setup({ active: false });
  s.selae.discover = async () => [];
  s.selae.recent = async (day) => [draw({ date: day })];
  await s.run();
  assert.equal((await s.sportsStore.read()).data.journeys.length, 1);
});

test('sincronización privada rechaza visitantes y otro origen', async () => {
  const s = setup();
  let calls = 0;
  const env = {
    ADMIN_SESSION_SECRET: 's'.repeat(48),
    ADMIN_PASSWORD_HASH: await hashPassword('test-password-123'),
  };
  const api = createApi({
    store: s.privateStore,
    sportsStore: s.sportsStore,
    seed,
    env,
    clock: () => now,
    sync: async () => {
      calls++;
      return {};
    },
  });
  const request = (headers) =>
    api(
      new Request('https://test.local/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'If-Match': '1', ...headers },
        body: JSON.stringify({ type: 'sync' }),
      }),
    );
  assert.equal((await request({ Origin: 'https://test.local' })).status, 403);
  const cookie = sessionCookie(env, now, true).split(';')[0];
  assert.equal((await request({ Origin: 'https://elsewhere.test', Cookie: cookie })).status, 403);
  assert.equal(calls, 0);
});

test('respuestas SELAE v3 capturadas: listado, boleto de entre semana y calendario de resultados', async () => {
  const provider = selaeProvider(async (url) => {
    const key = `${url.pathname.split('/').at(-1)}:${url.searchParams.get('idsorteo') ?? url.searchParams.get('fecha_sorteo') ?? 'listing'}`;
    assert.ok(selaeSample.recordings[key], key);
    return Response.json(selaeSample.recordings[key]);
  });
  const [summary] = await provider.discover();
  const identity = drawIdentity(summary);
  assert.equal(identity.number, 17);
  const j = parseDraw(await provider.draw(identity), identity, selaeSample.capturedAt);
  assert.equal(j.fixtures.length, 14);
  assert.equal(j.fixtures[0].home, 'Rsd Alcalá (m)');
  assert.equal(j.pleno.fixture.number, 15);
  assert.equal(j.closesAt, '2026-10-27T19:00:00.000Z');
  assert.equal(j.salesCloseAt, j.closesAt);
  const [previous] = await provider.recent('2026-10-25');
  const oldIdentity = drawIdentity(previous);
  const old = parseDraw(await provider.draw(oldIdentity), oldIdentity, selaeSample.capturedAt);
  assert.equal(old.number, 16);
  assert.equal(old.fixtures.filter((f) => f.kickoff).length, 14);
  assert.equal(old.fixtures[10].category, 'women');
  assert.equal(old.officialResults.length, 14);
  assert.deepEqual([old.pleno.official.home, old.pleno.official.away], ['1', '2']);
});

test('normalización v3 no sustituye identidad contradictoria ni corrige posiciones parciales', () => {
  const identity = drawIdentity(normalizeListing(selaeSample.recordings['proximosv3:listing'][0]));
  const compact = structuredClone(selaeSample.recordings[`sorteov3:${identity.drawId}`][0]);
  assert.throws(() => normalizeDetail({ ...compact, jornada: 99 }, identity));
  assert.throws(() =>
    normalizeDetail({ ...compact, fecha_sorteo: '2026-10-29 00:00:00' }, identity),
  );
  compact.partidos[0].posicion = 2;
  assert.throws(() => normalizeDetail(compact, identity));
  const primary = normalizeDetail(draw(), drawIdentity(draw()));
  const other = draw();
  other.partidos[0].local = 'Otro equipo (m)';
  assert.throws(() => enrichSchedule(primary, other, drawIdentity(draw())));
});
