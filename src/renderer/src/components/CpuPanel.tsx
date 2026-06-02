import { Cpu, Thermometer, Gauge } from 'lucide-react'
import { useStore } from '../store'
import { Card } from './ui/Card'
import { RadialGauge } from './ui/RadialGauge'
import { TimeChart } from './ui/TimeChart'
import { useChartColors } from '../hooks/useChartColors'
import { formatTemp } from '../lib/format'

export function CpuPanel(): JSX.Element {
  const current = useStore((s) => s.current)
  const history = useStore((s) => s.history)
  const staticInfo = useStore((s) => s.staticInfo)
  const c = useChartColors()

  const cpu = current?.cpu
  const chartData = history.map((h) => ({ t: h.t, cpu: h.cpu }))

  return (
    <Card
      title="CPU"
      icon={<Cpu size={16} />}
      accent="var(--color-cpu)"
      className="col-span-12 lg:col-span-6"
      right={
        <span className="text-[11px] text-text-muted truncate max-w-[200px] text-right">
          {staticInfo?.cpu.brand}
        </span>
      }
    >
      <div className="flex gap-4 h-full">
        {/* 게이지 */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <RadialGauge value={cpu?.load ?? 0} color={c.cpu} />
          <div className="flex items-center gap-3 mt-2 text-[11px] text-text-muted">
            <span className="flex items-center gap-1 tnum">
              <Gauge size={12} /> {cpu?.speed ? `${cpu.speed.toFixed(1)}GHz` : '—'}
            </span>
            <span className="flex items-center gap-1 tnum">
              <Thermometer size={12} /> {formatTemp(cpu?.temperature ?? null)}
            </span>
          </div>
        </div>

        {/* 차트 + 코어 */}
        <div className="flex-1 min-w-0 flex flex-col">
          <TimeChart data={chartData} series={[{ key: 'cpu', color: c.cpu, label: 'CPU' }]} height={104} />
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-text-muted">
                코어 {cpu?.perCore.length ?? staticInfo?.cpu.cores ?? 0}개
              </span>
            </div>
            <div className="grid grid-cols-8 gap-1">
              {(cpu?.perCore ?? []).map((load, i) => (
                <CoreBar key={i} load={load} color={c.cpu} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

function CoreBar({ load, color }: { load: number; color: string }): JSX.Element {
  return (
    <div className="h-9 rounded-md bg-surface-2 relative overflow-hidden" title={`${load.toFixed(0)}%`}>
      <div
        className="absolute bottom-0 left-0 right-0 rounded-md"
        style={{
          height: `${Math.max(4, load)}%`,
          backgroundColor: color,
          opacity: 0.35 + (load / 100) * 0.65,
          transition: 'height 0.5s ease, opacity 0.4s ease'
        }}
      />
    </div>
  )
}
