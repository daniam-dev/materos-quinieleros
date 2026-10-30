export interface CouponDraftRow {
  home: string;
  away: string;
  category: '' | 'men' | 'women';
}

/** Recognition never creates a saved coupon; missing rows remain visibly empty for review. */
export function parseCouponText(text: string): { rows: CouponDraftRow[]; recognized: number } {
  const rows = Array.from(
    { length: 15 },
    () => ({ home: '', away: '', category: '' }) as CouponDraftRow,
  );
  const seen = new Set<number>();
  let recognized = 0;
  for (const match of text
    .replaceAll('\r', '')
    .matchAll(/(?:^|\n)\s*(\d{1,2})\s*[.)]?\s*([^\n]+)/g)) {
    const number = Number(match[1]);
    if (number < 1 || number > 15) continue;
    if (seen.has(number))
      throw new Error(`El encuentro ${number} aparece dos veces. Revisa el texto.`);
    seen.add(number);
    const pair = /^(.+?)\s*\(([MF])\)\s*[-–—]\s*(.+?)\s*\(([MF])\)\s*$/i.exec(match[2].trim());
    if (!pair || pair[2].toUpperCase() !== pair[4].toUpperCase()) continue;
    rows[number - 1] = {
      home: pair[1].trim(),
      away: pair[3].trim(),
      category: pair[2].toUpperCase() === 'M' ? 'men' : 'women',
    };
    recognized++;
  }
  if (!recognized)
    throw new Error(
      'No se han reconocido encuentros. Usa texto con números del 1 al 15 y equipos con (M) o (F), o completa el boleto manualmente.',
    );
  return { rows, recognized };
}

export function madridInputToIso(input: string): string {
  if (!/^20\d\d-\d\d-\d\dT\d\d:\d\d$/.test(input))
    throw new Error('Introduce el cierre en fecha y hora de Madrid.');
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const matches = [1, 2]
    .map((hours) => Date.parse(input + ':00Z') - hours * 3600000)
    .filter((time) => Number.isFinite(time) && formatter.format(time) === input.replace('T', ' '));
  if (matches.length !== 1)
    throw new Error('La hora indicada no existe o es ambigua por el cambio de horario de Madrid.');
  return new Date(matches[0]).toISOString();
}
