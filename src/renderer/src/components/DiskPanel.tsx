import { HardDrive, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { useStore } from '../store'
import { Card } from './ui/Card'
import { Bar } from './ui/Bar'
import { Sparkline } from './ui/Sparkline'
import { useChartColors } from '../hooks/useChartColors'
import { formatBytes, formatSpeed } from '../lib/format'

export function DiskPanel(): JSX.Element {
  const current = useStore((s) => s.current)
  const history = useStore((s) => s.history)
  const c = useChartColors()
  const thresholds = useStore((s) => s.thresholds)

  const disk = current?.disk
  const readData = history.map((h) => ({ v: h.diskR }))
  const writeData = history.map((h) => ({ v: h.diskW }))

  return (
    <Card
      title="디스크"
      icon={<HardDrive size={16} />}
      accent="var(--color-disk)"
      className="col-span-12 lg:col-span-6"
    >
      <div className="flex flex-col h-full gap-3">
        {/* IO 속도 */}
        <div className="grid grid-cols-2 gap-3">
          <IoTile
            icon={<ArrowDownToLine size={14} />}
            label="읽기"
            speed={disk?.io.readSpeed ?? 0}
            data={readData}
            color={c.disk}
            gradientId="disk-read"
          />
          <IoTile
            icon={<ArrowUpFromLine size={14} />}
            label="쓰기"
            speed={disk?.io.writeSpeed ?? 0}
            data={writeData}
            color={c.gpu}
            gradientId="disk-write"
          />
        </div>

        {/* 파일시스템 */}
        <div className="flex-1 overflow-y-auto -mr-2 pr-2 space-y-2.5">
          {(disk?.filesystems ?? []).map((fs) => {
            const isDanger = fs.usedPercent >= thresholds.diskPercent.danger
            const isWarn = fs.usedPercent >= thresholds.diskPercent.warn
            const barColor = isDanger ? c.danger : isWarn ? c.warn : c.disk
            return (
              <div key={fs.mount}>
                <div className="flex items-center justify-between text-[12px] mb-1">
                  <span className="font-medium truncate">
                    {fs.mount}
                    <span className="text-text-muted font-normal ml-1.5 text-[11px]">{fs.type}</span>
                  </span>
                  <span className="tnum text-text-muted">
                    {formatBytes(fs.used)} / {formatBytes(fs.size)}
                    <span className="ml-1.5 font-semibold" style={{ color: barColor }}>
                      {fs.usedPercent.toFixed(0)}%
                    </span>
                  </span>
                </div>
                <Bar percent={fs.usedPercent} color={barColor} />
              </div>
            )
          })}
          {(!disk || disk.filesystems.length === 0) && (
            <div className="text-[12px] text-text-muted text-center py-4">
              디스크 정보 로딩 중…
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

interface IoTileProps {
  icon: React.ReactNode
  label: string
  speed: number
  data: { v: number }[]
  color: string
  gradientId: string
}

function IoTile({ icon, label, speed, data, color, gradientId }: IoTileProps): JSX.Element {
  return (
    <div className="rounded-xl bg-surface-2 p-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-1.5 text-[11px] text-text-muted">
          <span style={{ color }}>{icon}</span>
          {label}
        </span>
        <span className="tnum text-[12.5px] font-semibold" style={{ color }}>
          {formatSpeed(speed)}
        </span>
      </div>
      <Sparkline data={data} color={color} gradientId={gradientId} height={32} />
    </div>
  )
}
