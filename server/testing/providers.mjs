// Explicit simulated providers used only by automated tests and the isolated E2E process.
export function draw({
  id = '10001',
  number = 1,
  date = '2026-10-27',
  time = '18:00:00',
  sign = null,
} = {}) {
  return {
    game_id: 'LAQU',
    id_sorteo: id,
    jornada: String(number),
    temporada: '2026-2027',
    fecha_sorteo: `${date} 00:00:00`,
    partidos: Array.from({ length: 15 }, (_, i) => ({
      posicion: i + 1,
      idLocal: i * 2 + 1,
      idVisitante: i * 2 + 2,
      local: `Local ${i + 1} (m)`,
      visitante: `Visitante ${i + 1} (m)`,
      fecha_completa: `${date} ${time}`,
      signo: i < 14 ? sign : null,
      marcador: null,
    })),
  };
}
export function memoryStore(initial = null) {
  let entry = initial ? { data: structuredClone(initial), etag: '1' } : null;
  let revision = 1;
  return {
    async read() {
      return structuredClone(entry);
    },
    async write(data, etag) {
      if ((entry?.etag ?? null) !== etag) return false;
      entry = { data: structuredClone(data), etag: String(++revision) };
      return true;
    },
  };
}
export function account(used = 0, limit = 250, validFrom = '2026-10-01T00:00:00Z') {
  return {
    api_key: 'must-never-persist',
    current_subscription_id: 'materos',
    subscriptions: [
      {
        subscription_id: 'materos',
        is_active: true,
        sport_ids: [10],
        request_count: used,
        request_limit: limit,
        valid_from: validFrom,
        valid_until: '2026-11-01T00:00:00Z',
      },
    ],
  };
}
export function fixtures(coupon) {
  return coupon.partidos.map((p) => ({
    fixtureId: `odds-${p.posicion}`,
    sportId: 10,
    participant1Name: p.local,
    participant2Name: p.visitante,
    tournamentName: 'LaLiga',
    categorySlug: 'spain',
    startTime: `${p.fecha_completa.replace(' ', 'T')}+01:00`,
    statusId: 0,
  }));
}
export function e2eSelae() {
  const coupons = [
    draw({ date: '2099-10-27' }),
    draw({ id: '10002', number: 2, date: '2026-01-03' }),
  ];
  coupons[1].partidos[0].signo = '1';
  coupons[1].partidos[1].marcador = '1 - 1';
  return {
    discover: async () => coupons,
    draw: async (id) => coupons.find((d) => d.id_sorteo === id.drawId),
  };
}
