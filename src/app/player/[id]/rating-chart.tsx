/** Server-rendered SVG line chart of a player's rating over the season. */
export function RatingChart({ ratings }: { ratings: number[] }) {
  if (ratings.length < 2) return null;

  const W = 600;
  const H = 180;
  const PAD_X = 44;
  const PAD_Y = 20;

  const min = Math.min(...ratings);
  const max = Math.max(...ratings);
  const span = Math.max(max - min, 20); // avoid a flat line filling the chart
  const lo = min - span * 0.15;
  const hi = max + span * 0.15;

  const x = (i: number) => PAD_X + (i / (ratings.length - 1)) * (W - PAD_X * 2);
  const y = (r: number) => H - PAD_Y - ((r - lo) / (hi - lo)) * (H - PAD_Y * 2);

  const points = ratings.map((r, i) => `${x(i).toFixed(1)},${y(r).toFixed(1)}`).join(" ");
  const gridLines = [min, (min + max) / 2, max];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Rating history chart">
      {gridLines.map((r) => (
        <g key={r}>
          <line
            x1={PAD_X}
            x2={W - PAD_X}
            y1={y(r)}
            y2={y(r)}
            stroke="var(--color-edge)"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <text
            x={PAD_X - 8}
            y={y(r) + 4}
            textAnchor="end"
            fontSize="11"
            fill="var(--color-muted)"
            className="tabular-nums"
          >
            {Math.round(r)}
          </text>
        </g>
      ))}
      <polyline points={points} fill="none" stroke="var(--color-gold)" strokeWidth="2.5" strokeLinejoin="round" />
      {ratings.map((r, i) => (
        <circle key={i} cx={x(i)} cy={y(r)} r="3.5" fill="var(--color-gold-bright)" stroke="var(--color-bg)" strokeWidth="1.5" />
      ))}
    </svg>
  );
}
