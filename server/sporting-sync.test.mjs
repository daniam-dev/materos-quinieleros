import { test } from 'node:test';
import assert from 'node:assert/strict';
import seed from './seed.json' with { type: 'json' };
import { applyCommand } from './domain.mjs';
import { allFixtures, emptySports, mergeSports, privateUpdate } from './sports-data.mjs';
import { applySportingFinal, mapPlayedFixture, parseScores } from './providers/oddspapi.mjs';
import { synchronize, scoreTasks } from './synchronize.mjs';
import { account, memoryStore } from './testing/providers.mjs';

const hour = 3600000;
const kickoff = '2026-10-27T18:00:00.000Z';
const now = Date.parse(kickoff) + 2.5 * hour;
const captured = new Date(now).toISOString();

function privateCoupon() {
  const original = structuredClone(seed);
  const command = {
    type: 'create-played-journey',
    number: 17,
    drawDate: '2026-10-27',
    closesAt: '2026-10-27T17:00:00.000Z',
    confirmed: true,
    fixtures: Array.from({ length: 15 }, (_, index) => ({
      home: `Local ${index + 1}`,
      away: `Visitante ${index + 1}`,
      category: 'men',
      kickoff: null,
      competitionName: null,
    })),
  };
  return privateUpdate(original, applyCommand(original, command, now), command);
}

const row = (overrides = {}) => ({
  fixtureId: 'odds-1',
  sportId: 10,
  participant1Name: 'Local 1',
  participant2Name: 'Visitante 1',
  tournamentName: 'LaLiga',
  categorySlug: 'spain',
  startTime: kickoff,
  statusId: 2,
  ...overrides,
});
const scores = (fixtureId = 'odds-1', home = 2, away = 1) => ({
  fixtureId,
  scores: {
    periods: {
      fulltime: { participant1Score: home, participant2Score: away, updatedAt: captured },
      overtime: { participant1Score: 9, participant2Score: 0, updatedAt: captured },
      penalties: { participant1Score: 9, participant2Score: 0, updatedAt: captured },
    },
  },
});

function setup({ privateData = privateCoupon(), active = true, statusId = 2, limit = 250 } = {}) {
  let time = now;
  let fixtureStatus = statusId;
  const calls = [];
  const sportsStore = memoryStore();
  const privateStore = memoryStore(privateData);
  const selae = Object.fromEntries(
    ['discover', 'draw', 'recent'].map((method) => [
      method,
      async () => {
        assert.fail(`selectedOnly must not call SELAE.${method}`);
      },
    ]),
  );
  const odds = {
    configured: active,
    async request(endpoint, params = {}) {
      assert.equal(active, true, 'No-key mode must never issue provider HTTP');
      calls.push({ endpoint, params });
      if (endpoint === 'account') return account(0, limit);
      // Every billable outbound call must already have a durable reservation.
      const durable = (await sportsStore.read()).data;
      assert.ok(
        Object.values(durable.jobs).some(
          (job) => job.endpoint === endpoint && job.state === 'attempted',
        ),
      );
      assert.ok(durable.quota.used >= calls.filter((call) => call.endpoint !== 'account').length);
      if (endpoint === 'fixtures') return [row()];
      if (endpoint === 'fixture') return { fixtureId: params.fixtureId, statusId: fixtureStatus };
      if (endpoint === 'scores') return scores(params.fixtureId);
      assert.fail(`Unexpected provider endpoint ${endpoint}`);
    },
  };
  return {
    calls,
    sportsStore,
    privateStore,
    run: () =>
      synchronize({
        sportsStore,
        privateStore,
        seed,
        selae,
        odds,
        clock: () => time,
        sleep: async () => {},
        selectedOnly: true,
      }),
    setTime: (value) => {
      time = value;
    },
    setStatus: (value) => {
      fixtureStatus = value;
    },
  };
}

test('solo adopta boletos privados deportivos y funciona sin clave ni llamadas SELAE/OddsPapi', async () => {
  const original = privateCoupon();
  original.journeys.push({
    ...structuredClone(original.journeys[0]),
    id: 'unselected-legacy',
    resultPolicy: 'selae',
  });
  const bets = {
    type: 'save-predictions',
    journeyId: original.journeys[0].id,
    participantId: seed.participants[0].id,
    signs: Array(14).fill('1'),
    pleno: { home: 'M', away: '0' },
  };
  const saved = privateUpdate(original, applyCommand(original, bets, now), bets);
  const ctx = setup({ privateData: saved, active: false });
  const before = await ctx.privateStore.read();
  const result = await ctx.run();
  assert.equal(result.synchronized, true);
  const sports = (await ctx.sportsStore.read()).data;
  assert.deepEqual(
    sports.journeys.map((journey) => journey.id),
    [original.journeys[0].id],
  );
  assert.equal(sports.sync.coupons.state, 'manual');
  assert.equal(sports.sync.odds.state, 'unconfigured');
  assert.equal(sports.sync.selae, undefined);
  assert.equal(sports.journeys[0].predictions, undefined);
  assert.equal(sports.journeys[0].pleno.predictions, undefined);
  assert.equal(sports.journeys[0].resultOverrides, undefined);
  assert.deepEqual(await ctx.privateStore.read(), before);
  assert.deepEqual(ctx.calls, []);
  const merged = mergeSports(saved, sports, now);
  assert.deepEqual(merged.journeys[0].predictions, saved.journeys[0].predictions);
  assert.deepEqual(merged.journeys[0].pleno.predictions, saved.journeys[0].pleno.predictions);
});

test('sin boleto deportivo seleccionado no consulta la cuenta ni descubre encuentros', async () => {
  const ctx = setup({ privateData: structuredClone(seed) });
  await ctx.run();
  assert.deepEqual(ctx.calls, []);
  assert.equal((await ctx.sportsStore.read()).data.sync.odds.state, 'idle');
});

test('correspondencia exige género, equipos ordenados, torneo conocido y fecha inequívoca', () => {
  const fixture = privateCoupon().journeys[0].fixtures[0];
  assert.equal(mapPlayedFixture(fixture, [row()], '2026-10-27').fixtureId, 'odds-1');
  for (const candidate of [
    row({ participant1Name: 'Visitante 1', participant2Name: 'Local 1' }),
    row({ tournamentName: 'Liga F' }),
    row({ tournamentName: 'Unknown tournament' }),
    row({ categorySlug: 'wrong' }),
    row({ sportId: 11 }),
    row({ startTime: '2026-11-01T18:00:00Z' }),
    row({ startTime: '2026-10-27T18:00:00' }),
    row({ participant2Name: 'Visitante parecido' }),
  ])
    assert.equal(mapPlayedFixture(fixture, [candidate], '2026-10-27'), null);
  assert.equal(mapPlayedFixture({ ...fixture, category: 'unknown' }, [row()], '2026-10-27'), null);
  assert.equal(
    mapPlayedFixture(fixture, [row(), row({ fixtureId: 'duplicate-match' })], '2026-10-27'),
    null,
  );
  assert.equal(
    mapPlayedFixture({ ...fixture, kickoff: '2026-10-27T20:00:01Z' }, [row()], '2026-10-27'),
    null,
  );
  const female = { ...fixture, category: 'women' };
  assert.equal(
    mapPlayedFixture(female, [row({ tournamentName: 'Liga F' })], '2026-10-27').fixtureId,
    'odds-1',
  );
});

test('final deportivo exige estado final explícito y ambas identidades coincidentes', () => {
  const journey = privateCoupon().journeys[0];
  const fixture = journey.fixtures[0];
  fixture.oddsId = 'odds-1';
  for (const statusId of [0, 1, 3, undefined]) {
    const raw = scores();
    raw.scores.periods.result = {
      participant1Score: 4,
      participant2Score: 0,
      updatedAt: captured,
    };
    assert.equal(
      applySportingFinal(journey, fixture, raw, { fixtureId: 'odds-1', statusId }, now),
      false,
    );
    assert.deepEqual(journey.officialResults, []);
  }
  assert.equal(
    applySportingFinal(journey, fixture, scores(), { fixtureId: 'other', statusId: 2 }, now),
    false,
  );
  assert.throws(() =>
    applySportingFinal(
      journey,
      fixture,
      scores('other'),
      { fixtureId: 'odds-1', statusId: 2 },
      now,
    ),
  );
  assert.throws(() =>
    applySportingFinal(
      journey,
      fixture,
      scores('odds-1', -1, 0),
      { fixtureId: 'odds-1', statusId: 2 },
      now,
    ),
  );
  assert.throws(() =>
    applySportingFinal(
      journey,
      fixture,
      scores('odds-1', 1.5, 0),
      { fixtureId: 'odds-1', statusId: 2 },
      now,
    ),
  );
  assert.deepEqual(journey.officialResults, []);
  const provisional = parseScores(scores(), 'odds-1', now);
  Object.assign(fixture, provisional);
  assert.deepEqual(journey.officialResults, [], 'A parsed provisional score is not a final sign');
});

test('el resultado final explícito prima sobre fulltime y mantiene marcador y signo coherentes', () => {
  const journey = privateCoupon().journeys[0];
  const fixture = journey.fixtures[0];
  fixture.oddsId = 'odds-1';
  const raw = scores('odds-1', 1, 1);
  raw.scores.periods.result = {
    participant1Score: 3,
    participant2Score: 1,
    updatedAt: captured,
  };
  Object.assign(fixture, parseScores(raw, 'odds-1', now));
  assert.deepEqual(fixture.score, { home: 1, away: 1 });
  assert.equal(
    applySportingFinal(journey, fixture, raw, { fixtureId: 'odds-1', statusId: 2 }, now),
    true,
  );
  assert.equal(journey.officialResults[0].sign, '1');
  assert.deepEqual(fixture.score, { home: 3, away: 1 });
});

test('signos deportivos 1/X/2 y Pleno M proceden del marcador sin sumar prórroga ni penaltis', () => {
  for (const [home, away, sign] of [
    [2, 1, '1'],
    [1, 1, 'X'],
    [0, 2, '2'],
  ]) {
    const journey = privateCoupon().journeys[0];
    const fixture = journey.fixtures[0];
    fixture.oddsId = 'odds-1';
    assert.equal(
      applySportingFinal(
        journey,
        fixture,
        scores('odds-1', home, away),
        { fixtureId: 'odds-1', statusId: 2 },
        now,
      ),
      true,
    );
    assert.equal(journey.officialResults[0].sign, sign);
    assert.equal(journey.officialResults[0].source, 'sporting');
    assert.equal(fixture.status, 'finished');
  }
  const journey = privateCoupon().journeys[0];
  const pleno = journey.pleno.fixture;
  pleno.oddsId = 'odds-15';
  applySportingFinal(
    journey,
    pleno,
    scores('odds-15', 4, 2),
    { fixtureId: 'odds-15', statusId: 2 },
    now,
  );
  assert.deepEqual(journey.pleno.official, { home: 'M', away: '2', publishedAt: captured });
  assert.deepEqual(journey.officialResults, []);
});

test('worker finaliza un encuentro con reservas duraderas para descubrimiento, estado y marcador', async () => {
  const ctx = setup();
  const before = await ctx.privateStore.read();
  assert.equal((await ctx.run()).synchronized, true);
  const sports = (await ctx.sportsStore.read()).data;
  const fixture = sports.journeys[0].fixtures[0];
  assert.deepEqual(
    ctx.calls.map((call) => call.endpoint),
    ['account', 'fixtures', 'fixture', 'scores'],
  );
  assert.equal(sports.quota.used, 3);
  assert.equal(sports.quota.operational, 200);
  assert.equal(sports.quota.hard, 250);
  assert.equal(fixture.oddsId, 'odds-1');
  assert.equal(fixture.status, 'finished');
  assert.equal(sports.journeys[0].officialResults[0].sign, '1');
  assert.equal(sports.journeys[0].officialResults[0].source, 'sporting');
  assert.equal(Object.values(sports.jobs).filter((job) => job.endpoint).length, 3);
  assert.equal(JSON.stringify(sports).includes('must-never-persist'), false);
  assert.deepEqual(await ctx.privateStore.read(), before);
  assert.equal(sports.journeys[0].predictions, undefined);
  assert.equal(sports.journeys[0].pleno.predictions, undefined);
});

test('estado en directo después de dos horas no liquida ni consulta scores hasta una nueva revisión', async () => {
  const ctx = setup({ statusId: 1 });
  await ctx.run();
  let sports = (await ctx.sportsStore.read()).data;
  const fixture = sports.journeys[0].fixtures[0];
  assert.deepEqual(sports.journeys[0].officialResults, []);
  assert.equal(sports.jobs[`score:${fixture.id}:after-0`].state, 'not-final');
  assert.equal(
    ctx.calls.some((call) => call.endpoint === 'scores'),
    false,
  );
  assert.equal(
    scoreTasks(sports, now + 10 * 60000).some((task) => task.fixture.id === fixture.id),
    false,
  );
  ctx.setTime(Date.parse(kickoff) + 3 * hour);
  ctx.setStatus(2);
  await ctx.run();
  sports = (await ctx.sportsStore.read()).data;
  assert.equal(ctx.calls.filter((call) => call.endpoint === 'fixture').length, 2);
  assert.equal(ctx.calls.filter((call) => call.endpoint === 'fixtures').length, 1);
  assert.equal(ctx.calls.filter((call) => call.endpoint === 'scores').length, 1);
  assert.equal(sports.journeys[0].officialResults[0].source, 'sporting');
  assert.equal(sports.quota.used, 4);
});

test('límite de cuenta protege la reserva y no inicia llamadas facturables sin margen', async () => {
  const ctx = setup({ limit: 50 });
  await ctx.run();
  const sports = (await ctx.sportsStore.read()).data;
  assert.deepEqual(
    ctx.calls.map((call) => call.endpoint),
    ['account'],
  );
  assert.equal(sports.quota.operational, 0);
  assert.equal(sports.quota.used, 0);
  assert.equal(sports.sync.odds.state, 'budget');
  assert.deepEqual(sports.journeys[0].officialResults, []);
});

test('apuestas privadas y corrección administrativa prevalecen tras otro ciclo deportivo', async () => {
  const original = privateCoupon();
  const id = original.journeys[0].id;
  const bets = {
    type: 'save-predictions',
    journeyId: id,
    participantId: seed.participants[0].id,
    signs: Array(14).fill('2'),
    pleno: { home: 'M', away: '1' },
  };
  const saved = privateUpdate(original, applyCommand(original, bets, now), bets);
  const ctx = setup({ privateData: saved });
  await ctx.run();
  const sports = (await ctx.sportsStore.read()).data;
  const command = {
    type: 'correct-results',
    journeyId: id,
    signs: ['X', ...Array(13).fill('')],
    pleno: { home: '', away: '' },
    note: 'Corrección administrativa de prueba.',
  };
  const changed = applyCommand(mergeSports(saved, sports, now), command, now);
  const corrected = privateUpdate(saved, changed, command);
  const privateBefore = await ctx.privateStore.read();
  await ctx.privateStore.write(corrected, privateBefore.etag);
  const correctedEntry = await ctx.privateStore.read();
  ctx.setTime(now + 60000);
  await ctx.run();
  const latestSports = (await ctx.sportsStore.read()).data;
  const merged = mergeSports(corrected, latestSports, now + 60000);
  assert.equal(latestSports.journeys[0].officialResults[0].sign, '1');
  assert.equal(merged.journeys[0].officialResults[0].sign, 'X');
  assert.equal(merged.journeys[0].officialResults[0].source, 'administrative');
  assert.deepEqual(merged.journeys[0].predictions, saved.journeys[0].predictions);
  assert.deepEqual(merged.journeys[0].pleno.predictions, saved.journeys[0].pleno.predictions);
  assert.deepEqual(await ctx.privateStore.read(), correctedEntry);
  assert.equal(latestSports.journeys[0].predictions, undefined);
  assert.equal(latestSports.journeys[0].resultOverrides, undefined);
  assert.equal(allFixtures(latestSports.journeys[0]).length, 15);
});
