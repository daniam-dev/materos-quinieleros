import { test } from 'node:test';
import assert from 'node:assert/strict';
import seed from './seed.json' with { type: 'json' };
import { createApi } from './api.mjs';
import { sessionCookie, hashPassword } from './auth.mjs';
import { competitionIds, fixtureSignature, withParticipation } from './competitions.mjs';
import { applyCommand, publicSeason } from './domain.mjs';
import { emptySports, mergeSports } from './sports-data.mjs';
import { draw, memoryStore } from './testing/providers.mjs';
import { drawIdentity, parseDraw } from './providers/selae.mjs';
import { synchronize, updateJourney } from './synchronize.mjs';

const now = Date.parse('2026-10-27T10:00:00Z');
const iso = new Date(now).toISOString();
const origin = 'https://quinielas.test';
const env = {
  ADMIN_PASSWORD_HASH: await hashPassword('competition-test-only'),
  ADMIN_SESSION_SECRET: 'a'.repeat(48),
};
const cookie = sessionCookie(env, now, true).split(';')[0];
const coupon = (id = '20001', date = '2026-11-01') => {
  const row = draw({ id, date });
  return parseDraw(row, drawIdentity(row), iso);
};
const snapshot = (journeys) => ({
  ...structuredClone(seed),
  journeys,
  currentJourneyId: journeys[0]?.id ?? null,
});
const settings = (enabledIds = ['primera']) => ({
  enabled: true,
  enabledIds,
  protectedJourneyIds: [],
});
const annotate = (data) =>
  withParticipation(mergeSports(data, { ...emptySports(), journeys: data.journeys }, now));
const classification = (j, ids) => ({
  type: 'classify-journey',
  journeyId: j.id,
  competitionIds: ids,
  fixtureSignature: fixtureSignature(j),
  confirmed: true,
});

test('el filtro exige identificar los 15 encuentros, incluido el Pleno, y todas las competiciones mixtas', () => {
  const j = coupon();
  j.fixtures.forEach((f) => {
    f.competitionName = 'LaLiga';
  });
  const data = { ...snapshot([j]), competitionSettings: settings() };
  assert.equal(annotate(data).journeys[0].participation.state, 'pending');
  j.pleno.fixture.competitionName = 'UEFA Champions League';
  assert.equal(annotate(data).journeys[0].participation.state, 'excluded');
  data.competitionSettings.enabledIds.push('champions');
  assert.equal(annotate(data).journeys[0].participation.state, 'enabled');
  assert.equal(annotate(data).journeys[0].fixtures.length, 14);
  assert.ok(annotate(data).journeys[0].pleno.fixture);
  j.pleno.fixture.competitionName = 'Unrecognized tournament';
  assert.equal(annotate(data).journeys[0].participation.state, 'pending');
});

test('sin configurar se conserva el comportamiento; activar protege histórico y apuestas, sin resucitar excluidos', () => {
  const history = coupon('20000', '2026-10-20');
  const future = coupon();
  const betting = coupon('20002');
  betting.predictions = [
    { participantId: 'daniel-arroyo', fixtureId: betting.fixtures[0].id, sign: '1' },
  ];
  betting.pleno.predictions = [];
  let data = annotate(snapshot([history, future, betting]));
  assert.equal(publicSeason(data, now).journeys.length, 3);
  data = applyCommand(data, { type: 'set-competitions', enabled: true, enabledIds: [] }, now);
  data = annotate(data);
  assert.deepEqual(
    data.journeys.map((j) => j.participation.state),
    ['preserved', 'pending', 'preserved'],
  );
  const published = publicSeason(data, now);
  assert.equal(published.journeys.length, 2);
  assert.ok(!('competitionSettings' in published));
  assert.ok(!('journeyCompetitions' in published));
  assert.ok(published.journeys.some((j) => j.id === published.currentJourneyId));
  data = annotate(applyCommand(data, classification(future, ['champions']), now));
  const later = Date.parse('2026-11-02T20:00:00Z');
  data = applyCommand(data, { type: 'set-competitions', enabled: true, enabledIds: [] }, later);
  assert.equal(
    annotate(data).journeys.find((j) => j.id === future.id).participation.state,
    'excluded',
  );
  assert.equal(betting.predictions.length, 1);
});

test('la selección nula explícita se respeta y una jornada excluida no cambia la temporada pública', () => {
  const old = coupon('20000', '2026-10-20');
  const future = coupon('20001', '2027-10-27');
  const data = snapshot([old, future]);
  data.currentJourneyId = null;
  assert.equal(publicSeason(data, now).currentJourneyId, null);
  data.currentJourneyId = future.id;
  data.competitionSettings = { ...settings(), protectedJourneyIds: [old.id] };
  const visible = publicSeason(data, now);
  assert.equal(visible.currentJourneyId, old.id);
  assert.equal(visible.season.id, old.seasonId);
});

test('clasificación manual explícita, completa y ligada a la identidad de los 15 cruces', () => {
  const j = coupon();
  const initial = { ...snapshot([j]), competitionSettings: settings() };
  let data = applyCommand(annotate(initial), classification(j, ['primera', 'champions']), now);
  assert.equal(annotate(data).journeys[0].participation.state, 'excluded');
  data = applyCommand(annotate(data), classification(j, ['primera']), now);
  assert.equal(annotate(data).journeys[0].participation.source, 'admin');
  assert.equal(annotate(data).journeys[0].participation.state, 'enabled');
  for (const change of [
    { confirmed: false },
    { competitionIds: [] },
    { competitionIds: ['inventada'] },
    { competitionIds: ['primera', 'primera'] },
    { fixtureSignature: 'stale' },
  ])
    assert.throws(() =>
      applyCommand(annotate(data), { ...classification(j, ['primera']), ...change }, now),
    );
  data.journeys[0].pleno.fixture.away = 'Equipo corregido';
  assert.equal(annotate(data).journeys[0].participation.state, 'pending');
  assert.throws(() => applyCommand(annotate(data), classification(j, ['primera']), now));
});

test('API persiste preferencias separadas de deportes, aplica permisos/revisión y bloquea apuestas excluidas', async () => {
  const j = coupon();
  const store = memoryStore(snapshot([]));
  const sportsStore = memoryStore({ ...emptySports(), journeys: [j] });
  const api = createApi({ store, sportsStore, seed, env, clock: () => now });
  const request = (path, command, revision, authenticated = true) =>
    api(
      new Request(origin + path, {
        method: command ? 'POST' : 'GET',
        headers: {
          Origin: origin,
          Cookie: authenticated ? cookie : '',
          ...(command ? { 'Content-Type': 'application/json', 'If-Match': revision } : {}),
        },
        ...(command ? { body: JSON.stringify(command) } : {}),
      }),
    );
  let admin = await (await request('/api/admin')).json();
  assert.equal(admin.competitionCatalog.length, 8);
  assert.equal(admin.competitionSettings.enabled, false);
  const command = { type: 'set-competitions', enabled: true, enabledIds: ['primera'] };
  assert.equal((await request('/api/admin', command, admin.revision, false)).status, 403);
  assert.equal((await request('/api/admin', command, 'stale')).status, 409);
  assert.equal(
    (await request('/api/admin', { ...command, enabledIds: ['inventada'] }, admin.revision)).status,
    400,
  );
  assert.equal((await request('/api/admin', command, admin.revision)).status, 200);
  admin = await (await request('/api/admin')).json();
  assert.equal(admin.snapshot.journeys[0].participation.state, 'pending');
  assert.equal(admin.snapshot.currentJourneyId, null);
  assert.equal(admin.snapshot.journeys[0].fixtureSignature, fixtureSignature(j));
  assert.deepEqual((await (await request('/api/season')).json()).journeys, []);
  assert.equal(
    (await request('/api/admin', { type: 'save-predictions', journeyId: j.id }, admin.revision))
      .status,
    400,
  );
  assert.equal(
    (await request('/api/admin', classification(j, ['primera', 'champions']), admin.revision))
      .status,
    200,
  );
  admin = await (await request('/api/admin')).json();
  assert.equal(admin.snapshot.journeys[0].participation.state, 'excluded');
  assert.equal(
    (await request('/api/admin', { ...command, enabledIds: competitionIds }, admin.revision))
      .status,
    200,
  );
  const publicData = await (await request('/api/season')).json();
  assert.equal(publicData.journeys[0].fixtures.length, 14);
  assert.ok(!('fixtureSignature' in publicData.journeys[0]));
  assert.equal(publicData.journeys[0].predictions.length, 0);
  assert.equal((await store.read()).data.journeys.length, 0);
  assert.ok((await store.read()).data.journeyCompetitions[j.id]);
  assert.equal((await sportsStore.read()).etag, '1');
  admin = await (await request('/api/admin')).json();
  assert.equal(
    (await request('/api/admin', { ...command, enabledIds: [] }, admin.revision)).status,
    200,
  );
  assert.equal((await (await request('/api/season')).json()).currentJourneyId, null);
  admin = await (await request('/api/admin')).json();
  assert.equal(
    (await request('/api/admin', { ...command, enabled: false }, admin.revision)).status,
    200,
  );
  assert.equal((await (await request('/api/season')).json()).journeys.length, 1);
});

test('el worker conserva SELAE y no consume marcadores de boletos pendientes/excluidos', async () => {
  for (const excluded of [false, true]) {
    const row = draw({ date: '2026-11-01' });
    const privateData = { ...snapshot([]), competitionSettings: settings([]) };
    if (excluded) {
      const j = coupon('10001');
      privateData.journeyCompetitions = {
        [j.id]: { fixtureSignature: fixtureSignature(j), competitionIds: ['champions'] },
      };
    }
    const privateStore = memoryStore(privateData);
    const sportsStore = memoryStore();
    let calls = 0;
    const result = await synchronize({
      sportsStore,
      privateStore,
      seed,
      selae: { discover: async () => [row], draw: async () => row },
      odds: {
        configured: true,
        request: async () => {
          calls++;
          throw new Error('No calls expected');
        },
      },
      clock: () => now,
    });
    assert.equal(result.synchronized, true);
    assert.equal((await sportsStore.read()).data.journeys.length, 1);
    assert.equal(calls, 0);
    assert.deepEqual((await privateStore.read()).data, privateData);
    assert.equal(
      annotate({ ...privateData, journeys: (await sportsStore.read()).data.journeys }).journeys[0]
        .participation.state,
      excluded ? 'excluded' : 'pending',
    );
  }
});

test('refrescar SELAE conserva identificación deportiva y la decisión manual independiente', () => {
  const before = coupon();
  before.fixtures.forEach((f) => {
    f.competitionName = 'LaLiga';
  });
  before.pleno.fixture.competitionName = 'LaLiga';
  const refreshed = updateJourney(before, coupon(), [], now);
  assert.equal(refreshed.pleno.fixture.competitionName, 'LaLiga');
  const data = { ...snapshot([refreshed]), competitionSettings: settings() };
  assert.equal(annotate(data).journeys[0].participation.state, 'enabled');
});
