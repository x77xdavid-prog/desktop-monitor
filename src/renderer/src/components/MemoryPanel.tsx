import { MemoryStick } from 'lucide-react'
import { useStore } from '../store'
import { Card } from './ui/Card'
import { RadialGauge } from './ui/RadialGauge'
import { TimeChart } from './ui/TimeChart'
import { useChartColors } from '../hooks/useChartColors'
import { formatBytes } from '../lib/format'

export function MemoryPanel(): JSX.Element {
  const current = useStore((s) => s.current)
  const history = useStore((s) => s.history)
  const c = useChartColors()

  const mem = current?.mem
  const chartData = history.map((h) => ({ t: h.t, mem: h.mem }))

  return (
    <Card
      title="메모리"
      icon={<MemoryStick size={16} />}
      accent="var(--color-mem)"
      className="col-span-12 lg:col-span-6"
      right={
        <span className="text-[11px] text-text-muted tnum">
          {mem ? `${formatBytes(mem.used)} / ${formatBytes(mem.total)}` : '—'}
        </span>
      }
    >
      <div className="flex gap-4 h-full">
        <div className="flex flex-col items-center justify-center shrink-0">
          <RadialGauge
            value={mem?.usedPercent ?? 0}
            color={c.mem}
            sublabel={mem ? formatBytes(mem.used, 1) : ''}
          />
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          <TimeChart data={chartData} series={[{ key: 'mem', color: c.mem, label: '메모리' }]} height={104} />
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
            <Stat label="사용 중" value={mem ? formatBytes(mem.used) : '—'} color={c.mem} />
            <Stat label="사용 가능" value={mem ? formatBytes(mem.available) : '—'} />
            <Stat label="스왑 사용" value={mem ? formatBytes(mem.swapUsed) : '—'} />
            <Stat label="스왑 전체" value={mem ? formatBytes(mem.swapTotal) : '—'} />
          </div>
        </div>
      </div>
    </Card>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }): JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-muted flex items-center gap-1.5">
        {color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />}
        {label}
      </span>
      <span className="tnum font-medium">{value}</span>
    </div>
  )
}
