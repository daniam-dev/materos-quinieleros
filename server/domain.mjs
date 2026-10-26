import { randomUUID } from 'node:crypto';
import { adminId } from './auth.mjs';

export class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
function requireValue(condition, message) {
  if (!condition) throw new ApiError(400, message);
}
function text(value, label, max = 80) {
  requireValue(
    typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max,
    `${label}: introduce entre 1 y ${max} caracteres.`,
  );
  return value.trim();
}
function date(value, label) {
  requireValue(
    typeof value === 'string' &&
      /(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
      Number.isFinite(Date.parse(value)),
    `${label}: fecha y zona horaria obligatorias.`,
  );
  return new Date(value).toISOString();
}

export function publicSeason(snapshot, now) {
  const asOf = new Date(now).toISOString();
  return {
    ...snapshot,
    asOf,
    journeys: snapshot.journeys.map((journey) => {
      const published = Date.parse(journey.closesAt) <= now;
      const { official, ...pleno } = journey.pleno;
      return {
        ...journey,
        predictions: published ? journey.predictions : [],
        officialResults: published
          ? journey.officialResults.filter((r) => Date.parse(r.publishedAt) <= now)
          : [],
        pleno: {
          ...pleno,
          predictions: published ? pleno.predictions : [],
          ...(published && official && Date.parse(official.publishedAt) <= now ? { official } : {}),
        },
      };
    }),
  };
}

export function applyCommand(original, command) {
  requireValue(command && typeof command === 'object', 'Operación no válida.');
  const snapshot = structuredClone(original);
  delete snapshot.asOf;
  switch (command.type) {
    case 'add-participant': {
      const name = text(command.name, 'Nombre');
      const surname = text(command.surname, 'Apellidos');
      requireValue(
        !snapshot.participants.some(
          (p) =>
            `${p.name} ${p.surname}`.toLocaleLowerCase('es') ===
            `${name} ${surname}`.toLocaleLowerCase('es'),
        ),
        'Esta persona ya está en el grupo.',
      );
      snapshot.participants.push({
        id: randomUUID(),
        name,
        surname,
        initials: `${[...name][0]}${[...surname][0]}`.toLocaleUpperCase('es'),
        active: true,
        role: 'participant',
      });
      break;
    }
    case 'set-active': {
      const participant = snapshot.participants.find((p) => p.id === command.participantId);
      requireValue(
        participant && participant.id !== adminId && participant.role !== 'admin',
        'No puedes quitar al administrador del grupo.',
      );
      requireValue(typeof command.active === 'boolean', 'Estado de participante no válido.');
      participant.active = command.active;
      break;
    }
    case 'create-journey': {
      requireValue(
        Number.isSafeInteger(command.number) && command.number > 0 && command.number <= 999,
        'Introduce un número de jornada entre 1 y 999.',
      );
      requireValue(['league', 'europe'].includes(command.competition), 'Selecciona Liga o Europa.');
      requireValue(
        !snapshot.journeys.some(
          (j) => j.number === command.number && j.competition === command.competition,
        ),
        'Esta jornada ya existe para esa competición.',
      );
      const closesAt = date(command.closesAt, 'Cierre');
      requireValue(
        Array.isArray(command.fixtures) && command.fixtures.length === 15,
        'Introduce los 14 encuentros y el Pleno al 15.',
      );
      const id = randomUUID();
      const fixtures = command.fixtures.map((f, i) => {
        requireValue(f && typeof f === 'object', 'Encuentro no válido.');
        const home = text(f.home, `Local del encuentro ${i + 1}`);
        const away = text(f.away, `Visitante del encuentro ${i + 1}`);
        requireValue(
          home.toLocaleLowerCase('es') !== away.toLocaleLowerCase('es'),
          'Los equipos deben ser distintos.',
        );
        const kickoff = date(f.kickoff, `Fecha del encuentro ${i + 1}`);
        requireValue(
          Date.parse(closesAt) <= Date.parse(kickoff),
          'El cierre debe ser anterior al primer partido.',
        );
        return { id: `${id}-${i + 1}`, number: i + 1, home, away, kickoff, status: 'scheduled' };
      });
      const dates = fixtures.map((f) => Date.parse(f.kickoff));
      snapshot.journeys.push({
        id,
        seasonId: snapshot.season.id,
        number: command.number,
        competition: command.competition,
        closesAt,
        startsAt: new Date(Math.min(...dates)).toISOString(),
        endsAt: new Date(Math.max(...dates)).toISOString(),
        participantIds: [],
        fixtures: fixtures.slice(0, 14),
        predictions: [],
        officialResults: [],
        pleno: { fixture: fixtures[14], predictions: [] },
      });
      if (snapshot.currentJourneyId === null) snapshot.currentJourneyId = id;
      break;
    }
    case 'set-current': {
      requireValue(
        command.journeyId === null || snapshot.journeys.some((j) => j.id === command.journeyId),
        'Jornada no encontrada.',
      );
      snapshot.currentJourneyId = command.journeyId;
      break;
    }
    case 'save-predictions': {
      const journey = snapshot.journeys.find((j) => j.id === command.journeyId);
      requireValue(journey, 'Jornada no encontrada.');
      const participant = snapshot.participants.find((p) => p.id === command.participantId);
      requireValue(
        participant && (participant.active || journey.participantIds.includes(participant.id)),
        'Selecciona un participante activo.',
      );
      requireValue(
        Array.isArray(command.signs) &&
          command.signs.length === 14 &&
          command.signs.every((s) => ['1', 'X', '2'].includes(s)),
        'Completa los 14 signos: 1, X o 2.',
      );
      requireValue(
        command.pleno &&
          ['0', '1', '2', 'M'].includes(command.pleno.home) &&
          ['0', '1', '2', 'M'].includes(command.pleno.away),
        'Completa el Pleno: 0, 1, 2 o M.',
      );
      journey.predictions = journey.predictions.filter((p) => p.participantId !== participant.id);
      journey.predictions.push(
        ...journey.fixtures.map((fixture, i) => ({
          fixtureId: fixture.id,
          participantId: participant.id,
          sign: command.signs[i],
        })),
      );
      journey.pleno.predictions = journey.pleno.predictions.filter(
        (p) => p.participantId !== participant.id,
      );
      journey.pleno.predictions.push({
        participantId: participant.id,
        home: command.pleno.home,
        away: command.pleno.away,
      });
      if (!journey.participantIds.includes(participant.id))
        journey.participantIds.push(participant.id);
      break;
    }
    default:
      throw new ApiError(400, 'Operación desconocida.');
  }
  return snapshot;
}
