import { Wifi, ArrowDown, ArrowUp } from 'lucide-react'
import { useStore } from '../store'
import { Card } from './ui/Card'
import { TimeChart } from './ui/TimeChart'
import { useChartColors } from '../hooks/useChartColors'
import { formatBytes, formatSpeed } from '../lib/format'

export function NetworkPanel(): JSX.Element {
  const current = useStore((s) => s.current)
  const history = useStore((s) => s.history)
  const c = useChartColors()

  const rx = current?.net.reduce((s, n) => s + n.rxSpeed, 0) ?? 0
  const tx = current?.net.reduce((s, n) => s + n.txSpeed, 0) ?? 0
  const rxTotal = current?.net.reduce((s, n) => s + n.rxTotal, 0) ?? 0
  const txTotal = current?.net.reduce((s, n) => s + n.txTotal, 0) ?? 0

  const chartData = history.map((h) => ({ t: h.t, rx: h.rx, tx: h.tx }))

  return (
    <Card
      title="네트워크"
      icon={<Wifi size={16} />}
      accent="var(--color-net)"
      className="col-span-12 lg:col-span-6"
    >
      <div className="flex flex-col h-full">
        <div className="grid grid-cols-2 gap-3 mb-2">
          <SpeedTile
            icon={<ArrowDown size={15} />}
            label="다운로드"
            speed={rx}
            total={rxTotal}
            color={c.net}
          />
          <SpeedTile
            icon={<ArrowUp size={15} />}
            label="업로드"
            speed={tx}
            total={txTotal}
            color={c.cpu}
          />
        </div>
        <div className="flex-1 min-h-0">
          <TimeChart
            data={chartData}
            series={[
              { key: 'rx', color: c.net, label: '다운로드' },
              { key: 'tx', color: c.cpu, label: '업로드' }
            ]}
            height={130}
            yMax="auto"
            format={(v) => formatSpeed(v)}
          />
        </div>
      </div>
    </Card>
  )
}

interface SpeedTileProps {
  icon: React.ReactNode
  label: string
  speed: number
  total: number
  color: string
}

function SpeedTile({ icon, label, speed, total, color }: SpeedTileProps): JSX.Element {
  return (
    <div className="rounded-xl bg-surface-2 p-2.5 flex items-center gap-3">
      <span
        className="grid place-items-center w-9 h-9 rounded-lg shrink-0"
        style={{ color, backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[11px] text-text-muted">{label}</div>
        <div className="tnum text-[15px] font-bold leading-tight" style={{ color }}>
          {formatSpeed(speed)}
        </div>
        <div className="tnum text-[10.5px] text-text-muted">누적 {formatBytes(total)}</div>
      </div>
    </div>
  )
}
