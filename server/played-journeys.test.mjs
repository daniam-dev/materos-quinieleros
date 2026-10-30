import { test } from 'node:test';
import assert from 'node:assert/strict';
import seed from './seed.json' with { type: 'json' };
import { applyCommand, publicSeason } from './domain.mjs';
import { emptySports, mergeSports, privateUpdate } from './sports-data.mjs';
import { withParticipation } from './competitions.mjs';

const closesAt = '2026-11-01T12:00:00.000Z';
const beforeClose = Date.parse(closesAt) - 1;
const afterClose = Date.parse(closesAt) + 3600000;
const createCommand = () => ({
  type: 'create-played-journey',
  number: 22,
  drawDate: '2026-11-01',
  closesAt,
  confirmed: true,
  fixtures: Array.from({ length: 15 }, (_, index) => ({
    home: `Local ${index + 1}`,
    away: `Visitante ${index + 1}`,
    category: index === 14 ? 'women' : 'men',
    kickoff: index === 1 ? null : '2026-11-01T15:00:00.000Z',
    competitionName: index === 1 ? null : index === 14 ? 'Liga F' : 'LaLiga',
  })),
});

function create(snapshot = structuredClone(seed), command = createCommand()) {
  const changed = applyCommand(snapshot, command, beforeClose);
  return privateUpdate(snapshot, changed, command);
}

const latest = (snapshot) => snapshot.journeys.at(-1);
const correction = (id, signs = ['X', ...Array(13).fill('')]) => ({
  type: 'correct-results',
  journeyId: id,
  signs,
  pleno: { home: 'M', away: '2' },
  note: 'Corrección revisada por el administrador.',
});

function save(snapshot, command, now = afterClose, sports = null) {
  const visible = mergeSports(snapshot, sports, now);
  return privateUpdate(snapshot, applyCommand(visible, command, now), command);
}

function sportingCopy(journey, sign = '1') {
  return {
    ...structuredClone(journey),
    predictions: [],
    participantIds: [],
    officialResults: journey.fixtures.map((fixture) => ({
      fixtureId: fixture.id,
      sign,
      source: 'sporting',
      publishedAt: new Date(afterClose).toISOString(),
    })),
    pleno: {
      fixture: structuredClone(journey.pleno.fixture),
      predictions: [],
      official: { home: '1', away: '0', publishedAt: new Date(afterClose).toISOString() },
    },
  };
}

test('boleto jugado conserva los 15 cruces confirmados, categorías y ausencias explícitas', () => {
  const original = structuredClone(seed);
  const originalBefore = structuredClone(original);
  const snapshot = create(original);
  const journey = latest(snapshot);
  assert.deepEqual(original, originalBefore);
  assert.equal(journey.number, 22);
  assert.equal(journey.seasonId, '2026-27');
  assert.equal(journey.origin, 'admin');
  assert.equal(journey.resultPolicy, 'sporting');
  assert.equal(journey.closesAt, closesAt);
  assert.equal(journey.fixtures.length, 14);
  assert.equal(journey.fixtures[0].home, 'Local 1');
  assert.equal(journey.fixtures[1].kickoff, null);
  assert.equal(journey.fixtures[1].competitionName, null);
  assert.equal(journey.pleno.fixture.home, 'Local 15');
  assert.equal(journey.pleno.fixture.category, 'women');
  const ids = [...journey.fixtures, journey.pleno.fixture].map((fixture) => fixture.id);
  assert.equal(new Set(ids).size, 15);
  assert.ok(ids.every((id) => typeof id === 'string' && id.length > 0));
  assert.deepEqual(journey.predictions, []);
  assert.deepEqual(journey.officialResults, []);
  assert.deepEqual(journey.pleno.predictions, []);
  assert.deepEqual(snapshot.participants, seed.participants);
  assert.equal(snapshot.currentJourneyId, journey.id);
});

test('boleto jugado admite horarios desconocidos sin inventar fechas de partido', () => {
  const command = createCommand();
  command.fixtures = command.fixtures.map((fixture) => ({ ...fixture, kickoff: null }));
  const journey = latest(create(undefined, command));
  assert.ok(
    [...journey.fixtures, journey.pleno.fixture].every((fixture) => fixture.kickoff === null),
  );
  assert.equal(journey.closesAt, closesAt);
  assert.ok(Number.isFinite(Date.parse(journey.startsAt)));
  assert.ok(Number.isFinite(Date.parse(journey.endsAt)));
});

test('rechaza boletos incompletos, sin confirmación y categorías no identificadas', () => {
  for (const mutate of [
    (command) => {
      command.confirmed = false;
    },
    (command) => {
      delete command.confirmed;
    },
    (command) => {
      command.fixtures.pop();
    },
    (command) => {
      command.fixtures.push(command.fixtures[0]);
    },
    (command) => {
      command.fixtures[14] = structuredClone(command.fixtures[0]);
    },
    (command) => {
      command.fixtures[0].category = 'unknown';
    },
    (command) => {
      command.fixtures[14].category = 'unknown';
    },
    (command) => {
      command.fixtures[0].home = '';
    },
    (command) => {
      command.fixtures[0].away = command.fixtures[0].home;
    },
    (command) => {
      command.number = 0;
    },
  ]) {
    const command = createCommand();
    mutate(command);
    assert.throws(() => create(undefined, command), { status: 400 });
  }
});

test('no permite dos boletos con el mismo número en la misma temporada', () => {
  const original = create();
  const repeated = createCommand();
  repeated.drawDate = '2026-11-02';
  assert.throws(() => create(original, repeated), { status: 400 });
  assert.equal(original.journeys.length, 1);
  const otherSeason = createCommand();
  otherSeason.drawDate = '2025-11-01';
  otherSeason.closesAt = '2025-11-01T12:00:00.000Z';
  otherSeason.fixtures = otherSeason.fixtures.map((fixture) => ({ ...fixture, kickoff: null }));
  const both = create(original, otherSeason);
  assert.equal(both.journeys.length, 2);
  assert.equal(latest(both).seasonId, '2025-26');
});

test('valida fecha real, ventana del sorteo, zona horaria y cierre anterior a los inicios conocidos', () => {
  for (const mutate of [
    (command) => {
      command.drawDate = '2026-02-30';
    },
    (command) => {
      command.drawDate = '2026-99-01';
    },
    (command) => {
      command.drawDate = '01/11/2026';
    },
    (command) => {
      command.closesAt = '2026-11-01T12:00:00';
    },
    (command) => {
      command.fixtures[0].kickoff = '2026-11-01T11:59:59.000Z';
    },
    (command) => {
      command.fixtures[14].kickoff = '2026-11-05T15:00:00.000Z';
    },
    (command) => {
      command.fixtures[0].kickoff = '2026-10-28T15:00:00.000Z';
    },
  ]) {
    const command = createCommand();
    mutate(command);
    assert.throws(() => create(undefined, command), { status: 400 });
  }
});

test('el cierre es inclusivo para corregir y nunca publica correcciones antes de cerrar', () => {
  const snapshot = create();
  const journey = latest(snapshot);
  const command = correction(journey.id);
  assert.throws(() => save(snapshot, command, beforeClose), { status: 400 });
  const corrected = save(snapshot, command, Date.parse(closesAt));
  const visible = mergeSports(corrected, null, Date.parse(closesAt));
  const official = latest(visible).officialResults.find(
    (result) => result.fixtureId === journey.fixtures[0].id,
  );
  assert.equal(official.sign, 'X');
  assert.equal(official.source, 'administrative');
  assert.equal(official.note, command.note);
  assert.deepEqual(publicSeason(visible, beforeClose).journeys[0].officialResults, []);
});

test('rechaza correcciones incompletas, signos ajenos y pares parciales del Pleno', () => {
  const snapshot = create();
  for (const mutate of [
    (command) => {
      command.journeyId = 'missing';
    },
    (command) => {
      command.signs.pop();
    },
    (command) => {
      command.signs[0] = '1X';
    },
    (command) => {
      command.signs[0] = '3';
    },
    (command) => {
      command.pleno.home = '';
    },
    (command) => {
      command.pleno.away = '3';
    },
    (command) => {
      command.note = {};
    },
  ]) {
    const command = correction(latest(snapshot).id);
    mutate(command);
    assert.throws(() => save(snapshot, command), { status: 400 });
  }
});

test('las correcciones prevalecen sobre resultados deportivos nuevos sin perder apuestas ni identidades', () => {
  const created = create();
  const journey = latest(created);
  const bets = {
    type: 'save-predictions',
    journeyId: journey.id,
    participantId: seed.participants[0].id,
    signs: ['1X', ...Array(13).fill('1')],
    pleno: { home: 'M', away: '0' },
  };
  const privateBets = save(created, bets, beforeClose);
  const sports = { ...emptySports(), journeys: [sportingCopy(journey)] };
  const corrected = save(privateBets, correction(journey.id), afterClose, sports);
  const snapshotBeforeWorker = structuredClone(corrected);
  const updatedSports = { ...emptySports(), journeys: [sportingCopy(journey, '2')] };
  const merged = mergeSports(corrected, updatedSports, afterClose + 1000);
  const updated = latest(merged);
  assert.deepEqual(corrected, snapshotBeforeWorker);
  assert.equal(updated.officialResults[0].sign, 'X');
  assert.equal(updated.officialResults[0].source, 'administrative');
  assert.equal(updated.officialResults[1].sign, '2');
  assert.equal(updated.officialResults[1].source, 'sporting');
  assert.equal(updated.pleno.official.home, 'M');
  assert.equal(updated.pleno.official.away, '2');
  assert.deepEqual(updated.predictions, latest(privateBets).predictions);
  assert.deepEqual(updated.pleno.predictions, latest(privateBets).pleno.predictions);
  assert.deepEqual(
    updated.fixtures.map((fixture) => fixture.id),
    journey.fixtures.map((fixture) => fixture.id),
  );
  assert.equal(updated.pleno.fixture.id, journey.pleno.fixture.id);
});

test('vaciar una corrección restaura el resultado deportivo más reciente, incluido el Pleno', () => {
  const created = create();
  const journey = latest(created);
  const sports = { ...emptySports(), journeys: [sportingCopy(journey)] };
  const corrected = save(created, correction(journey.id), afterClose, sports);
  const latestSports = { ...emptySports(), journeys: [sportingCopy(journey, '2')] };
  const clear = correction(journey.id, Array(14).fill(''));
  clear.pleno = { home: '', away: '' };
  const cleared = save(corrected, clear, afterClose + 1000, latestSports);
  const merged = latest(mergeSports(cleared, latestSports, afterClose + 1000));
  assert.ok(
    merged.officialResults.every((result) => result.sign === '2' && result.source === 'sporting'),
  );
  assert.equal(merged.pleno.official.home, '1');
  assert.equal(merged.pleno.official.away, '0');
  assert.ok(merged.officialResults.every((result) => result.note === undefined));
  assert.deepEqual(merged.predictions, []);
});

test('los registros privados de corrección no se filtran en la temporada pública', () => {
  const created = create();
  const journey = latest(created);
  const corrected = save(created, correction(journey.id));
  const visible = publicSeason(mergeSports(corrected, null, afterClose), afterClose);
  assert.equal(Object.hasOwn(visible, 'resultOverrides'), false);
  assert.ok(visible.journeys.every((entry) => !Object.hasOwn(entry, 'resultOverrides')));
  // The applied result is public, while the administrative control structure is not.
  assert.equal(latest(visible).officialResults[0].sign, 'X');
  assert.equal(latest(visible).officialResults[0].source, 'administrative');
});

test('una corrección manual se aplica aunque el worker todavía no tenga la jornada', () => {
  const created = create();
  const corrected = save(created, correction(latest(created).id));
  const merged = mergeSports(corrected, emptySports(), afterClose);
  assert.equal(latest(merged).officialResults[0].sign, 'X');
  assert.equal(latest(merged).officialResults[0].source, 'administrative');
  assert.equal(latest(merged).pleno.official.home, 'M');
  assert.equal(latest(merged).pleno.official.away, '2');
});

test('el boleto elegido por el administrador admite apuestas aunque el filtro anterior excluya todas las competiciones', () => {
  const original = {
    ...structuredClone(seed),
    competitionSettings: { enabled: true, enabledIds: [] },
  };
  const command = createCommand();
  command.fixtures = command.fixtures.map((fixture) => ({
    ...fixture,
    category: 'men',
    competitionName: 'LaLiga',
  }));
  const created = create(original, command);
  const chosen = latest(withParticipation(created));
  assert.equal(chosen.participation.state, 'enabled');
  // The same classified coupon from an automatic source remains excluded by the filter.
  const imported = structuredClone(created);
  imported.journeys[0].origin = 'provider';
  imported.journeys[0].resultPolicy = 'selae';
  assert.equal(latest(withParticipation(imported)).participation.state, 'excluded');
  const bets = {
    type: 'save-predictions',
    journeyId: chosen.id,
    participantId: seed.participants[0].id,
    signs: ['1X', ...Array(13).fill('1')],
    pleno: { home: 'M', away: '2' },
  };
  const saved = save(created, bets, beforeClose);
  assert.equal(latest(saved).predictions.length, 14);
  assert.equal(latest(saved).pleno.predictions.length, 1);
  assert.equal(latest(withParticipation(saved)).participation.state, 'enabled');
  const publicBeforeClose = publicSeason(withParticipation(saved), beforeClose);
  assert.equal(publicBeforeClose.journeys.length, 1);
  assert.deepEqual(latest(publicBeforeClose).predictions, []);
  assert.deepEqual(latest(publicBeforeClose).pleno.predictions, []);
});
