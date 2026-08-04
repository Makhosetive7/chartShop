import styled from 'styled-components';

const Wrap = styled.div`
  width: 100%;
  min-height: 220px;
`;

const Empty = styled.div`
  display: grid;
  place-items: center;
  min-height: 220px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.9rem;
`;

type BarPoint = { label: string; value: number; secondary?: number };

type BarChartProps = {
  data: BarPoint[];
  color?: string;
  secondaryColor?: string;
  height?: number;
  formatValue?: (n: number) => string;
};

export function SimpleBarChart({
  data,
  color = '#E31258',
  secondaryColor = '#FFB3C7',
  height = 220,
  formatValue = (n) => String(n),
}: BarChartProps) {
  const max = Math.max(...data.map((d) => Math.max(d.value, d.secondary || 0)), 1);
  const pad = { top: 16, right: 12, bottom: 36, left: 12 };
  const width = Math.max(data.length * 42, 320);
  const innerH = height - pad.top - pad.bottom;
  const barW = Math.min(28, (width - pad.left - pad.right) / data.length - 8);

  if (!data.length) return <Empty>No data for this period</Empty>;

  return (
    <Wrap>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img">
        {data.map((d, i) => {
          const x =
            pad.left +
            (i + 0.5) * ((width - pad.left - pad.right) / data.length) -
            barW / 2;
          const h = (d.value / max) * innerH;
          const y = pad.top + innerH - h;
          const tip = formatValue(d.value);
          return (
            <g key={`${d.label}-${i}`}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, 1)}
                rx={6}
                fill={color}
                opacity={0.92}
              >
                <title>
                  {d.label}: {tip}
                </title>
              </rect>
              {d.secondary != null ? (
                <rect
                  x={x + barW * 0.15}
                  y={pad.top + innerH - (d.secondary / max) * innerH}
                  width={barW * 0.7}
                  height={Math.max((d.secondary / max) * innerH, 1)}
                  rx={4}
                  fill={secondaryColor}
                  opacity={0.85}
                />
              ) : null}
              <text
                x={x + barW / 2}
                y={height - 12}
                textAnchor="middle"
                fontSize="11"
                fill="#6B7280"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </Wrap>
  );
}

type HorzBarProps = {
  data: { label: string; value: number }[];
  color?: string;
  formatValue?: (n: number) => string;
};

export function HorizontalBars({
  data,
  color = '#E31258',
  formatValue = (n) => String(n),
}: HorzBarProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  if (!data.length) return <Empty>No data for this period</Empty>;

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {data.map((d) => (
        <div key={d.label}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 4,
              fontSize: '0.82rem',
            }}
          >
            <span style={{ color: '#111827', fontWeight: 500 }}>{d.label}</span>
            <span style={{ color: '#6B7280' }}>{formatValue(d.value)}</span>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 999,
              background: '#FFE4EC',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.max((d.value / max) * 100, 2)}%`,
                height: '100%',
                borderRadius: 999,
                background: color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

type DonutProps = {
  data: { label: string; value: number; color: string }[];
  centerLabel?: string;
  centerValue?: string;
};

export function DonutChart({ data, centerLabel, centerValue }: DonutProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <Empty>No sales mix yet</Empty>;

  const size = 180;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {data.map((d) => {
            const len = (d.value / total) * c;
            const el = (
              <circle
                key={d.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={stroke}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              >
                <title>
                  {d.label}: {d.value}
                </title>
              </circle>
            );
            offset += len;
            return el;
          })}
        </g>
        {(centerLabel || centerValue) && (
          <g>
            {centerValue ? (
              <text
                x="50%"
                y="48%"
                textAnchor="middle"
                fontSize="18"
                fontWeight="700"
                fill="#111827"
              >
                {centerValue}
              </text>
            ) : null}
            {centerLabel ? (
              <text
                x="50%"
                y="62%"
                textAnchor="middle"
                fontSize="11"
                fill="#6B7280"
              >
                {centerLabel}
              </text>
            ) : null}
          </g>
        )}
      </svg>
      <div style={{ display: 'grid', gap: 8, minWidth: 140 }}>
        {data.map((d) => (
          <div
            key={d.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.85rem',
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: d.color,
                flexShrink: 0,
              }}
            />
            <span style={{ color: '#111827', flex: 1 }}>{d.label}</span>
            <span style={{ color: '#6B7280' }}>
              {Math.round((d.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
