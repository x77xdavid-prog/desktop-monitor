import { Thermometer, Cpu, Microchip, HardDrive, ShieldAlert } from 'lucide-react'
import { useStore } from '../store'
import { Card } from './ui/Card'
import { useChartColors } from '../hooks/useChartColors'

interface Row {
  key: string
  icon: React.ReactNode
  label: string
  sublabel?: string
  temp: number | null
  warn: number
  danger: number
  max: number
}

export function TemperaturePanel(): JSX.Element {
  const current = useStore((s) => s.current)
  const thresholds = useStore((s) => s.thresholds)
  const c = useChartColors()

  const rows: Row[] = []

  // CPU (센서 또는 시스템 열 존)
  const cpuSource = current?.thermal.cpuSource ?? 'none'
  rows.push({
    key: 'cpu',
    icon: <Cpu size={15} />,
    label: 'CPU',
    sublabel: cpuSource === 'zone' ? '시스템 센서' : undefined,
    temp: current?.cpu.temperature ?? null,
    warn: thresholds.cpuTemp.warn,
    danger: thresholds.cpuTemp.danger,
    max: 100
  })

  // GPU(s)
  for (const g of current?.gpus ?? []) {
    if (g.temperature === null) continue
    rows.push({
      key: `gpu-${g.model}`,
      icon: <Microchip size={15} />,
      label: 'GPU',
      sublabel: shortGpu(g.model),
      temp: g.temperature,
      warn: thresholds.gpuTemp.warn,
      danger: thresholds.gpuTemp.danger,
      max: 100
    })
  }

  // 디스크 (SMART, 관리자 권한 시)
  for (const d of current?.thermal.disks ?? []) {
    rows.push({
      key: `disk-${d.name}`,
      icon: <HardDrive size={15} />,
      label: '디스크',
      sublabel: d.name,
      temp: d.temp,
      warn: 55,
      danger: 65,
      max: 90
    })
  }

  const noCpuTemp = cpuSource === 'none'
  const noDiskTemp = (current?.thermal.disks.length ?? 0) === 0

  return (
    <Card
      title="온도"
      icon={<Thermometer size={16} />}
      accent="var(--color-danger)"
      className="col-span-12 lg:col-span-6"
    >
      <div className="flex flex-col h-full gap-1.5">
        {rows.map((r) => (
          <TempRow key={r.key} row={r} colors={c} />
        ))}

        {/* 안내: CPU 온도 미지원 시 */}
        {noCpuTemp && (
          <div className="mt-1 flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2">
            <ShieldAlert size={14} className="text-warn mt-0.5 shrink-0" />
            <div className="text-[11px] text-text-muted leading-relaxed">
              CPU 온도 센서를 찾지 못했습니다.{' '}
              <button
                onClick={() => window.api.relaunchElevated()}
                className="text-cpu hover:underline font-medium"
              >
                관리자로 실행
              </button>
              하거나 LibreHardwareMonitor 실행 시 표시됩니다.
            </div>
          </div>
        )}

        {/* 디스크 온도 힌트 */}
        {!noCpuTemp && noDiskTemp && (
          <p className="mt-auto text-[10.5px] text-text-muted pt-1">
            💡 디스크 온도는 관리자 권한으로 실행하면 표시됩니다.
          </p>
        )}
      </div>
    </Card>
  )
}

function TempRow({ row, colors }: { row: Row; colors: ReturnType<typeof useChartColors> }): JSX.Element {
  const t = row.temp
  const color =
    t === null ? colors.textMuted : t >= row.danger ? colors.danger : t >= row.warn ? colors.warn : colors.ok
  const pct = t === null ? 0 : Math.max(2, Math.min(100, (t / row.max) * 100))

  return (
    <div className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-surface-2 transition-colors">
      <span className="grid place-items-center w-7 h-7 rounded-lg shrink-0" style={{ color, backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}>
        {row.icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-medium">{row.label}</span>
          {row.sublabel && (
            <span className="text-[10.5px] text-text-muted truncate">{row.sublabel}</span>
          )}
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, backgroundColor: color, transition: 'width 0.5s ease, background-color 0.4s ease' }}
          />
        </div>
      </div>
      <span className="tnum text-[17px] font-bold shrink-0 w-14 text-right" style={{ color }}>
        {t === null ? '—' : `${Math.round(t)}°`}
      </span>
    </div>
  )
}

function shortGpu(model: string): string {
  return model
    .replace(/NVIDIA\s+GeForce\s+/i, '')
    .replace(/Intel\(R\)\s+/i, '')
    .replace(/AMD\s+/i, '')
    .trim()
}
