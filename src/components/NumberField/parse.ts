/**
 * Розбирає число з клавіатури iOS: українська локаль дає кому («7,5»),
 * а `Number("7,5")` — це NaN. Повертає null для порожнього чи невалідного вводу.
 */
export function parseDecimal(raw: string): number | null {
  const s = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (!s || !/^\d*\.?\d*$/.test(s) || s === '.') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Години з поля вводу: «7,5» → 7.5. */
export const parseHours = parseDecimal;

/** Число для показу в полі: 7.5 → «7,5». */
export function formatDecimal(n: number): string {
  return String(Math.round(n * 100) / 100).replace('.', ',');
}
