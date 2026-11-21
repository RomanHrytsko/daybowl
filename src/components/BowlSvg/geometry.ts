/** Геометрія чаші у власних координатах viewBox (0..W × 0..H). */
export const W = 120;
export const H = 150;
export const CX = W / 2;
export const RIM = 22;
export const BOT = 122;
export const DEPTH = BOT - RIM;
export const R_TOP = 50;
export const R_BOT = 16;

/** Радіус чаші на відносній висоті t (0 = дно, 1 = край): еліптичний профіль з плоским дном. */
export function radiusAt(t: number): number {
  return R_BOT + (R_TOP - R_BOT) * Math.sqrt(1 - (1 - t) * (1 - t));
}

const N = 256;
/** Накопичений об'єм тіла обертання V(t) ∝ ∫ r² dt, нормований до 1. */
const cumVolume: number[] = (() => {
  const v = [0];
  for (let i = 1; i <= N; i++) {
    const r0 = radiusAt((i - 1) / N);
    const r1 = radiusAt(i / N);
    v.push(v[i - 1] + (r0 * r0 + r1 * r1) / 2 / N);
  }
  const total = v[N];
  return v.map((x) => x / total);
})();

/**
 * Відносна висота t, на якій рідина займає частку `f` об'єму чаші.
 * Чаша ширша вгорі, тож рівень рахуємо по об'єму, а не лінійно.
 */
export function heightForFraction(f: number): number {
  if (f <= 0) return 0;
  if (f >= 1) return 1;
  let lo = 0;
  let hi = N;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cumVolume[mid] < f) lo = mid;
    else hi = mid;
  }
  const span = cumVolume[hi] - cumVolume[lo];
  const k = span > 0 ? (f - cumVolume[lo]) / span : 0;
  return (lo + k) / N;
}

/** y у координатах SVG для частки об'єму. */
export function yForFraction(f: number): number {
  return BOT - heightForFraction(f) * DEPTH;
}

function wallPoints(side: -1 | 1, offset = 0): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 32; i++) {
    const t = i / 32;
    pts.push([CX + side * (radiusAt(t) + offset), BOT - t * DEPTH]);
  }
  return pts;
}

/** Замкнений контур внутрішньої частини чаші — для clipPath і фону. */
export function bowlPath(): string {
  const left = wallPoints(-1).reverse();
  const right = wallPoints(1);
  const pts = [...left, ...right];
  return `M ${pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(' L ')} Z`;
}

/** Відкритий зверху контур стінок для обведення. */
export function bowlOutline(): string {
  return bowlPath().replace(/ Z$/, '');
}

/** Шлях потоку, що стікає по правій зовнішній стінці до калюжі. */
export function overflowStreamPath(): string {
  const pts = wallPoints(1, 3).reverse();
  const [x0, y0] = pts[0];
  const body = pts.map(([x, y]) => `L ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
  const [xe] = pts[pts.length - 1];
  return `M ${x0 - 4} ${y0 - 1} Q ${x0 + 1} ${y0 - 3} ${x0} ${y0 + 2} ${body} Q ${xe + 2} ${BOT + 6} ${xe + 10} ${BOT + 12}`;
}

/** Хвиляста верхня межа шару; y=0 — рівень, тіло тягнеться донизу на `depth`. */
export function wavePath(period: number, amp: number, depth = H + 10): string {
  const width = W + period * 2;
  let d = `M 0 ${depth} L 0 0`;
  for (let x = 0; x <= width; x += 3) {
    d += ` L ${x} ${(amp * Math.sin((2 * Math.PI * x) / period)).toFixed(2)}`;
  }
  return `${d} L ${width} ${depth} Z`;
}
