const base = 'https://www.loteriasyapuestas.es/servicios/';
const formatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Madrid',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});
const fail = () => {
  throw new Error('SELAE: formato o identidad no válidos. Se conserva la copia guardada.');
};

export function madridTime(value) {
  if (typeof value !== 'string') return fail();
  if (/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    if (!Number.isFinite(Date.parse(value))) return fail();
    return new Date(value).toISOString();
  }
  const local = value.replace('T', ' ');
  if (!/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(local)) return fail();
  // Test both Madrid offsets; reject non-existent and ambiguous DST wall times.
  const candidates = [1, 2]
    .map((hours) => Date.parse(local.replace(' ', 'T') + 'Z') - hours * 3600000)
    .filter((time) => Number.isFinite(time) && formatter.format(time) === local);
  if (candidates.length !== 1) return fail();
  return new Date(candidates[0]).toISOString();
}
export function drawRows(data) {
  const rows = Array.isArray(data) ? data : data?.id_sorteo ? [data] : data?.sorteos;
  if (!Array.isArray(rows) || rows.length > 100) return fail();
  return rows;
}
// The v3 listing publishes `fecha` and journey, but no season. Its published
// draw date determines the July-to-June season, as in SELAE's betting-page adapter.
export function normalizeListing(row) {
  const fecha = row.fecha_sorteo ?? row.fecha;
  if (typeof fecha !== 'string' || !/^20\d\d-\d\d-\d\d /.test(fecha)) return fail();
  madridTime(fecha);
  const year = Number(fecha.slice(0, 4)) - (Number(fecha.slice(5, 7)) < 7 ? 1 : 0);
  const normalized = {
    ...row,
    fecha_sorteo: fecha,
    temporada: row.temporada ?? `${year}-${year + 1}`,
  };
  drawIdentity(normalized);
  return normalized;
}
export function drawIdentity(row) {
  if (
    row?.game_id !== 'LAQU' ||
    !/^\d+$/.test(String(row.id_sorteo)) ||
    !/^20\d\d[-/]20\d\d$/.test(row.temporada) ||
    !Number.isSafeInteger(Number(row.jornada)) ||
    Number(row.jornada) < 1 ||
    !/^\d{4}-\d{2}-\d{2}/.test(row.fecha_sorteo)
  )
    return fail();
  const years = row.temporada.split(/[-/]/).map(Number);
  if (years[1] !== years[0] + 1) return fail();
  return {
    drawId: String(row.id_sorteo),
    season: years.join('-'),
    number: Number(row.jornada),
    drawDate: row.fecha_sorteo.slice(0, 10),
    ...(row.cierre ? { salesCloseAt: madridTime(row.cierre) } : {}),
  };
}
const identityKeys = ['drawId', 'season', 'number', 'drawDate'];
const teamName = (value) => (typeof value === 'string' ? value.trim().toLocaleLowerCase('es') : '');

export function normalizeDetail(row, expected) {
  // ID, game and date must be present on the detail itself, never borrowed.
  if (
    row?.game_id !== 'LAQU' ||
    String(row.id_sorteo) !== expected.drawId ||
    typeof row.fecha_sorteo !== 'string' ||
    row.fecha_sorteo.slice(0, 10) !== expected.drawDate
  )
    return fail();
  const result = {
    ...row,
    temporada: row.temporada ?? expected.season,
    jornada: row.jornada ?? expected.number,
    ...(expected.salesCloseAt && !row.cierre ? { cierre: expected.salesCloseAt } : {}),
  };
  const actual = drawIdentity(result);
  if (identityKeys.some((key) => actual[key] !== expected[key])) return fail();
  if (!Array.isArray(row.partidos) || row.partidos.length !== 15) return fail();
  // Compact v3 responses omit positions: their array is the official coupon order.
  // Do not repair a partially numbered response, which could hide a malformed slip.
  const numbered = row.partidos.filter((p) => p.posicion !== undefined).length;
  if (numbered !== 0 && numbered !== 15) return fail();
  result.partidos = row.partidos.map((p, i) => ({
    ...p,
    posicion: numbered ? p.posicion : i + 1,
    fecha_completa:
      p.fecha_completa ??
      (typeof p.fecha === 'string' && /^20\d\d/.test(p.fecha)
        ? p.fecha.replaceAll('\\', '').replaceAll('/', '-')
        : null),
  }));
  return result;
}

export function enrichSchedule(primary, calendar, expected) {
  const detail = normalizeDetail(calendar, expected);
  const ordered = [...detail.partidos].sort((a, b) => Number(a.posicion) - Number(b.posicion));
  const own = [...primary.partidos].sort((a, b) => Number(a.posicion) - Number(b.posicion));
  if (
    own.some(
      (p, i) =>
        Number(ordered[i].posicion) !== i + 1 ||
        teamName(p.local) !== teamName(ordered[i].local) ||
        teamName(p.visitante) !== teamName(ordered[i].visitante),
    )
  )
    return fail();
  return {
    ...primary,
    partidos: own.map((p, i) => ({
      ...p,
      fecha_completa: p.fecha_completa ?? ordered[i].fecha_completa,
    })),
  };
}
export function parseDraw(row, expected, capturedAt) {
  const identity = drawIdentity(row);
  if (
    expected &&
    identityKeys.some((k) => expected[k] !== undefined && expected[k] !== identity[k])
  )
    return fail();
  if (!Array.isArray(row.partidos) || row.partidos.length !== 15) return fail();
  const id = `selae-${identity.drawId}`;
  const officialResults = [];
  let plenoOfficial;
  const fixtures = [...row.partidos]
    .sort((a, b) => Number(a.posicion) - Number(b.posicion))
    .map((p, i) => {
      if (
        Number(p.posicion) !== i + 1 ||
        !p.local?.trim() ||
        !p.visitante?.trim() ||
        p.local === p.visitante
      )
        return fail();
      const homeCategory = /\(([mf])\)\s*$/i.exec(p.local)?.[1]?.toLowerCase();
      const awayCategory = /\(([mf])\)\s*$/i.exec(p.visitante)?.[1]?.toLowerCase();
      if (homeCategory !== awayCategory) return fail();
      const fixture = {
        id: `${id}-${i + 1}`,
        number: i + 1,
        home: p.local.trim(),
        away: p.visitante.trim(),
        kickoff: p.fecha_completa ? madridTime(p.fecha_completa) : null,
        status: 'scheduled',
        category: homeCategory === 'f' ? 'women' : homeCategory === 'm' ? 'men' : 'unknown',
        competitionName: null,
        sourceIdentity: `${teamName(p.local)}:${teamName(p.visitante)}:${homeCategory ?? '?'}`,
      };
      const sign = String(p.signo ?? '')
        .trim()
        .toUpperCase();
      const score = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(p.marcador ?? '');
      if (score) {
        fixture.score = { home: Number(score[1]), away: Number(score[2]) };
        fixture.scoreSource = 'SELAE';
        fixture.scoreUpdatedAt = capturedAt;
        fixture.scoreScope = 'coupon';
      }
      if (i < 14 && /^[1X2]$/.test(sign)) {
        const sportingSign = score
          ? Number(score[1]) > Number(score[2])
            ? '1'
            : Number(score[1]) < Number(score[2])
              ? '2'
              : 'X'
          : null;
        officialResults.push({
          fixtureId: fixture.id,
          sign,
          source: 'selae',
          publishedAt: capturedAt,
          ...(sportingSign !== sign
            ? { note: 'Signo SELAE; marcador no equivalente o no disponible.' }
            : {}),
        });
      } else if (i === 14 && /^[012M]-[012M]$/.test(sign)) {
        plenoOfficial = { home: sign[0], away: sign[2], publishedAt: capturedAt };
      } else if (sign && sign !== '-') return fail();
      return fixture;
    });
  const times = fixtures
    .map((f) => f.kickoff)
    .filter(Boolean)
    .map(Date.parse);
  const draw = madridTime(`${identity.drawDate} 00:00:00`);
  return {
    id,
    officialId: identity.drawId,
    source: identity,
    seasonId: `${identity.season.slice(0, 4)}-${identity.season.slice(-2)}`,
    number: identity.number,
    competition: 'mixed',
    startsAt: times.length ? new Date(Math.min(...times)).toISOString() : draw,
    endsAt: times.length ? new Date(Math.max(...times)).toISOString() : draw,
    salesCloseAt: identity.salesCloseAt ?? null,
    closesAt: identity.salesCloseAt
      ? new Date(Math.min(Date.parse(identity.salesCloseAt), ...times)).toISOString()
      : times.length === 15
        ? new Date(Math.min(...times)).toISOString()
        : null,
    participantIds: [],
    fixtures: fixtures.slice(0, 14),
    officialResults,
    pleno: { fixture: fixtures[14], ...(plenoOfficial ? { official: plenoOfficial } : {}) },
    importedAt: capturedAt,
    syncStatus: 'ok',
  };
}
export function selaeProvider(fetcher = fetch) {
  async function get(service, params) {
    const url = new URL(service, base);
    url.search = new URLSearchParams({ game_id: 'LAQU', ...params });
    const response = await fetcher(url, {
      redirect: 'error',
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error('SELAE no disponible. Se conserva la copia guardada.');
    return drawRows(await response.json());
  }
  return {
    discover: async () => (await get('proximosv3', { num: '3' })).map(normalizeListing),
    async recent(day) {
      const rows = await get('fechav3', { fecha_sorteo: day.replaceAll('-', '') });
      if (rows.some((r) => drawIdentity(r).drawDate !== day)) return fail();
      return rows;
    },
    async draw(identity) {
      let rows = await get('sorteov3', { target: 'igual', idsorteo: identity.drawId });
      if (!rows.length)
        rows = await get('fechav3', { fecha_sorteo: identity.drawDate.replaceAll('-', '') });
      const matches = rows.filter((r) => String(r.id_sorteo) === identity.drawId);
      if (matches.length !== 1) return fail();
      let result = normalizeDetail(matches[0], identity);
      // Result-only responses omit already played kickoffs. The SELAE calendar
      // supplies them after checking the same ID, date and every ordered pairing.
      if (result.partidos.some((p) => !p.fecha_completa)) {
        const day = identity.drawDate.replaceAll('-', '');
        const calendars = await get('buscadorSorteos', {
          celebrados: 'false',
          fechaInicioInclusiva: day,
          fechaFinInclusiva: day,
        });
        const candidates = calendars.filter((r) => String(r.id_sorteo) === identity.drawId);
        if (candidates.length > 1) return fail();
        if (candidates.length === 1) result = enrichSchedule(result, candidates[0], identity);
      }
      return result;
    },
  };
}
