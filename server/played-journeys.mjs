import { randomUUID } from 'node:crypto';
import { ApiError } from './domain.mjs';

const requireValue = (condition, message) => {
  if (!condition) throw new ApiError(400, message);
};
const name = (value) => {
  requireValue(
    typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 80,
    'Revisa los nombres de los equipos.',
  );
  return value.trim();
};
const zonedDate = (value) =>
  typeof value === 'string' &&
  /(?:Z|[+-]\d\d:\d\d)$/.test(value) &&
  Number.isFinite(Date.parse(value));
const days = 86400000;

export function applyPlayedCommand(snapshot, command, now) {
  if (command.type === 'create-played-journey') {
    requireValue(command.confirmed === true, 'Confirma que has revisado los 15 encuentros.');
    requireValue(
      Number.isSafeInteger(command.number) && command.number > 0 && command.number <= 999,
      'Introduce un número de jornada entre 1 y 999.',
    );
    requireValue(
      typeof command.drawDate === 'string' &&
        /^20\d\d-\d\d-\d\d$/.test(command.drawDate) &&
        Number.isFinite(Date.parse(`${command.drawDate}T12:00:00Z`)) &&
        new Date(`${command.drawDate}T12:00:00Z`).toISOString().slice(0, 10) === command.drawDate,
      'Introduce una fecha de jornada válida.',
    );
    const firstYear =
      Number(command.drawDate.slice(0, 4)) - (Number(command.drawDate.slice(5, 7)) < 7 ? 1 : 0);
    const seasonId = `${firstYear}-${String(firstYear + 1).slice(-2)}`;
    requireValue(
      !snapshot.journeys.some((j) => j.seasonId === seasonId && j.number === command.number),
      'Esta jornada ya existe en la temporada.',
    );
    requireValue(
      zonedDate(command.closesAt),
      'Introduce la fecha y hora de cierre con zona horaria.',
    );
    requireValue(
      Array.isArray(command.fixtures) && command.fixtures.length === 15,
      'Introduce los 14 encuentros y el Pleno al 15.',
    );
    const id = randomUUID();
    const anchor = Date.parse(`${command.drawDate}T12:00:00Z`);
    requireValue(
      Math.abs(Date.parse(command.closesAt) - anchor) <= 4 * days,
      'El cierre debe pertenecer a la semana de la jornada.',
    );
    const pairs = new Set();
    const fixtures = command.fixtures.map((f, i) => {
      requireValue(f && typeof f === 'object', 'Encuentro no válido.');
      const home = name(f.home),
        away = name(f.away);
      requireValue(
        home.toLocaleLowerCase('es') !== away.toLocaleLowerCase('es'),
        'Los equipos deben ser distintos.',
      );
      requireValue(
        ['men', 'women'].includes(f.category),
        'Indica masculino o femenino en cada encuentro.',
      );
      const pair = JSON.stringify([
        home.toLocaleLowerCase('es'),
        away.toLocaleLowerCase('es'),
        f.category,
      ]);
      requireValue(!pairs.has(pair), 'No repitas un encuentro en el boleto.');
      pairs.add(pair);
      const kickoff = f.kickoff == null || f.kickoff === '' ? null : f.kickoff;
      requireValue(
        kickoff === null ||
          (zonedDate(kickoff) && Math.abs(Date.parse(kickoff) - anchor) <= 3.5 * days),
        'Revisa los horarios: deben pertenecer a la semana de la jornada.',
      );
      requireValue(
        kickoff === null || Date.parse(command.closesAt) <= Date.parse(kickoff),
        'El cierre debe ser anterior al primer partido.',
      );
      requireValue(
        f.competitionName == null ||
          (typeof f.competitionName === 'string' && f.competitionName.length <= 80),
        'Competición no válida.',
      );
      return {
        id: `${id}-${i + 1}`,
        number: i + 1,
        home,
        away,
        category: f.category,
        kickoff: kickoff && new Date(kickoff).toISOString(),
        competitionName: f.competitionName?.trim() || null,
        status: 'scheduled',
      };
    });
    const times = fixtures.filter((f) => f.kickoff).map((f) => Date.parse(f.kickoff));
    snapshot.journeys.push({
      id,
      origin: 'admin',
      resultPolicy: 'sporting',
      drawDate: command.drawDate,
      seasonId,
      number: command.number,
      competition: 'mixed',
      startsAt: new Date(
        times.length ? Math.min(...times) : Date.parse(command.closesAt),
      ).toISOString(),
      endsAt: new Date(times.length ? Math.max(...times) : anchor + 3 * days).toISOString(),
      closesAt: new Date(command.closesAt).toISOString(),
      participantIds: [],
      fixtures: fixtures.slice(0, 14),
      predictions: [],
      officialResults: [],
      pleno: { fixture: fixtures[14], predictions: [] },
      importedAt: new Date(now).toISOString(),
    });
    if (snapshot.currentJourneyId === null) snapshot.currentJourneyId = id;
    return true;
  }
  if (command.type === 'correct-results') {
    const journey = snapshot.journeys.find((j) => j.id === command.journeyId);
    requireValue(journey?.resultPolicy === 'sporting', 'Selecciona una jornada deportiva.');
    requireValue(
      Date.parse(journey.closesAt) <= now,
      'Solo puedes corregir resultados después del cierre.',
    );
    requireValue(
      Array.isArray(command.signs) &&
        command.signs.length === 14 &&
        command.signs.every((s) => ['', '1', 'X', '2'].includes(s)),
      'Introduce 14 signos válidos o deja en blanco para usar OddsPapi.',
    );
    requireValue(
      typeof command.note === 'string' &&
        command.note.trim().length >= 5 &&
        command.note.length <= 240,
      'Explica la corrección (entre 5 y 240 caracteres).',
    );
    requireValue(
      command.pleno &&
        ['', '0', '1', '2', 'M'].includes(command.pleno.home) &&
        ['', '0', '1', '2', 'M'].includes(command.pleno.away) &&
        !!command.pleno.home === !!command.pleno.away,
      'Completa ambos goles del Pleno o deja ambos en blanco.',
    );
    journey.resultOverrides = {
      results: command.signs.flatMap((sign, i) =>
        sign
          ? [
              {
                fixtureId: journey.fixtures[i].id,
                sign,
                source: 'administrative',
                publishedAt: new Date(now).toISOString(),
                note: command.note.trim(),
              },
            ]
          : [],
      ),
      ...(command.pleno.home
        ? {
            pleno: {
              home: command.pleno.home,
              away: command.pleno.away,
              publishedAt: new Date(now).toISOString(),
            },
          }
        : {}),
    };
    return true;
  }
  return false;
}

export function withResultOverrides(journey, overrides = journey.resultOverrides) {
  if (!overrides) return journey;
  const results = new Map(journey.officialResults.map((r) => [r.fixtureId, r]));
  for (const result of overrides.results) results.set(result.fixtureId, result);
  return {
    ...journey,
    resultOverrides: overrides,
    officialResults: [...results.values()],
    pleno: { ...journey.pleno, ...(overrides.pleno ? { official: overrides.pleno } : {}) },
  };
}
