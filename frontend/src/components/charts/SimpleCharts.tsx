import styled from 'styled-components';

const Wrap = styled.div`
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 180px;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  scrollbar-width: thin;
`;

const ChartSvg = styled.svg`
  display: block;
  max-width: none;
`;

const Empty = styled.div`
  display: grid;
  place-items: center;
  min-height: 180px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.9rem;
`;

const HorzList = styled.div`
  display: grid;
  gap: 10px;
  min-width: 0;
`;

const HorzRow = styled.div`
  min-width: 0;
`;

const HorzMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 4px;
  font-size: 0.82rem;
  min-width: 0;
`;

const HorzLabel = styled.span`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const HorzValue = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
`;

const Track = styled.div`
  height: 8px;
  background: ${({ theme }) => theme.colors.primaryTint};
  overflow: hidden;
`;

const Fill = styled.div<{ $pct: number; $color: string }>`
  width: ${({ $pct }) => `${$pct}%`};
  height: 100%;
  background: ${({ $color }) => $color};
`;

const DonutWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
  min-width: 0;
  width: 100%;
`;

const Legend = styled.div`
  display: grid;
  gap: 8px;
  min-width: 0;
  flex: 1 1 140px;
  max-width: 100%;
`;

const LegendRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  min-width: 0;
`;

const Swatch = styled.span<{ $color: string }>`
  width: 10px;
  height: 10px;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`;

const LegendLabel = styled.span`
  color: ${({ theme }) => theme.colors.textPrimary};
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const LegendPct = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  flex-shrink: 0;
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
  color = '#8B1E3A',
  secondaryColor = '#F5A07A',
  height = 220,
  formatValue = (n) => String(n),
}: BarChartProps) {
  const max = Math.max(...data.map((d) => Math.max(d.value, d.secondary || 0)), 1);
  const pad = { top: 16, right: 12, bottom: 36, left: 12 };
  const slot = data.length > 10 ? 36 : 42;
  const width = Math.max(data.length * slot, 240);
  const innerH = height - pad.top - pad.bottom;
  const barW = Math.min(28, (width - pad.left - pad.right) / Math.max(data.length, 1) - 8);

  if (!data.length) return <Empty>No data for this period</Empty>;

  return (
    <Wrap>
      <ChartSvg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        preserveAspectRatio="xMinYMid meet"
      >
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
                rx={0}
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
                  rx={0}
                  fill={secondaryColor}
                  opacity={0.85}
                />
              ) : null}
              <text
                x={x + barW / 2}
                y={height - 12}
                textAnchor="middle"
                fontSize="11"
                fill="#6B5B5B"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </ChartSvg>
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
  color = '#8B1E3A',
  formatValue = (n) => String(n),
}: HorzBarProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  if (!data.length) return <Empty>No data for this period</Empty>;

  return (
    <HorzList>
      {data.map((d) => (
        <HorzRow key={d.label}>
          <HorzMeta>
            <HorzLabel title={d.label}>{d.label}</HorzLabel>
            <HorzValue>{formatValue(d.value)}</HorzValue>
          </HorzMeta>
          <Track>
            <Fill $pct={Math.max((d.value / max) * 100, 2)} $color={color} />
          </Track>
        </HorzRow>
      ))}
    </HorzList>
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

  const size = 160;
  const stroke = 20;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <DonutWrap>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ flexShrink: 0, maxWidth: '100%' }}
      >
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
                fontSize={centerValue.length > 8 ? 13 : 16}
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
                fill="#6B5B5B"
              >
                {centerLabel}
              </text>
            ) : null}
          </g>
        )}
      </svg>
      <Legend>
        {data.map((d) => (
          <LegendRow key={d.label}>
            <Swatch $color={d.color} />
            <LegendLabel title={d.label}>{d.label}</LegendLabel>
            <LegendPct>{Math.round((d.value / total) * 100)}%</LegendPct>
          </LegendRow>
        ))}
      </Legend>
    </DonutWrap>
  );
}
