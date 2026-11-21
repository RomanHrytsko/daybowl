import { useId, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { DayStats } from '../../domain/stats';
import { formatHours } from '../../domain/format';
import { uk } from '../../i18n/uk';
import {
  BOT, CX, H, R_TOP, RIM, W, bowlOutline, bowlPath, overflowStreamPath, wavePath, yForFraction,
} from './geometry';

export interface BowlLayer {
  id: string;
  title: string;
  minutes: number;
  color: string;
}

interface Props {
  stats: DayStats;
  /** знизу вгору */
  layers: BowlLayer[];
  showFreeLabel?: boolean;
  className?: string;
  label?: string;
}

const PERIOD = 40;
const OUTLINE = bowlOutline();
const CLIP = bowlPath();
const STREAM = overflowStreamPath();

/**
 * Чаша з шарами рідини. Знає лише DayStats і список шарів —
 * нічого про сховище, тож її можна замінити на Canvas чи 3D.
 */
export function BowlSvg({ stats, layers, showFreeLabel, className, label }: Props) {
  const clipId = useId();
  const reduce = useReducedMotion();
  const { capacity, overflowMinutes, freeMinutes } = stats;

  const placed = useMemo(() => {
    let acc = 0;
    return layers
      .filter((l) => l.minutes > 0)
      .map((l, i) => {
        const bottomF = capacity > 0 ? acc / capacity : 1;
        acc += l.minutes;
        const topF = capacity > 0 ? acc / capacity : 1;
        // повна чаша: хвиля трохи над краєм, щоб западини не лишали порожнечі
        return { ...l, i, topF, bottomF, y: topF >= 1 ? RIM - 3 : yForFraction(topF) };
      })
      // шар, що повністю над краєм, у чаші не видно — він у потоці
      .filter((l) => l.bottomF < 1 || l.i === 0);
  }, [layers, capacity]);

  const topY = placed.length ? placed[placed.length - 1].y : BOT;
  const spillColor = overflowMinutes > 0 ? spillingColor(layers, capacity) : undefined;
  const streamWidth = Math.min(7, 1.6 + overflowMinutes / 40);
  const drops = overflowMinutes > 0 ? Math.min(4, Math.ceil(overflowMinutes / 60)) : 0;
  const transition = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 120, damping: 18 };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      role="img"
      aria-label={label}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={CLIP} />
        </clipPath>
      </defs>

      <path d={CLIP} className="fill-bowl" />

      <g clipPath={`url(#${clipId})`}>
        {[...placed].reverse().map((l) => (
          <motion.g
            key={l.id}
            initial={{ y: BOT + 6 }}
            animate={{ y: l.y }}
            transition={transition}
          >
            <g
              className="bowl-wave"
              style={{ animationDuration: `${3 + (l.i % 3) * 0.9}s`, animationDelay: `${-l.i * 0.7}s` }}
            >
              <path d={wavePath(PERIOD, 1.6)} fill={l.color} transform={`translate(${-PERIOD} 0)`}>
                <title>{`${l.title} · ${formatHours(l.minutes)}`}</title>
              </path>
            </g>
          </motion.g>
        ))}
      </g>

      {spillColor && (
        <g aria-hidden>
          <path
            d={STREAM}
            fill="none"
            stroke={spillColor}
            strokeWidth={streamWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="bowl-stream"
          />
          {Array.from({ length: drops }, (_, k) => (
            <circle
              key={k}
              cx={CX + R_TOP + 12 + k * 4}
              cy={BOT + 14}
              r={1.2 + streamWidth / 4}
              fill={spillColor}
              className="bowl-drop"
              style={{ animationDelay: `${k * 0.45}s` }}
            />
          ))}
          <ellipse
            cx={CX + R_TOP - 2}
            cy={BOT + 16}
            rx={Math.min(26, 8 + overflowMinutes / 12)}
            ry={2.4}
            fill={spillColor}
            opacity={0.55}
          />
        </g>
      )}

      <path d={OUTLINE} className="stroke-bowl" fill="none" strokeWidth={2.2} strokeLinejoin="round" />
      <line x1={CX - R_TOP - 4} x2={CX - R_TOP + 1} y1={RIM} y2={RIM} className="stroke-bowl" strokeWidth={2.2} strokeLinecap="round" />
      <line x1={CX + R_TOP - 1} x2={CX + R_TOP + 4} y1={RIM} y2={RIM} className="stroke-bowl" strokeWidth={2.2} strokeLinecap="round" />

      {showFreeLabel && freeMinutes > 0 && topY - RIM > 14 && (
        <text
          x={CX}
          y={(RIM + topY) / 2 + 3}
          textAnchor="middle"
          className="fill-ink-soft"
          fontSize={8}
        >
          {uk.bowl.free(formatHours(freeMinutes))}
        </text>
      )}
    </svg>
  );
}

/** Колір шару, на якому сума перевищила об'єм — він і виливається. */
function spillingColor(layers: BowlLayer[], capacity: number): string | undefined {
  let acc = 0;
  for (const l of layers) {
    acc += l.minutes;
    if (acc > capacity) return l.color;
  }
  return layers[layers.length - 1]?.color;
}
