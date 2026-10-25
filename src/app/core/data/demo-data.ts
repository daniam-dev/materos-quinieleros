import { Fixture, Journey, Participant, SeasonSnapshot, Sign } from '../../domain/models';

const participants: readonly Participant[] = [
  { id: 'dani', name: 'Dani', initials: 'DA', active: true },
  { id: 'pablo', name: 'Pablo', initials: 'PA', active: true },
  { id: 'lucia', name: 'Lucía', initials: 'LU', active: true },
  { id: 'marcos', name: 'Marcos', initials: 'MA', active: true },
  { id: 'sara', name: 'Sara', initials: 'SA', active: true },
  { id: 'javi', name: 'Javi', initials: 'JA', active: true },
  { id: 'carmen', name: 'Carmen', initials: 'CA', active: true },
  { id: 'alex', name: 'Álex', initials: 'ÁL', active: true },
  { id: 'nico', name: 'Nico', initials: 'NI', active: false },
];
const teams = [
  ['Athletic Club', 'R. Sociedad'],
  ['Real Madrid', 'Villarreal'],
  ['Barcelona', 'Sevilla'],
  ['Atlético', 'Valencia'],
  ['Betis', 'Osasuna'],
  ['Celta', 'Getafe'],
  ['Espanyol', 'Mallorca'],
  ['Alavés', 'Girona'],
  ['Rayo Vallecano', 'Levante'],
  ['Elche', 'Oviedo'],
  ['Deportivo', 'Zaragoza'],
  ['Málaga', 'Cádiz'],
  ['Granada', 'Almería'],
  ['Sporting', 'Racing'],
] as const;
const signs: readonly Sign[] = [
  '1',
  '1',
  'X',
  '1',
  '2',
  'X',
  '1',
  'X',
  '2',
  '1',
  'X',
  '2',
  '1',
  'X',
];
const scores = [
  { home: 2, away: 0 },
  { home: 3, away: 1 },
  { home: 1, away: 1 },
  { home: 2, away: 1 },
  { home: 0, away: 1 },
  { home: 0, away: 0 },
  { home: 1, away: 0 },
];
const targets = [6, 5, 7, 4, 5, 3, 4, 2, 3];
function makeJourney(number: number, kind: 'partial' | 'open' | 'complete' | 'closed'): Journey {
  const id = `j${number}`;
  const date =
    kind === 'open'
      ? '2026-10-31'
      : kind === 'closed'
        ? '2026-10-11'
        : kind === 'complete'
          ? '2026-10-18'
          : '2026-10-24';
  const count = kind === 'complete' ? 14 : kind === 'partial' ? 8 : 0;
  const offset = kind === 'open' ? '+01:00' : '+02:00';
  const registered =
    kind === 'open' || kind === 'closed'
      ? participants.filter((p) => p.active)
      : kind === 'complete'
        ? participants.filter((p) => p.id !== 'alex')
        : participants;
  const fixtures: Fixture[] = teams.map(([home, away], index) => ({
    id: `${id}-${index + 1}`,
    number: index + 1,
    home,
    away,
    kickoff:
      kind === 'partial' && index >= 8
        ? `2026-10-25T${index === 8 ? '15:57' : '18:30'}:00+01:00`
        : `${date}T${index < 8 ? '16' : '18'}:30:00${kind === 'open' ? '+01:00' : '+02:00'}`,
    status:
      index === 7 && count > 0
        ? 'postponed'
        : index < count || kind === 'closed'
          ? 'finished'
          : kind === 'partial' && index === 8
            ? 'live'
            : 'scheduled',
    ...(index < Math.min(count, 7)
      ? { score: scores[index] }
      : index < count && index !== 7
        ? {
            score:
              signs[index] === '1'
                ? { home: 2, away: 0 }
                : signs[index] === '2'
                  ? { home: 0, away: 1 }
                  : { home: 1, away: 1 },
          }
        : {}),
    ...(kind === 'partial' && index === 8 ? { score: { home: 1, away: 0 }, minute: 63 } : {}),
  }));
  const closesAt = kind === 'open' ? '2026-10-31T14:00:00+01:00' : `${date}T14:00:00+02:00`;
  return {
    id,
    number,
    seasonId: '2026-27',
    startsAt: `${date}T16:30:00${offset}`,
    endsAt: kind === 'partial' ? '2026-10-25T23:00:00+01:00' : `${date}T23:00:00${offset}`,
    closesAt,
    participantIds: registered.map((p) => p.id),
    fixtures,
    predictions: registered.flatMap((participant) => {
      const person = participants.findIndex((p) => p.id === participant.id);
      return fixtures
        .filter((f) => !(participant.id === 'nico' && f.number === 8))
        .map((fixture) => {
          const index = fixture.number - 1;
          return {
            participantId: participant.id,
            fixtureId: fixture.id,
            sign:
              (index < 8 && (index + person * 3) % 8 < (targets[person] ?? 0)) ||
              (index >= 8 && (index + person) % 3 === 0)
                ? signs[index]
                : (['1', 'X', '2'] as const)[
                    ((['1', 'X', '2'] as const).indexOf(signs[index]) + 1 + (person % 2)) % 3
                  ],
          };
        });
    }),
    officialResults: fixtures.slice(0, count).map((fixture, index) => ({
      fixtureId: fixture.id,
      sign: signs[index],
      source: index === 7 ? 'administrative' : 'sporting',
      publishedAt: kind === 'complete' ? '2026-10-18T22:00:00+02:00' : '2026-10-25T15:00:00+01:00',
      ...(index === 7
        ? { note: 'Encuentro aplazado. X de liquidación; no representa un empate deportivo.' }
        : {}),
    })),
    pleno: {
      fixture: {
        id: `${id}-15`,
        number: 15,
        home: 'Las Palmas',
        away: 'Tenerife',
        kickoff: kind === 'partial' ? '2026-10-25T21:00:00+01:00' : `${date}T19:00:00${offset}`,
        status: kind === 'complete' || kind === 'closed' ? 'finished' : 'scheduled',
        ...(kind === 'complete' ? { score: { home: 3, away: 1 } } : {}),
      },
      predictions: registered.map((p, index) => ({
        participantId: p.id,
        home: index % 3 === 0 ? 'M' : '2',
        away: index % 2 === 0 ? '1' : '0',
      })),
      ...(kind === 'complete'
        ? {
            official: {
              home: 'M' as const,
              away: '1' as const,
              publishedAt: '2026-10-18T23:00:00+02:00',
            },
          }
        : {}),
    },
  };
}

export const DEMO_SNAPSHOT: SeasonSnapshot = {
  season: { id: '2026-27', label: '2026 / 27' },
  participants,
  journeys: [
    makeJourney(13, 'open'),
    makeJourney(12, 'partial'),
    makeJourney(11, 'complete'),
    makeJourney(10, 'closed'),
  ],
  asOf: '2026-10-25T17:00:00+01:00',
};
