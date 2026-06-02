import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { useChartColors } from '../../hooks/useChartColors'

export interface ChartSeries {
  key: string
  color: string
  label: string
}

interface TimeChartProps {
  data: Record<string, number | null | undefined>[]
  series: ChartSeries[]
  height?: number
  yMax?: number | 'auto'
  yUnit?: string
  /** 값 포맷터 (툴팁/축) */
  format?: (v: number) => string
  stacked?: boolean
}

export function TimeChart({
  data,
  series,
  height = 150,
  yMax = 100,
  yUnit = '%',
  format,
  stacked = false
}: TimeChartProps): JSX.Element {
  const c = useChartColors()
  const fmt = format ?? ((v: number) => `${Math.round(v)}${yUnit}`)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="t" hide />
        <YAxis
          domain={[0, yMax]}
          tick={{ fontSize: 10, fill: c.textMuted }}
          tickFormatter={(v) => fmt(v)}
          width={42}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          isAnimationActive={false}
          contentStyle={{
            background: c.surface,
            border: `1px solid ${c.grid}`,
            borderRadius: 10,
            fontSize: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
          }}
          labelFormatter={() => ''}
          formatter={(value: number, _name, item) => {
            const s = series.find((x) => x.key === item.dataKey)
            return [fmt(value), s?.label ?? '']
          }}
        />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            fill={`url(#grad-${s.key})`}
            stackId={stacked ? 'stack' : undefined}
            isAnimationActive={false}
            dot={false}
            connectNulls
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
