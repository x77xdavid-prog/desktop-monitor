import { Microchip, Thermometer, Fan, Zap } from 'lucide-react'
import { useStore } from '../store'
import { Card } from './ui/Card'
import { Bar } from './ui/Bar'
import { useChartColors } from '../hooks/useChartColors'
import { formatMB, formatPercent, formatTemp } from '../lib/format'
import type { GpuStat } from '@shared/types'

export function GpuPanel(): JSX.Element {
  const current = useStore((s) => s.current)
  const c = useChartColors()
  const gpus = current?.gpus ?? []

  return (
    <Card
      title="GPU"
      icon={<Microchip size={16} />}
      accent="var(--color-gpu)"
      className="col-span-12 lg:col-span-6"
      right={<span className="text-[11px] text-text-muted">{gpus.length}개 감지</span>}
    >
      {gpus.length === 0 ? (
        <Empty />
      ) : (
        <div className="flex flex-col gap-3 h-full justify-center">
          {gpus.map((g, i) => (
            <GpuItem key={i} gpu={g} color={c.gpu} />
          ))}
        </div>
      )}
    </Card>
  )
}

function GpuItem({ gpu, color }: { gpu: GpuStat; color: string }): JSX.Element {
  const hasUtil = gpu.utilization !== null
  const hasVram = gpu.memUsed !== null && gpu.memTotal !== null
  const vramPercent = hasVram ? (gpu.memUsed! / gpu.memTotal!) * 100 : 0

  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12.5px] font-medium truncate max-w-[60%]" title={gpu.model}>
          {gpu.model}
        </span>
        <div className="flex items-center gap-2.5 text-[11px] text-text-muted">
          {gpu.temperature !== null && (
            <span className="flex items-center gap-1 tnum">
              <Thermometer size={12} /> {formatTemp(gpu.temperature)}
            </span>
          )}
          {gpu.fanSpeed !== null && (
            <span className="flex items-center gap-1 tnum">
              <Fan size={12} /> {formatPercent(gpu.fanSpeed)}
            </span>
          )}
          {gpu.powerDraw !== null && (
            <span className="flex items-center gap-1 tnum">
              <Zap size={12} /> {gpu.powerDraw.toFixed(0)}W
            </span>
          )}
        </div>
      </div>

      {hasUtil ? (
        <div className="mb-2">
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-text-muted">사용률</span>
            <span className="tnum font-semibold" style={{ color }}>
              {formatPercent(gpu.utilization)}
            </span>
          </div>
          <Bar percent={gpu.utilization ?? 0} color={color} />
        </div>
      ) : (
        <div className="text-[11px] text-text-muted mb-2">
          사용률 정보 미지원 (내장 그래픽이거나 드라이버 제한)
        </div>
      )}

      {hasVram && (
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-text-muted">VRAM</span>
            <span className="tnum">
              {formatMB(gpu.memUsed)} / {formatMB(gpu.memTotal)}
            </span>
          </div>
          <Bar percent={vramPercent} color={color} height={6} />
        </div>
      )}
    </div>
  )
}

function Empty(): JSX.Element {
  return (
    <div className="h-full grid place-items-center text-[12px] text-text-muted text-center">
      <div>
        <Microchip size={28} className="mx-auto mb-2 opacity-40" />
        GPU를 감지하지 못했습니다
      </div>
    </div>
  )
}
