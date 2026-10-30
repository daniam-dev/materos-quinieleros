import { describe, expect, it } from 'vitest';
import { madridInputToIso, parseCouponText } from './coupon-import';

const text = Array.from(
  { length: 15 },
  (_, i) =>
    `${i + 1}. Local ${i + 1} (${i > 9 && i < 14 ? 'F' : 'M'}) - Visitante ${i + 1} (${i > 9 && i < 14 ? 'F' : 'M'})`,
).join('\n');

describe('borrador desde foto o texto', () => {
  it('conserva las 15 posiciones y distingue mujeres y hombres, incluido el Pleno', () => {
    const draft = parseCouponText(text);
    expect(draft.recognized).toBe(15);
    expect(draft.rows[10]).toEqual({ home: 'Local 11', away: 'Visitante 11', category: 'women' });
    expect(draft.rows[14].category).toBe('men');
  });
  it('no rellena un cruce ausente con otro ni cambia el orden', () => {
    const draft = parseCouponText(
      text
        .split('\n')
        .filter((_, i) => i !== 4)
        .join('\n'),
    );
    expect(draft.recognized).toBe(14);
    expect(draft.rows[4]).toEqual({ home: '', away: '', category: '' });
    expect(draft.rows[5].home).toBe('Local 6');
  });
  it('usa el numero impreso aunque las lineas lleguen desordenadas del OCR', () => {
    const lines = text.split('\n');
    const draft = parseCouponText([lines[14], ...lines.slice(0, 14).reverse()].join('\n'));
    expect(draft.recognized).toBe(15);
    for (const [index, row] of draft.rows.entries()) {
      expect(row.home).toBe(`Local ${index + 1}`);
      expect(row.away).toBe(`Visitante ${index + 1}`);
    }
  });
  it('no desplaza las posiciones si faltan el 1 y el 9, como en la captura coloreada', () => {
    const draft = parseCouponText(
      text
        .split('\n')
        .filter((_, index) => index !== 0 && index !== 8)
        .join('\n'),
    );
    expect(draft.recognized).toBe(13);
    for (const [index, row] of draft.rows.entries()) {
      if (index === 0 || index === 8) {
        expect(row).toEqual({ home: '', away: '', category: '' });
      } else {
        expect(row.home).toBe(`Local ${index + 1}`);
        expect(row.away).toBe(`Visitante ${index + 1}`);
      }
    }
    expect(draft.rows[14]).toEqual({ home: 'Local 15', away: 'Visitante 15', category: 'men' });
  });
  it('deja para revisión una categoría ambigua y rechaza números repetidos', () => {
    expect(parseCouponText(text.replace('Local 1 (M)', 'Local 1 (F)')).recognized).toBe(14);
    expect(() => parseCouponText(text + '\n1. Otro (M) - Equipo (M)')).toThrow(/dos veces/);
  });
  it('no interpreta texto no deportivo como un boleto', () => {
    expect(() => parseCouponText('Sin datos suficientes')).toThrow(/No se han reconocido/);
  });
});

describe('cierre explícito en Madrid, independiente de la zona del dispositivo', () => {
  it('convierte invierno y verano sin adivinar el cierre del boleto', () => {
    expect(madridInputToIso('2026-10-31T14:00')).toBe('2026-10-31T13:00:00.000Z');
    expect(madridInputToIso('2026-07-12T14:00')).toBe('2026-07-12T12:00:00.000Z');
  });
  it('rechaza fechas inválidas y horas ambiguas o inexistentes por cambio horario', () => {
    for (const value of ['', '2026-02-31T14:00', '2026-03-29T02:30', '2026-10-25T02:30'])
      expect(() => madridInputToIso(value)).toThrow();
  });
});
