import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts'

interface SparklineProps {
  data: { v: number }[]
  color: string
  max?: number
  height?: number
  gradientId: string
}

/** 작은 영역형 스파크라인 (축/그리드 없음) */
export function Sparkline({ data, color, max, height = 48, gradientId }: SparklineProps): JSX.Element {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <YAxis hide domain={max ? [0, max] : [0, 'auto']} />
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
